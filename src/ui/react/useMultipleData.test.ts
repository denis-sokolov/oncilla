import test from "ava";
import { build } from "./mocks";

test("useMultipleData sanity test", (t) => {
  const { useMultipleData } = build(t, {
    tasks: {
      "1": { revision: "1", value: "Buy milk" },
      "2": { revision: "1", value: "Fix roof" },
    },
    projects: {
      "1": { revision: "1", value: { size: "big" } },
    },
    unused: { "0": { revision: "1", value: "Unused" } },
  });

  const [tasks, updateTask] = useMultipleData("tasks", ["1", "2"]);
  if (tasks === "loading") return t.fail("Expected tasks to not be loading");
  t.is(tasks["1"], "Buy milk");
  t.is(tasks["2"], "Fix roof");
  t.is(typeof updateTask, "function");
});
