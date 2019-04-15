import ReconnectingWebSocket from "reconnecting-websocket";
import { NetworkAdapter } from "../types";

type Params = {
  url: string;
};

export * from "./memoryServer";

export function makeWsProtocolAdapter(params: Params): NetworkAdapter<any> {
  const { url } = params;
  return function({ onChange, onConnectivityChange, onError, onPushResult }) {
    const socket = new ReconnectingWebSocket(url);
    socket.onopen = () => onConnectivityChange("online");
    socket.onclose = () => onConnectivityChange("offline");
    socket.onerror = () =>
      onError(
        new Error(
          "WebSocket error. We can’t retrieve details about the error because the browser does not provide them for security reasons."
        )
      );

    const handlers: { [action: string]: (msg: any) => void } = {
      ping: () => {},
      pushResult: (msg: any) => onPushResult(msg.pushId, msg.result),
      update: (msg: any) =>
        onChange({
          kind: msg.kind,
          id: msg.id,
          revision: msg.revision,
          value: msg.value
        })
    };
    socket.onmessage = function(event) {
      const msg = JSON.parse(event.data);
      const action = msg.action;
      if (!action) return console.warn(`Unrecognized message`, msg);
      const handler = handlers[action];
      if (!handler) return console.warn(`Unrecognized message`, msg);
      handler(msg);
    };

    const send = (input: {}) => {
      socket.send(JSON.stringify(input));
    };
    return {
      getAndObserve: (kind, id) => {
        send({ action: "subscribe", kind, id });
        return () => {};
      },
      push: async ({ kind, id, pushId, lastSeenRevision, value }) => {
        send({
          action: "push",
          kind,
          id,
          pushId,
          lastSeenRevision,
          value
        });
      }
    };
  };
}
