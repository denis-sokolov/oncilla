import test from "ava";

import { configure } from "./configure";
import { makeReactMock, makeWindowMock, networkMock } from "./mocks";

test("sanity react test", t => {
  const react = makeReactMock();
  const { create, useData } = configure({
    data: { task: { "1": { revision: "1", value: "Buy milk" } } },
    React: react
  });
  const { db } = create({
    network: networkMock,
    onError: err => t.fail(err.message),
    window: makeWindowMock()
  });
  react._setContextValue(db);
  const [task, updateTask] = useData("task", "1");
  t.is(task, "Buy milk");
  t.is(typeof updateTask, "function");
});
