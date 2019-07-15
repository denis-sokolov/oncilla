import { Connectivity, NetworkAdapter, PushResult } from "../../network/types";
import { Data } from "../types";
import { makePush } from "./push";

function makeCounters() {
  const stringify = (a: string, b: string) => `${a}-${b}`;
  const data: {
    [k: string]: { count: number; cancel: () => void };
  } = {};
  return {
    add: function(a: string, b: string, f: () => () => void) {
      const kind = stringify(a, b);

      // Cancellation is still not in the protocol,
      // so this is stub logic for now that never cancels.
      if (!data[kind]) data[kind] = { count: 1, cancel: f() };
      return () => {};

      // if (!data[kind] || data[kind].count === 0) {
      //   data[kind] = { count: 0, cancel: f() };
      // }
      // data[kind].count += 1;
      // return function() {
      //   data[kind].count -= 1;
      //   if (data[kind].count === 0) {
      //     data[kind].cancel();
      //     data[kind].cancel = () => {
      //       throw new Error(`Assertion error`);
      //     };
      //   }
      // };
    }
  };
}

type Params<Domain> = {
  canonData: Data<Domain>;
  network: NetworkAdapter<Domain>;
  onChange: (kind: keyof Domain, id: string) => void;
  onConnectivityChange: () => void;
  onError: (err: Error) => void;
  shouldCrashWrites: () => boolean;
};

export function sync<Domain>(params: Params<Domain>) {
  const {
    canonData,
    network,
    onChange,
    onConnectivityChange,
    onError,
    shouldCrashWrites
  } = params;

  let connectivity: Connectivity = "connecting";
  function setConnectivity(value: Connectivity) {
    if (connectivity === "crashed") return;
    connectivity = value;
    onConnectivityChange();
  }

  const pushesInFlight: {
    [id: string]: (result: PushResult<any>) => void;
  } = {};

  const net = network({
    onChange: function({ kind, id, revision, value }) {
      canonData[kind][id] = { revision, value };
      onChange(kind, id);
    },
    onConnectivityChange: setConnectivity,
    onError,
    onPushResult: (pushId, result) => {
      if (!pushesInFlight[pushId]) return;
      pushesInFlight[pushId](result);
      delete pushesInFlight[pushId];
    }
  });

  const push = makePush({
    canonData,
    onError: err => {
      setConnectivity("crashed");
      throw err;
    },
    onNetPush: params =>
      new Promise<PushResult<Domain[any]>>(resolve => {
        pushesInFlight[params.pushId] = resolve;
        net.push(params);
      }),
    onUpdate: ({ kind, id, newValue, newRevision }) => {
      canonData[kind][id] = {
        revision: newRevision,
        value: newValue
      };
    },
    shouldCrashWrites
  });

  const counters = makeCounters();
  return {
    connectivity: () => connectivity,
    observe: <K extends keyof Domain>(kind: K, id: string) => {
      return counters.add(kind as string, id, function() {
        return net.getAndObserve(kind, id);
      });
    },
    push
  };
}
