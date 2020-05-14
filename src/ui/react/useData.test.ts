import test from "ava";
import { build } from "./mocks";

function typeTests(_f: () => void) {}

test("useData sanity test", (t) => {
  const { useData } = build(t, {
    task: { "1": { revision: "1", value: "Buy milk" } },
  });
  const [task, updateTask] = useData("task", "1");
  t.is(task, "Buy milk");
  t.is(typeof updateTask, "function");

  typeTests(function () {
    // @ts-expect-error
    useData("foo", "1");
  });
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

  typeTests(function () {
    // @ts-expect-error
    updateTask(() => 2);
    // @ts-expect-error
    updateTask((prev: number) => 0 as any);
  });
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

  typeTests(function () {
    // @ts-expect-error
    updateTask("title", 2);
  });
});
