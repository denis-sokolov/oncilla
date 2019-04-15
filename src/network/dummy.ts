import { NetworkAdapter } from "./types";

export function makeDummyAdapter<Domain>(
  data: { [K in keyof Domain]: { [id: string]: Domain[K] } }
): NetworkAdapter<Domain> {
  return function({ onChange, onConnectivityChange, onPushResult }) {
    setTimeout(() => onConnectivityChange("online"), 1000);
    return {
      getAndObserve: function(kind, id) {
        if (!data[kind][id])
          throw new Error(`Missing dummy data ${kind} ${id}`);
        setTimeout(function() {
          onChange({
            kind,
            id,
            revision: "dummy",
            value: data[kind][id]
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
