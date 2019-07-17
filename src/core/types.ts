import NanoEvents from "nanoevents";
import { Connectivity, NetworkAdapter } from "../network/types";

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

export type Data<Domain> = {
  [k in keyof Domain]: {
    [id: string]: { revision: string; value: Domain[k] } | undefined;
  }
};

export type Delta<Domain, K extends keyof Domain> = (
  prev: Domain[K]
) => Domain[K];

export type DebugConfig = {
  failingWrites: boolean;
  pretendOffline: boolean;
  optimisticUIEnabled: boolean;
};

export type Events<Domain> = {
  change: [keyof Domain, string];
  "debug-config-changed": undefined;
  "pending-transaction-count-changed": undefined;
  "connectivity-changed": undefined;
};

export type Transaction<Domain, K extends keyof Domain = keyof Domain> = {
  kind: K;
  id: string;
} & TransactionAction<Domain, K>;

export type TransactionAction<Domain, K extends keyof Domain = keyof Domain> =
  | { delta: Delta<Domain, K> }
  | { creation: Domain[K] };
