import { runWebsocketServer } from "oncilla/dist/server";
import { Server as HttpServer } from "http";

export function attachWebSockets(server: HttpServer) {
  runWebsocketServer({
    onChangeData: async function(msg: any) {
      console.log("onChangeData: " + JSON.stringify(msg));
      return "success";
    },
    onRequestData: function(msg: any) {
      console.log("onRequestData: " + JSON.stringify(msg));
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
