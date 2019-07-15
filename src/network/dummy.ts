import { NetworkAdapter } from "./types";

type OnMissing<Domain> = <K extends keyof Domain>(
  kind: K,
  id: string
) => Domain[K];
const defaultOnMissing: OnMissing<any> = (kind: any, id: string) => {
  throw new Error(`Missing dummy data ${kind} ${id}`);
};

export function makeDummyAdapter<Domain>(
  data: { [K in keyof Domain]: { [id: string]: Domain[K] } },
  opts: {
    onMissing?: OnMissing<Domain>;
  } = {}
): NetworkAdapter<Domain> {
  // Clone data one level deep
  const _ = data;
  data = {} as any;
  Object.keys(_).forEach(k => {
    (data as any)[k] = { ...(_ as any)[k] };
  });

  const onMissing = opts.onMissing || defaultOnMissing;
  let locked = false;
  return function({ onChange, onConnectivityChange, onPushResult }) {
    setTimeout(() => onConnectivityChange("online"), 1000);
    return {
      getAndObserve: function(kind, id) {
        setTimeout(function() {
          onChange({
            kind,
            id,
            revision: "dummy",
            value: id in data[kind] ? data[kind][id] : onMissing(kind, id)
          });
        }, 1500);
        return () => {};
      },
      push: ({ kind, id, pushId, value }) => {
        if (locked) {
          setTimeout(() => onPushResult(pushId, "conflict"), 500);
          return;
        }
        locked = true;
        setTimeout(() => {
          data[kind][id] = value;
          onChange({ kind, id, revision: "dummy", value });
          onPushResult(pushId, { newRevision: "dummy", newValue: value });
          locked = false;
        }, 2000);
      }
    };
  };
}
