import type { Emitter } from "nanoevents";
import type { Connectivity, NetworkAdapter } from "../network/types";

export { Connectivity } from "../network/types";

export type CreateParams<Domain> = {
  network: NetworkAdapter<Domain>;
  onError?: (error: Error) => void;
  window?: Window;
};

export type FullDB<Domain> = {
  _internals: {
    canonData: Data<Domain>;
    debugConfig: DebugConfig;
    events: Emitter<EventsForNano<Domain>>;
    pendingTransactionCount: () => number;
    withPendingTransactions: (data: Data<Domain>) => Data<Domain>;
  };
  connectivity: () => Connectivity;
  create: <K extends keyof Domain>(
    kind: K,
    id: string,
    value: Domain[K]
  ) => void;
  observe: (kind: keyof Domain, id: string) => () => void;
  update: <K extends keyof Domain>(
    kind: K,
    id: string,
    delta: Delta<Domain, K>
  ) => void;
};

export type Data<Domain> = {
  [k in keyof Domain]: DataKindCollection<Domain[k]>;
};

export type DataKindCollection<Value> = {
  [id: string]: { revision: string; value: Value } | undefined;
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

export type EventsForNano<Domain> = {
  [K in keyof Events<Domain>]: (param: Events<Domain>[K]) => void;
};

export type Transaction<Domain, K extends keyof Domain = keyof Domain> = {
  kind: K;
  id: string;
} & TransactionAction<Domain, K>;

export type TransactionAction<Domain, K extends keyof Domain = keyof Domain> =
  | { delta: Delta<Domain, K> }
  | { creation: Domain[K] };
