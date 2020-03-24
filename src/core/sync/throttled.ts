import { makeKindIdStore } from "./kindIdStore";

export function makeThrottled<Keys extends number | string | symbol>(
  f: (kind: Keys, id: string) => void
) {
  const schedules = makeKindIdStore<
    Keys,
    {
      debounceTimer?: NodeJS.Timeout;
      maxTimer?: NodeJS.Timeout;
    }
  >({});

  return function (kind: Keys, id: string) {
    const schedule = schedules.get(kind, id);
    function run() {
      if (schedule.debounceTimer) clearTimeout(schedule.debounceTimer);
      if (schedule.maxTimer) clearTimeout(schedule.maxTimer);
      schedule.maxTimer = undefined;
      f(kind, id);
    }
    if (schedule.debounceTimer) clearTimeout(schedule.debounceTimer);
    schedule.debounceTimer = setTimeout(run, 500);
    if (!schedule.maxTimer) {
      schedule.maxTimer = setTimeout(run, 10000);
    }
  };
}
