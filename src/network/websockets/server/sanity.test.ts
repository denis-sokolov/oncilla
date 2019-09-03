import test from "ava";
import { runWebsocketServer } from ".";
import { makeWsMock } from "./ws-mock";

test.cb("websocket server responds to ping", t => {
  const ws = makeWsMock();
  runWebsocketServer({
    onChangeData: async () => ({ newRevision: "2", newValue: "" }),
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
    onChangeData: async () => ({ newRevision: "2", newValue: "" }),
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
    onChangeData: async ({ id, kind, value }) => {
      t.is(id, "1");
      t.is(kind, "tasks");
      return { newRevision: "2", newValue: value };
    },
    onRequestData: ({ send }) => {
      send({ revision: "1", value: "Buy milk" });
    },
    _ws: ws.server
  });
  const client = ws.client(msg => {
    if (msg.action === "pushResult") {
      t.is(msg.pushId, "p1");
      t.is(msg.result, "success");
      t.is(msg.newRevision, "2");
      t.is(msg.newValue, JSON.stringify("Buy cocoa"));
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

test.cb("websocket server shares updates with other clients", t => {
  const ws = makeWsMock();
  let storedValue = "Buy milk";
  runWebsocketServer({
    onChangeData: async ({ value }) => {
      storedValue = value as string;
      return { newRevision: "2", newValue: value };
    },
    onRequestData: ({ send }) => {
      send({ revision: "1", value: storedValue });
    },
    _ws: ws.server
  });
  const client1 = ws.client(() => {});
  const client2 = ws.client(msg => {
    if (msg.action === "update" && msg.revision === "2") {
      t.is(msg.kind, "tasks");
      t.is(msg.value, JSON.stringify("Buy cocoa"));
      t.end();
    }
  });
  client2.send({ action: "subscribe", kind: "tasks", id: "1" });
  client1.send({
    action: "push",
    kind: "tasks",
    id: "1",
    lastSeenRevision: "1",
    value: JSON.stringify("Buy cocoa"),
    pushId: "p1"
  });
});
