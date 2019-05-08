import NanoEvents from "nanoevents";
import WebSocket from "ws";
import { Data } from "../../core";

export function runMemoryServer(params: { data: Data<any>; port: number }) {
  const { data, port } = params;

  function getItem(kind: string, id: string) {
    const item = data[kind][id];
    if (!item) throw new Error(`Invalid item ${kind} ${id}`);
    return item;
  }

  const events = new NanoEvents<{ change: [string, string] }>();
  function changeItem(kind: string, id: string, value: any) {
    const curr = getItem(kind, id);
    curr.revision = String(Number(curr.revision) + 1);
    curr.value = value;
    events.emit("change", [kind, id]);
  }

  const server = new WebSocket.Server({ port });

  server.on("connection", function(socket) {
    const send = (obj: {}) => {
      if (socket.readyState !== 1) return;
      socket.send(JSON.stringify(obj));
    };

    const sendItem = (kind: string, id: string) => {
      const t = getItem(kind, id);
      send({
        action: "update",
        id,
        kind,
        revision: t.revision,
        value: t.value
      });
    };

    const handlers: { [action: string]: (msg: any) => void } = {
      ping: () => send({ action: "pong" }),
      push: msg => {
        changeItem(msg.kind, msg.id, msg.value);
        setTimeout(function() {
          send({
            action: "pushResult",
            pushId: msg.pushId,
            result: "success"
          });
        }, 500);
      },
      subscribe: msg => {
        sendItem(msg.kind, msg.id);
        events.on("change", ([kind, id]) => {
          if (msg.kind === kind && msg.id === id) sendItem(msg.kind, msg.id);
        });
      }
    };

    socket.on("message", function(incomingBytes) {
      const msg = JSON.parse(incomingBytes.toString());
      const action = msg.action;
      const handler = handlers[action];
      if (!handler) return console.warn("Unrecognized message", msg);
      handler(msg);
    });
  });
}
