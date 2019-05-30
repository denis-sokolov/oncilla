import { Connectivity, NetworkAdapter, PushResult } from "../../network/types";
import { Data } from "../types";

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
  shouldCrashWrites: () => boolean;
};

export function sync<Domain>(params: Params<Domain>) {
  const {
    canonData,
    network,
    onChange,
    onConnectivityChange,
    shouldCrashWrites
  } = params;

  let connectivity: Connectivity = "connecting";
  function setConnectivity(value: Connectivity) {
    if (connectivity === "crashed") return;
    connectivity = value;
    onConnectivityChange();
  }

  let pushCounter = 0;
  const pendingPushes: {
    [id: string]: { [k in PushResult]: (() => void) | undefined };
  } = {};

  const net = network({
    onChange: function({ kind, id, revision, value }) {
      canonData[kind][id] = { revision, value };
      onChange(kind, id);
    },
    onConnectivityChange: setConnectivity,
    onError: function(error) {
      throw error;
    },
    onPushResult: function(pushId, result) {
      if (pendingPushes[pushId]) {
        const handler = pendingPushes[pushId][result];
        if (!handler)
          throw new Error(`Not implemented push result handler for ${result}`);
        handler();
        delete pendingPushes[pushId];
      }
    }
  });

  const counters = makeCounters();
  const defaultRetries = 15;

  async function push<K extends keyof Domain>(params: {
    kind: K;
    id: string;
    delta: (prev: Domain[K]) => Domain[K];
    retriesRemaining: number;
  }): Promise<void> {
    if (shouldCrashWrites()) {
      return new Promise((_, reject) => {
        setTimeout(() => reject(new Error("Simulate write failure")), 2000);
      });
    }

    const { kind, id, delta, retriesRemaining } = params;

    const curr = canonData[kind][id];
    if (!curr)
      throw new Error(
        `Pushing to ${kind} while the canon data is empty is not yet implemented. Proper implementation turns on observing here, waits for the data and tries to push.`
      );

    const value = delta(curr.value);

    const pushId = `push-${pushCounter++}`;
    return new Promise(function(resolve, reject) {
      pendingPushes[pushId] = {
        conflict: () =>
          // Server and the connection are healthy, so reset the retries
          // We can resolve conflicts infinitely, it’s the internal errors that
          // we need to limit retries.
          push({ ...params, retriesRemaining: defaultRetries })
            .then(resolve)
            .catch(reject),
        internalError: () => {
          // As many other pieces of this code, the retry logic needs
          // cleaner refactoring
          if (retriesRemaining === 0)
            return reject(new Error(`Write failed after all retries`));
          setTimeout(function() {
            push({ ...params, retriesRemaining: retriesRemaining - 1 })
              .then(resolve)
              .catch(reject);
          }, 3000);
        },
        success: resolve
      };
      net.push({
        kind,
        id,
        pushId,
        lastSeenRevision: curr.revision,
        value
      });
    });
  }

  return {
    connectivity: () => connectivity,
    observe: <K extends keyof Domain>(kind: K, id: string) => {
      return counters.add(kind as string, id, function() {
        return net.getAndObserve(kind, id);
      });
    },
    push: async function<K extends keyof Domain>(
      kind: K,
      id: string,
      delta: (prev: Domain[K]) => Domain[K]
    ): Promise<void> {
      try {
        await push({ kind, id, delta, retriesRemaining: defaultRetries });
      } catch (err) {
        setConnectivity("crashed");
        throw err;
      }
    }
  };
}
