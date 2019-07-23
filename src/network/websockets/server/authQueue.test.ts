import test from "ava";
import { runWebsocketServer } from ".";
import { makeWsMock } from "./ws-mock";

const infinitePromise = new Promise(() => {});

test.cb("websocket server queues message processing behind auth", t => {
  const ws = makeWsMock();
  runWebsocketServer({
    auth: {
      canRead: () => {
        t.fail("Supposed to wait for token");
        return true;
      },
      canWrite: () => false,
      parseToken: () => infinitePromise
    },
    onChangeData: async ({ value }) => ({ newRevision: "2", newValue: value }),
    onRequestData: ({ send }) => send({ revision: "1", value: "Buy milk" }),
    _ws: ws.server
  });
  const client = ws.client(() => {});
  client.send({ action: "auth", token: "t1" });
  client.send({ action: "subscribe", kind: "tasks", id: "1" });
  setTimeout(t.end, 500);
});

test.cb("websocket server queues message processing behind second auth", t => {
  const ws = makeWsMock();
  runWebsocketServer({
    auth: {
      canRead: ({ auth }) => auth === "admin",
      canWrite: () => false,
      parseToken: async token => (token === "admin" ? "admin" : infinitePromise)
    },
    onChangeData: async ({ value }) => ({ newRevision: "2", newValue: value }),
    onRequestData: ({ send }) => send({ revision: "1", value: "Buy milk" }),
    _ws: ws.server
  });
  const client = ws.client(msg => {
    if (msg.action === "update")
      t.fail("Should not have received with a garbage token");
  });
  client.send({ action: "auth", token: "admin" });
  client.send({ action: "auth", token: "garbage" });
  client.send({ action: "subscribe", kind: "tasks", id: "1" });
  setTimeout(t.end, 500);
});

test.cb("websocket server checks latest permissions for updates", t => {
  const ws = makeWsMock();
  runWebsocketServer({
    auth: {
      canRead: ({ auth }) => auth === "admin",
      canWrite: () => false,
      parseToken: async token => token
    },
    onChangeData: async ({ value }) => ({ newRevision: "2", newValue: value }),
    onRequestData: ({ send }) => {
      send({ revision: "1", value: "Buy milk" });
      setTimeout(() => {
        send({ revision: "2", value: "Buy milk and eggs" });
      }, 200);
    },
    _ws: ws.server
  });
  const client = ws.client(msg => {
    if (msg.action === "update" && msg.revision === "2")
      t.fail("Should not have received with a garbage token");
  });
  client.send({ action: "auth", token: "admin" });
  client.send({ action: "subscribe", kind: "tasks", id: "1" });
  client.send({ action: "auth", token: "garbage" });
  setTimeout(t.end, 500);
});

test.cb("websocket server queues messages before the first auth", t => {
  const ws = makeWsMock();
  runWebsocketServer({
    auth: {
      canRead: ({ auth }) => auth === "admin",
      canWrite: () => false,
      parseToken: async token => token
    },
    onChangeData: async ({ value }) => ({ newRevision: "2", newValue: value }),
    onRequestData: ({ send }) => send({ revision: "1", value: "Buy milk" }),
    _ws: ws.server
  });
  const client = ws.client(msg => {
    if (msg.action === "update" && msg.revision === "1") t.end();
  });
  client.send({ action: "subscribe", kind: "tasks", id: "1" });
  setTimeout(function() {
    client.send({ action: "auth", token: "admin" });
  }, 10);
});

test.cb(
  "websocket server queues messages before the first auth with instant arrival",
  t => {
    const ws = makeWsMock();
    runWebsocketServer({
      auth: {
        canRead: ({ auth }) => auth === "admin",
        canWrite: () => false,
        parseToken: async token => token
      },
      onChangeData: async ({ value }) => ({
        newRevision: "2",
        newValue: value
      }),
      onRequestData: ({ send }) => send({ revision: "1", value: "Buy milk" }),
      _ws: ws.server
    });
    const client = ws.client(msg => {
      if (msg.action === "update" && msg.revision === "1") t.end();
    });
    client.send({ action: "subscribe", kind: "tasks", id: "1" });
    client.send({ action: "auth", token: "admin" });
  }
);

test.cb(
  "websocket server queues messages before the first auth successful auth",
  t => {
    const ws = makeWsMock();
    runWebsocketServer<string | undefined>({
      auth: {
        canRead: () => false,
        canWrite: ({ auth }) => auth === "admin",
        parseToken: async token => (token === "admin" ? "admin" : undefined)
      },
      onChangeData: async ({ value }) => {
        t.is(value, "Buy cocoa");
        t.end();
        return {
          newRevision: "2",
          newValue: value
        };
      },
      onRequestData: () => {},
      _ws: ws.server
    });
    const client = ws.client(() => {});
    client.send({ action: "auth", token: "garbage" });
    client.send({
      action: "push",
      kind: "tasks",
      id: "1",
      lastSeenRevision: "1",
      value: JSON.stringify("Buy cocoa"),
      pushId: "p1"
    });
    setTimeout(function() {
      client.send({ action: "auth", token: "admin" });
    }, 10);
  }
);
