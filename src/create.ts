import NanoEvents from "nanoevents";
import { optimisticUi, sync, Data, DebugConfig, Events } from "./core";
import { CreateParams, FullDB } from "./types";

const globalWindow = typeof window === "undefined" ? ({} as Window) : window;

export function create<Domain>(
  params: CreateParams<Domain> & { initialData: Data<Domain> }
): FullDB<Domain> {
  const { initialData, network, onError } = params;
  const window = params.window || globalWindow;

  const debugConfig: DebugConfig = {
    failingWrites: false,
    pretendOffline: false,
    optimisticUIEnabled: true
  };

  const canonData = initialData;

  const events = new NanoEvents<Events<Domain>>();

  const { connectivity, observe, push } = sync<Domain>({
    canonData,
    network,
    onChange: (kind, id) => events.emit("change", [kind, id]),
    onConnectivityChange: () => events.emit("connectivity-changed", undefined),
    shouldCrashWrites: () => debugConfig.failingWrites
  });

  const {
    pendingTransactionCount,
    update,
    withPendingTransactions
  } = optimisticUi<Domain>({
    commitTransaction: push,
    onChangePendingTransactionCount: () =>
      events.emit("pending-transaction-count-changed", undefined),
    onError:
      onError ||
      (err => {
        throw err;
      }),
    onRerenderKind: (kind, id) => events.emit("change", [kind, id]),
    optimisticUIEnabled: () => debugConfig.optimisticUIEnabled
  });

  window.addEventListener("beforeunload", function(e) {
    // We can't ever save lost data anymore
    if (connectivity() === "crashed") return;
    if (pendingTransactionCount() === 0) return;
    e.preventDefault();
    e.returnValue = "";
  });

  const db: FullDB<Domain> = {
    _internals: {
      canonData,
      debugConfig,
      events,
      pendingTransactionCount,
      withPendingTransactions
    },
    connectivity: () =>
      debugConfig.pretendOffline ? "offline" : connectivity(),
    observe,
    update
  };

  return db;
}
