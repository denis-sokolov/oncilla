import { Data, Delta } from "../types";

type Params<Domain> = {
  commitTransaction: <K extends keyof Domain>(
    kind: K,
    id: string,
    delta: (prev: Domain[K]) => Domain[K]
  ) => Promise<void>;
  onChangePendingTransactionCount: () => void;
  onError: (error: Error) => void;
  onRerenderKind: <K extends keyof Domain>(kind: K, id: string) => void;
  optimisticUIEnabled: () => boolean;
};

export function optimisticUi<Domain>(params: Params<Domain>) {
  type Transaction<K extends keyof Domain = keyof Domain> = {
    kind: K;
    id: string;
    delta: Delta<Domain, K>;
  };

  const {
    commitTransaction,
    onChangePendingTransactionCount,
    onError,
    onRerenderKind,
    optimisticUIEnabled
  } = params;

  let pendingTransactions: Transaction[] = [];

  return {
    pendingTransactionCount: () => pendingTransactions.length,
    update: function<K extends keyof Domain>(
      kind: K,
      id: string,
      delta: Delta<Domain, K>
    ) {
      const transaction: Transaction<any> = { kind, id, delta };

      pendingTransactions.push(transaction);
      onChangePendingTransactionCount();

      // Rerender immediately to show optimistic update
      onRerenderKind(kind, id);

      commitTransaction(kind, id, delta)
        .then(function() {
          pendingTransactions = pendingTransactions.filter(
            t => t !== transaction
          );
          onChangePendingTransactionCount();

          // We have removed the pending transaction asynchronously,
          // and the server may have already added changes on top,
          // which the UI does not show yet.
          onRerenderKind(kind, id);
        })
        .catch(onError);
    },
    withPendingTransactions: function(data: Data<Domain>): Data<Domain> {
      if (!optimisticUIEnabled()) return data;

      const result: any = {};
      Object.keys(data).forEach(k => {
        result[k] = { ...(data as any)[k] };
      });

      // Apply pending transactions on top of the canon version
      pendingTransactions.forEach(function(transaction) {
        const prev = result[transaction.kind][transaction.id];
        if (!prev)
          throw new Error(
            `withPendingTransactions ${transaction.kind} ${
              transaction.id
            } called before the data has been retrieved`
          );
        result[transaction.kind][transaction.id] = {
          revision: "optimistic",
          value: transaction.delta(prev.value)
        };
      });

      return result;
    }
  };
}