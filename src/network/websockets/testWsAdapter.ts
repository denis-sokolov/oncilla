import { makeWsProtocolAdapter } from ".";
import ReconnectingWebSocket from "reconnecting-websocket";

export default function testWsAdapter() {
  const sentMessages: { action: string; [k: string]: any }[] = [];
  const partialSocket: Partial<ReconnectingWebSocket> = {
    send: data => {
      sentMessages.push(JSON.parse(String(data)));
    }
  };
  const socket = partialSocket as ReconnectingWebSocket;
  const sock = socket as any;
  const adapter = makeWsProtocolAdapter({
    url: "",
    _socket: socket
  }).adapter({
    onChange: () => {},
    onConnectivityChange: () => {},
    onError: () => {},
    onPushResult: () => {}
  });
  return {
    adapter,
    disconnect: () => {
      socket.onclose!({} as any);
      sock.readyState = 0;
    },
    connect: () => {
      socket.onopen!({} as any);
      sock.readyState = 1;
    },
    sentMessages
  };
}
