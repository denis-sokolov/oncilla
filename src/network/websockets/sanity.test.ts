import test from "ava";
import testWsAdapter from "./testWsAdapter";

test("ws adapter sends subscribe message", t => {
  const { adapter, connect, sentMessages } = testWsAdapter();
  connect();
  adapter.getAndObserve("tasks", "1");
  t.true(sentMessages.some(msg => msg.action === "subscribe"));
});
