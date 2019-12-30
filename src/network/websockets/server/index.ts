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
  ): () => void {
    const cancel = events.on("change", eventKV => {
      if (stringy(key) === stringy(eventKV)) {
        onData(eventKV.value);
      }
    });
    if (listeningTo.includes(stringy(key))) {
      const last = latestCopies[stringy(key)];
      if (last) onData(last);
      return cancel;
    }
    listeningTo.push(stringy(key));
    onRequestData({
      ...key,
      close: close,
      send: value => events.emit("change", { ...key, value })
    });
    return cancel;
  }

  const server =
    params._ws ||
    new WebSocket.Server({
      port: params.port,
      server: params.server
    });

  function heartbeat(this: any) {
    this.lifeFlag = "good";
  }
  setInterval(function ping() {
    server.clients.forEach(
      (socket: WebSocket & { lifeFlag?: "good" | "sleepy" }) => {
        if (socket.lifeFlag === undefined) {
          socket.lifeFlag = "good";
          socket.on("pong", heartbeat);
          socket.on("message", heartbeat);
          return;
        }
        if (socket.lifeFlag === "good") {
          socket.lifeFlag = "sleepy";
          socket.ping();
          return;
        }
        if (socket.lifeFlag === "sleepy") {
          socket.terminate();
          return;
        }
      }
    );
  }, 60000);
  server.on("connection", function(socket: WebSocket & { isAlive?: boolean }) {
    const authQueue = makeAuthQueue<AuthDetails>({
      onTerminate: () => socket.terminate()
    });

    let latestToken: string | undefined;
    const evaluateToken = () => {
      if (!latestToken) return;
      if (!auth) {
        console.log("Ignoring auth message");
        return;
      }
      authQueue.newAuthIncoming(
        auth
          .parseToken(latestToken, { close: () => socket.terminate() })
          .catch(() => {
            socket.terminate();
            return undefined;
          })
      );
    };

    const reEvaluateToken = setInterval(evaluateToken, 5 * 60000);
    socket.on("close", () => clearInterval(reEvaluateToken));

    const send = (obj: {}) => {
      if (socket.readyState !== 1) return;
      socket.send(JSON.stringify(obj));
    };

    const handlers: { [action: string]: (msg: any) => void } = {
      ping: () => send({ action: "pong" }),
      auth: msg => {
        latestToken = msg.token;
        evaluateToken();
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
          value: serialization.decode(value, { kind, id }),
          close: () => socket.terminate()
        })
          .then(function(result) {
            if (result === "conflict")
              send({
                action: "pushResult",
                pushId: msg.pushId,
                result: result
              });
            else {
              send({
                action: "pushResult",
                id,
                kind,
                pushId: msg.pushId,
                result: "success",
                newRevision: result.newRevision,
                newValue: serialization.encode(result.newValue, { id, kind })
              });
              events.emit("change", {
                kind,
                id,
                value: { revision: result.newRevision, value: result.newValue }
              });
            }
          })
          .catch(function(err) {
            send({
              action: "pushResult",
              pushId: msg.pushId,
              result: "internalError"
            });
            throw err;
          });
      },
      subscribe: msg => {
        const { id, kind } = msg;
        const cancel = getAndObserve(
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
              value: serialization.encode(v.value, { id, kind })
            });
          }
        );
        socket.on("close", cancel);
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

  return server;
}
