import NanoEvents from "nanoevents";
import { Data, DebugConfig, Delta, Events } from "./core";
import { Connectivity, NetworkAdapter } from "./network";

export type CreateParams<Domain> = {
  network: NetworkAdapter<Domain>;
  onError?: (error: Error) => void;
  window?: Window;
};

export type FullDB<Domain> = {
  _internals: {
    canonData: Data<Domain>;
    debugConfig: DebugConfig;
    events: NanoEvents<Events<Domain>>;
    pendingTransactionCount: () => number;
    withPendingTransactions: (data: Data<Domain>) => Data<Domain>;
  };
  connectivity: () => Connectivity;
  observe: (kind: keyof Domain, id: string) => () => void;
  update: <K extends keyof Domain>(
    kind: K,
    id: string,
    delta: Delta<Domain, K>
  ) => void;
};
