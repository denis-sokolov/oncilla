import test from "ava";

import { configure } from "./configure";
import { makeReactMock, makeWindowMock, networkMock } from "./mocks";

test("useMultipleData sanity", t => {
  const react = makeReactMock();
  const { create, useMultipleData } = configure({
    data: {
      tasks: {
        "1": { revision: "1", value: "Buy milk" },
        "2": { revision: "1", value: "Fix roof" }
      },
      projects: {
        "1": { revision: "1", value: { size: "big" } }
      },
      unused: { "0": { revision: "1", value: "Unused" } }
    },
    React: react
  });
  const { db } = create({
    network: networkMock,
    onError: err => t.fail(err.message),
    window: makeWindowMock()
  });
  react._setContextValue(db);

  const [tasks, updateTask] = useMultipleData("tasks", ["1", "2"]);
  if (tasks === "loading") return t.fail("Expected tasks to not be loading");
  t.is(tasks["1"], "Buy milk");
  t.is(tasks["2"], "Fix roof");
  t.is(typeof updateTask, "function");

  const [data, update] = useMultipleData({
    tasks: ["1", "2"],
    projects: ["1"]
  });
  if (data === "loading") return t.fail("Expected data to not be loading");
  t.is(data.tasks["1"], "Buy milk");
  t.is(data.tasks["2"], "Fix roof");
  t.is(data.projects["1"].size, "big");
  t.is((data as any).unused, undefined);
  t.is(typeof update, "function");
});
