import NanoEvents from "nanoevents";
import WebSocket from "ws";
import { jsonSerialization } from "../serialization";
import { makeAuthQueue } from "./authQueue";
import { stringy, K, KV, Params, ValueContainer } from "./types";

export function runWebsocketServer<AuthDetails>(params: Params<AuthDetails>) {
  const { auth, onChangeData, onRequestData } = params;
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
    if (listeningTo.includes(stringy(key))) {
      const last = latestCopies[stringy(key)];
      if (last) onData(last);
      return;
    }
    listeningTo.push(stringy(key));
    events.on("change", eventKV => {
      if (stringy(key) === stringy(eventKV)) onData(eventKV.value);
    });
    onRequestData({
      ...key,
      close: close,
      send: value => events.emit("change", { ...key, value })
    });
  }

  const server =
    params._ws ||
    new WebSocket.Server({
      port: params.port,
      server: params.server
    });

  server.on("connection", function(socket) {
    const authQueue = makeAuthQueue<AuthDetails>({
      onTerminate: () => socket.terminate()
    });

    const send = (obj: {}) => {
      if (socket.readyState !== 1) return;
      socket.send(JSON.stringify(obj));
    };

    const handlers: { [action: string]: (msg: any) => void } = {
      ping: () => send({ action: "pong" }),
      auth: msg => {
        const { token } = msg;
        if (!auth) throw new Error("Unexpected auth message");
        authQueue.newAuthIncoming(
          auth
            .parseToken(token, { close: () => socket.terminate() })
            .catch(() => {
              socket.terminate();
              return undefined;
            })
        );
      },
      push: async msg => {
        const { kind, id, lastSeenRevision, value } = msg;
        if (auth) {
          const details = await authQueue.details();
          if (!auth.canWrite({ auth: details, kind, id })) {
            send({
              action: "clientError",
              message: `Tried to write ${kind} ${id} without permission`
            });
            return;
          }
        }
        onChangeData({
          kind,
          lastSeenRevision,
          id,
          value: serialization.decode(value),
          close: () => socket.terminate()
        })
          .then(function(result) {
            if (result === "conflict")
              send({
                action: "pushResult",
                pushId: msg.pushId,
                result: result
              });
            else
              send({
                action: "pushResult",
                pushId: msg.pushId,
                result: "success",
                newRevision: result.newRevision,
                newValue: serialization.encode(result.newValue)
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
          async v => {
            if (auth) {
              const details = await authQueue.details();
              if (!auth.canRead({ auth: details, kind, id })) {
                send({
                  action: "clientError",
                  message: `Tried to read ${kind} ${id} without permission`
                });
                return;
              }
            }
            send({
              action: "update",
              id,
              kind,
              revision: v.revision,
              value: serialization.encode(v.value)
            });
          }
        );
      }
    };

    const handleMsg = (msg: any) => {
      const action = msg.action;
      const handler = handlers[action];
      if (!handler) return console.warn("Unrecognized message", msg);
      handler(msg);
    };

    socket.on("message", function incoming(data) {
      function attempt<T>(f: () => T): T | undefined {
        try {
          return f();
        } catch (err) {
          return undefined;
        }
      }
      const msg = attempt(() => JSON.parse(data.toString()));
      if (!msg) {
        console.warn("Received invalid message format");
        socket.terminate();
        return;
      }
      handleMsg(msg);
    });
  });
}
