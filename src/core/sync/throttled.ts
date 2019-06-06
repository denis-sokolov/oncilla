export function makeThrottled<Keys extends number | string | symbol>(
  f: (kind: Keys, id: string) => void
) {
  const scheduleStore: {
    [k in Keys]?: {
      [id: string]: {
        debounceTimer: NodeJS.Timeout | null;
        maxTimer: NodeJS.Timeout | null;
      };
    }
  } = {};
  function scheduleFor(kind: Keys, id: string) {
    scheduleStore[kind] = scheduleStore[kind] || {};
    scheduleStore[kind]![id] = scheduleStore[kind]![id] || {};
    return scheduleStore[kind]![id]!;
  }

  return function(kind: Keys, id: string) {
    const schedule = scheduleFor(kind, id);
    function run() {
      if (schedule.debounceTimer) clearTimeout(schedule.debounceTimer);
      if (schedule.maxTimer) clearTimeout(schedule.maxTimer);
      schedule.maxTimer = null;
      f(kind, id);
    }
    if (schedule.debounceTimer) clearTimeout(schedule.debounceTimer);
    schedule.debounceTimer = setTimeout(run, 500);
    if (!schedule.maxTimer) {
      schedule.maxTimer = setTimeout(run, 10000);
    }
  };
}
