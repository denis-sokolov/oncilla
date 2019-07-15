import test from "ava";
import testWsAdapter from "./testWsAdapter";

test("ws adapter sends subscribe message", t => {
  const { adapter, connect, sentMessages } = testWsAdapter();
  connect();
  adapter.getAndObserve("tasks", "1");
  t.true(sentMessages.some(msg => msg.action === "subscribe"));
});

test("ws adapter resends subscribe message on reconnect", t => {
  const { adapter, connect, disconnect, sentMessages } = testWsAdapter();
  connect();
  adapter.getAndObserve("tasks", "1");
  const subscribesBefore = sentMessages.filter(
    msg => msg.action === "subscribe"
  ).length;
  disconnect();
  connect();
  const subscribesAfter = sentMessages.filter(msg => msg.action === "subscribe")
    .length;
  t.true(subscribesAfter > subscribesBefore);
});

test("ws adapter resends one auth message on reconnect", t => {
  const { auth, connect, disconnect, sentMessages } = testWsAdapter();
  connect();
  auth("token-1");
  auth("token-2");
  auth("token-3");
  disconnect();
  const authsBefore = sentMessages.filter(msg => msg.action === "auth").length;
  connect();
  const authsAfter = sentMessages.filter(msg => msg.action === "auth").length;
  t.is(authsAfter, authsBefore + 1);
});
