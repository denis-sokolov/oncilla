import test from "ava";

import { makeWindowMock } from "../ui/mocks";
import { create } from "./create";

test.cb("update with optimistic ui", t => {
  const oncilla = create({
    initialData: {
      taskList: {
        singleton: { revision: "0", value: [] as string[] }
      },
      taskCount: {
        singleton: { revision: "0", value: 0 }
      }
    },
    network: () => {
      return {
        getAndObserve: () => () => {},
        push: () => {}
      };
    },
    window: makeWindowMock()
  });
  oncilla.observe("taskList", "singleton");
  oncilla._internals.events.on("change", function(k) {
    if (k[0] !== "taskList") return;
    const kind = "taskList";
    const id = "singleton";
    const atom = oncilla._internals.withPendingTransactions(
      oncilla._internals.canonData
    )[kind][id];
    if (!atom) return;
    t.deepEqual(atom.value, ["Buy milk"]);
    t.end();
  });
  oncilla.update("taskList", "singleton", prev => prev.concat(["Buy milk"]));
});
