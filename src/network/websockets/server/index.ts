import NanoEvents from "nanoevents";
import WebSocket from "ws";
import { jsonSerialization } from "../serialization";
import { stringy, K, KV, Params, ValueContainer } from "./types";

export function runWebsocketServer(params: Params) {
  const { onAuthenticate, onChangeData, onRequestData } = params;
  const serialization = params.serialization || jsonSerialization;

  const events = new NanoEvents<{ change: KV }>();

  const latestCopies: { [stringy: string]: undefined | ValueContainer } = {};
  events.on("change", kv => {
    latestCopies[stringy(kv)] = kv.value;
  });

  const listeningTo: string[] = [];
  function getAndObserve(
    key: K,
    close: () => void,
    onData: (value: ValueContainer) => void
  ) {
    events.on("change", eventKV => {
      if (stringy(key) === stringy(eventKV)) onData(eventKV.value);
    });
    if (listeningTo.includes(stringy(key))) {
      const last = latestCopies[stringy(key)];
      if (last) onData(last);
      return;
    }
    listeningTo.push(stringy(key));
    onRequestData({
      ...key,
      close: close,
      send: value => events.emit("change", { ...key, value })
    });
  }

  const server = new WebSocket.Server({
    port: params.port,
    server: params.server
  });

  server.on("connection", function(socket) {
    const send = (obj: {}) => {
      if (socket.readyState !== 1) return;
      socket.send(JSON.stringify(obj));
    };

    const handlers: { [action: string]: (msg: any) => void } = {
      ping: () => send({ action: "pong" }),
      auth: msg => {
        if (!onAuthenticate) throw new Error("Unexpected auth message");
        const { token } = msg;
        onAuthenticate({ token })
          .then(function(result) {
            send({
              action: "authResult",
              result: result
            });
          })
          .catch(function() {
            send({
              action: "authResult",
              result: "internalError"
            });
          });
      },
      push: msg => {
        const { kind, id, lastSeenRevision, value } = msg;
        onChangeData({
          kind,
          lastSeenRevision,
          id,
          value: serialization.decode(value),
          close: () => socket.terminate(),
          send: v => events.emit("change", { kind, id, value: v })
        })
          .then(function(result) {
            send({
              action: "pushResult",
              pushId: msg.pushId,
              result: result
            });
          })
          .catch(function() {
            send({
              action: "pushResult",
              pushId: msg.pushId,
              result: "internalError"
            });
          });
      },
      subscribe: msg => {
        const { id, kind } = msg;
        getAndObserve(
          { kind, id },
          () => socket.terminate(),
          v =>
            send({
              action: "update",
              id,
              kind,
              revision: v.revision,
              value: serialization.encode(v.value)
            })
        );
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
