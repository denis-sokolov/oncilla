import { Server } from "ws";

type Message = { action: string; [k: string]: any };

export function makeWsMock() {
  let connectionListener: (socket: WebSocket) => void;
  const server: Server = ({
    on: function(event: string, cb: Function) {
      if (event === "connection") {
        if (connectionListener) throw new Error("Not implemented");
        connectionListener = cb as any;
        return server;
      }
      throw new Error(`Event ${event} not implemented`);
    }
  } as Partial<Server>) as Server;
  return {
    client: (onServerMessage: (msg: Message) => void) => {
      let onClientMessage: Function;
      const socket: WebSocket = ({
        on: function(event: string, cb: Function) {
          if (event === "message") {
            if (onClientMessage) throw new Error("Not implemented");
            onClientMessage = cb as any;
            return;
          }
          throw new Error(`event ${event} not implemented`);
        },
        readyState: 1,
        send: (data: string) => onServerMessage(JSON.parse(data))
      } as Partial<WebSocket>) as WebSocket;
      connectionListener(socket);
      return {
        send: (msg: Message) =>
          onClientMessage(Buffer.from(JSON.stringify(msg)))
      };
    },
    server
  };
}
