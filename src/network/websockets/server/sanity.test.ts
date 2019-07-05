import test from "ava";
import { runWebsocketServer } from ".";
import { makeWsMock } from "./ws-mock";

test.cb("websocket server responds to ping", t => {
  const ws = makeWsMock();
  runWebsocketServer({
    onChangeData: async () => "success",
    onRequestData: () => {},
    _ws: ws.server
  });
  const client = ws.client(msg => {
    if (msg.action === "pong") t.end();
  });
  client.send({ action: "ping" });
});
