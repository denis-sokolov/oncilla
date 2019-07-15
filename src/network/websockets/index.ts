import ReconnectingWebSocket from "reconnecting-websocket";
import { NetworkAdapter } from "../types";
import { Serialization, jsonSerialization } from "./serialization";

type Params = {
  serialization?: Serialization;
  url: string;
};

export * from "./memoryServer";
export { runWebsocketServer } from "./server";

export function makeWsProtocolAdapter(
  params: Params
): { adapter: NetworkAdapter<any>; auth: (token: string) => void } {
  const { url } = params;
  const serialization = params.serialization || jsonSerialization;
  const socket = new ReconnectingWebSocket(url);

  let pingTimer: NodeJS.Timer;
  let timeoutTimer: NodeJS.Timer;
  function restartPingMachine() {
    clearTimeout(pingTimer);
    clearTimeout(timeoutTimer);
    pingTimer = setTimeout(function() {
      send({ action: "ping" });
      timeoutTimer = setTimeout(() => socket.reconnect(), 15000);
    }, 15000);
  }
  restartPingMachine();

  const send = (input: {}) => {
    socket.send(JSON.stringify(input));
  };

  return {
    adapter: function({
      onChange,
      onConnectivityChange,
      onError,
      onPushResult
    }) {
      socket.onopen = () => onConnectivityChange("online");
      socket.onclose = () => onConnectivityChange("offline");
      socket.onerror = () =>
        onError(
          new Error(
            "WebSocket error. We can’t retrieve details about the error because the browser does not provide them for security reasons."
          )
        );

      const handlers: { [action: string]: (msg: any) => void } = {
        pong: () => {},
        pushResult: (msg: any) => {
          if (msg.result === "success")
            onPushResult(msg.pushId, {
              newRevision: msg.newRevision,
              newValue: serialization.decode(msg.newValue)
            });
          else onPushResult(msg.pushId, msg.result);
        },
        update: (msg: any) =>
          onChange({
            kind: msg.kind,
            id: msg.id,
            revision: msg.revision,
            value: serialization.decode(msg.value)
          })
      };
      socket.onmessage = function(event) {
        restartPingMachine();
        const msg = JSON.parse(event.data);
        const action = msg.action;
        if (!action) return console.warn(`Unrecognized message`, msg);
        const handler = handlers[action];
        if (!handler) return console.warn(`Unrecognized message`, msg);
        handler(msg);
      };

      return {
        getAndObserve: (kind, id) => {
          send({ action: "subscribe", kind, id });
          return () => {};
        },
        push: ({ kind, id, pushId, lastSeenRevision, value }) => {
          send({
            action: "push",
            kind,
            id,
            pushId,
            lastSeenRevision,
            value: serialization.encode(value)
          });
        }
      };
    },
    auth: token => send({ action: "auth", token })
  };
}
