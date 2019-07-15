import test from "ava";
import { runWebsocketServer } from ".";
import { makeWsMock } from "./ws-mock";

test.cb("websocket server allows to read and write when auth allows", t => {
  const ws = makeWsMock();
  runWebsocketServer({
    auth: {
      canRead: ({ auth, kind, id }) => {
        t.is(kind, "tasks");
        t.is(id, "1");
        t.is(auth, "john");
        return true;
      },
      canWrite: ({ auth, kind, id }) => {
        t.is(kind, "tasks");
        t.is(id, "1");
        t.is(auth, "john");
        return true;
      },
      parseToken: async token => {
        t.is(token, "t1");
        return "john";
      }
    },
    onChangeData: async ({ value }) => ({ newRevision: "2", newValue: value }),
    onRequestData: ({ send }) => {
      send({ revision: "1", value: "Buy milk" });
    },
    _ws: ws.server
  });
  const client = ws.client(msg => {
    if (msg.action === "pushResult" && msg.newRevision === "2") {
      t.end();
    }
  });
  client.send({ action: "auth", token: "t1" });
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

test.cb("websocket server forbids to read without login", t => {
  const ws = makeWsMock();
  runWebsocketServer({
    auth: {
      canRead: () => true,
      canWrite: () => true,
      parseToken: async () => "john"
    },
    onChangeData: async () => ({ newValue: {}, newRevision: "2" }),
    onRequestData: ({ send }) => {
      send({ revision: "1", value: "Buy milk" });
    },
    _ws: ws.server
  });
  const client = ws.client(msg => {
    if (msg.action === "update") {
      t.fail("Should not receive an update, it’s forbidden");
    }
  });
  client.send({ action: "subscribe", kind: "tasks", id: "1" });
  setTimeout(() => t.end(), 100);
});

test.cb("websocket server forbids to read when forbidden", t => {
  const ws = makeWsMock();
  runWebsocketServer({
    auth: {
      canRead: ({ auth, kind, id }) => {
        t.is(kind, "tasks");
        t.is(id, "1");
        t.is(auth, "john");
        return false;
      },
      canWrite: () => true,
      parseToken: async () => "john"
    },
    onChangeData: async () => ({ newValue: {}, newRevision: "2" }),
    onRequestData: ({ send }) => {
      send({ revision: "1", value: "Buy milk" });
    },
    _ws: ws.server
  });
  const client = ws.client(msg => {
    if (msg.action === "update") {
      t.fail("Should not receive an update, it’s forbidden");
    }
  });
  client.send({ action: "auth", token: "t1" });
  client.send({ action: "subscribe", kind: "tasks", id: "1" });
  setTimeout(() => t.end(), 100);
});

test.cb("websocket server forbids to write when forbidden", t => {
  const ws = makeWsMock();
  runWebsocketServer({
    auth: {
      canRead: () => true,
      canWrite: ({ auth, kind, id }) => {
        t.is(kind, "tasks");
        t.is(id, "1");
        t.is(auth, "john");
        return false;
      },
      parseToken: async () => "john"
    },
    onChangeData: async ({ value }) => ({ newValue: value, newRevision: "2" }),
    onRequestData: ({ send }) => {
      send({ revision: "1", value: "Buy milk" });
    },
    _ws: ws.server
  });
  const client = ws.client(msg => {
    if (msg.action === "pushResult" && msg.newRevision === "2") {
      t.fail("Should not have allowed an update, it’s forbidden");
    }
  });
  client.send({ action: "auth", token: "t1" });
  client.send({ action: "subscribe", kind: "tasks", id: "1" });
  client.send({
    action: "push",
    kind: "tasks",
    id: "1",
    lastSeenRevision: "1",
    value: JSON.stringify("Buy cocoa"),
    pushId: "p1"
  });
  setTimeout(() => t.end(), 100);
});
