import { runWebsocketServer } from "oncilla/dist/server";
import { Server as HttpServer } from "http";

export function attachWebSockets(server: HttpServer) {
  runWebsocketServer({
    onAuthenticate: async function({ token, secWSKey }) {
      console.log("token: " + JSON.stringify(token));
      console.log("secWSKey: " + secWSKey);
      return "success";
    },
    onChangeData: async function({ kind, id, secWSKey }) {
      console.log("kind: " + kind);
      console.log("id: " + id);
      console.log("secWSKey: " + secWSKey);
      return "success";
    },
    onRequestData: function({ kind, id, secWSKey }) {
      console.log("kind: " + kind);
      console.log("id: " + id);
      console.log("secWSKey: " + secWSKey);
    },
    serialization: {
      encode: value => {
        if (typeof value !== "string")
          throw new Error(
            `Expected value to always be a string, but is ${typeof value} instead`
          );
        return value;
      },
      decode: string => string
    },
    server
  });
}
