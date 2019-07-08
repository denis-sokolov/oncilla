import NanoEvents from "nanoevents";
import WebSocket from "ws";
import { jsonSerialization } from "../serialization";
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

  const server =
    params._ws ||
    new WebSocket.Server({
      port: params.port,
      server: params.server
    });

  server.on("connection", function(socket) {
    let authDetails: Promise<AuthDetails | undefined> = Promise.resolve(
      undefined
    );

    const send = (obj: {}) => {
      if (socket.readyState !== 1) return;
      socket.send(JSON.stringify(obj));
    };

    const handlers: { [action: string]: (msg: any) => void } = {
      ping: () => send({ action: "pong" }),
      auth: msg => {
        const { token } = msg;
        if (!auth) throw new Error("Unexpected auth message");
        authDetails = auth
          .parseToken(token, {
            close: () => socket.terminate()
          })
          .catch(() => undefined);
      },
      push: async msg => {
        const { kind, id, lastSeenRevision, value } = msg;
        if (auth) {
          const details = await authDetails;
          if (!details) return;
          if (!auth.canWrite({ auth: details, kind, id })) return;
        }
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
          async v => {
            if (auth) {
              const details = await authDetails;
              if (!details) return;
              if (!auth.canRead({ auth: details, kind, id })) return;
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

    socket.on("message", function(incomingBytes) {
      function attempt<T>(f: () => T): T | undefined {
        try {
          return f();
        } catch (err) {
          return undefined;
        }
      }
      const msg = attempt(() => JSON.parse(incomingBytes.toString()));
      if (!msg) {
        console.warn("Received invalid message format");
        socket.terminate();
        return;
      }
      const action = msg.action;
      const handler = handlers[action];
      if (!handler) return console.warn("Unrecognized message", msg);
      handler(msg);
    });
  });
}
