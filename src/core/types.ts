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
