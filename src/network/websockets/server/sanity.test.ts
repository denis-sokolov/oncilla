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

test.cb("websocket server retrieves data", t => {
  const ws = makeWsMock();
  runWebsocketServer({
    onChangeData: async () => "success",
    onRequestData: ({ id, kind, send }) => {
      t.is(id, "1");
      t.is(kind, "tasks");
      send({ revision: "1", value: "Buy milk" });
    },
    _ws: ws.server
  });
  const client = ws.client(msg => {
    if (msg.action === "update") {
      t.is(msg.kind, "tasks");
      t.is(msg.id, "1");
      t.is(msg.revision, "1");
      t.is(msg.value, JSON.stringify("Buy milk"));
      t.end();
    }
  });
  client.send({ action: "subscribe", kind: "tasks", id: "1" });
});

test.cb("websocket server writes data", t => {
  const ws = makeWsMock();
  runWebsocketServer({
    onChangeData: async ({ id, kind, send, value }) => {
      t.is(id, "1");
      t.is(kind, "tasks");
      send({ revision: "2", value });
      return "success";
    },
    onRequestData: ({ send }) => {
      send({ revision: "1", value: "Buy milk" });
    },
    _ws: ws.server
  });
  let seenUpdate = false;
  const client = ws.client(msg => {
    if (msg.action === "update" && msg.revision === "2") {
      seenUpdate = true;
      t.is(msg.kind, "tasks");
      t.is(msg.id, "1");
      t.is(msg.value, JSON.stringify("Buy cocoa"));
    }
    if (msg.action === "pushResult") {
      t.true(seenUpdate);
      t.is(msg.pushId, "p1");
      t.is(msg.result, "success");
      t.end();
    }
  });
  client.send({ action: "subscribe", kind: "tasks", id: "1" });
  client.send({
    action: "push",
    kind: "tasks",
    id: "1",
    lastSeenRevision: "1",
    value: JSON.stringify("Buy cocoa"),
    pushId: "p1"
  });
});
