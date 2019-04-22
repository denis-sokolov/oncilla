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
  const onMissing = opts.onMissing || defaultOnMissing;
  return function({ onChange, onConnectivityChange, onPushResult }) {
    setTimeout(() => onConnectivityChange("online"), 1000);
    return {
      getAndObserve: function(kind, id) {
        setTimeout(function() {
          onChange({
            kind,
            id,
            revision: "dummy",
            value: id in data ? data[kind][id] : onMissing(kind, id)
          });
        }, 1500);
        return () => {};
      },
      push: ({ kind, id, pushId, value }) => {
        setTimeout(() => {
          onChange({ kind, id, revision: "dummy", value });
          onPushResult(pushId, "success");
        }, 2000);
      }
    };
  };
}
