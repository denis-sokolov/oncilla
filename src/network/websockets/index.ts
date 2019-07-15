import ReconnectingWebSocket from "reconnecting-websocket";
import { NetworkAdapter } from "../types";
import { Serialization, jsonSerialization } from "./serialization";

type Params = {
  serialization?: Serialization;
  url: string;
  _socket?: ReconnectingWebSocket;
};

export * from "./memoryServer";
export { runWebsocketServer } from "./server";

export function makeWsProtocolAdapter(
  params: Params
): { adapter: NetworkAdapter<any>; auth: (token: string) => void } {
  const { url, _socket } = params;
  const serialization = params.serialization || jsonSerialization;
  const socket = _socket || new ReconnectingWebSocket(url);

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

  const messagesOnEveryReconnect: { [k: string]: any }[] = [];

  return {
    adapter: function({
      onChange,
      onConnectivityChange,
      onError,
      onPushResult
    }) {
      socket.onopen = () => {
        onConnectivityChange("online");
        messagesOnEveryReconnect.forEach(send);
      };
      socket.onclose = () => onConnectivityChange("offline");
      socket.onerror = () =>
        onError(
          new Error(
            "WebSocket error. We can’t retrieve details about the error because the browser does not provide them for security reasons."
          )
        );

      const handlers: { [action: string]: (msg: any) => void } = {
        pong: () => {},
        pushResult: (msg: any) => onPushResult(msg.pushId, msg.result),
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
          const msg = { action: "subscribe", kind, id };
          if (socket.readyState === 1) send(msg);
          messagesOnEveryReconnect.push(msg);
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
    auth: token => {
      const msg = { action: "auth", token };
      const currentIndex = messagesOnEveryReconnect.findIndex(
        m => m.action === "auth"
      );
      if (currentIndex === -1) messagesOnEveryReconnect.push(msg);
      else messagesOnEveryReconnect[currentIndex] = msg;
      if (socket.readyState === 1) send(msg);
    }
  };
}
