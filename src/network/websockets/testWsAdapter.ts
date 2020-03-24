import { makeWsProtocolAdapter } from ".";
import ReconnectingWebSocket from "reconnecting-websocket";

export default function testWsAdapter() {
  const sentMessages: { action: string; [k: string]: any }[] = [];
  const partialSocket: Partial<ReconnectingWebSocket> = {
    send: (data) => {
      sentMessages.push(JSON.parse(String(data)));
    },
  };
  const socket = partialSocket as ReconnectingWebSocket;
  const sock = socket as any;
  const wsp = makeWsProtocolAdapter({
    url: "",
    _socket: socket,
  });
  const adapter = wsp.adapter({
    onChange: () => {},
    onConnectivityChange: () => {},
    onError: () => {},
    onPushResult: () => {},
  });
  return {
    adapter,
    auth: wsp.auth,
    disconnect: () => {
      if (socket.onclose) socket.onclose({} as any);
      sock.readyState = 0;
    },
    connect: () => {
      if (socket.onopen) socket.onopen({} as any);
      sock.readyState = 1;
    },
    sentMessages,
  };
}
