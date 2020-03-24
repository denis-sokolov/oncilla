import test from "ava";
import { build } from "./mocks";

test("useData sanity test", (t) => {
  const { useData } = build(t, {
    task: { "1": { revision: "1", value: "Buy milk" } },
  });
  const [task, updateTask] = useData("task", "1");
  t.is(task, "Buy milk");
  t.is(typeof updateTask, "function");
});

test("useData update test", async (t) => {
  const { useData } = build(t, {
    task: { "1": { revision: "1", value: "Buy milk" } },
  });
  const [task, updateTask] = useData("task", "1");
  t.is(task, "Buy milk");
  updateTask(() => "Buy charcoal");
  const [taskAfter] = useData("task", "1");
  t.is(taskAfter, "Buy charcoal");
});

test("useData patch", async (t) => {
  const { useData } = build(t, {
    task: { "1": { revision: "1", value: { title: "Buy milk", priority: 5 } } },
  });
  const [, updateTask] = useData("task", "1");
  updateTask("title", "Buy charcoal");
  const [taskAfter] = useData("task", "1");
  if (taskAfter === "loading") throw new Error();
  t.is(taskAfter.title, "Buy charcoal");
});
