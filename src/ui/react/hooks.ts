import { DebugConfig, FullDB } from "../../types";
import { ReactType } from "./types";

type UpdaterInternal<T> = (options: {}, delta: (prev: T) => T) => void;
export interface Updater<T> extends UpdaterInternal<T> {
  (delta: (prev: T) => T): void;
}
type Changer<T> = [T | "loading", Updater<T>];

function makeUpdater<Domain, K extends keyof Domain>(
  db: FullDB<Domain>,
  kind: K,
  id: string
): Updater<Domain[K]> {
  const updater: UpdaterInternal<Domain[K]> = function(_options, delta) {
    db.update(kind, id, delta);
  };
  return (a: any, b?: any) => updater(b ? a : {}, b || a);
}

export function makeHooks<Domain>(params: {
  React: ReactType;
  useTryDB: () => FullDB<Domain> | "missing-provider";
}) {
  const { React, useTryDB } = params;

  function useRerender(): () => void {
    const [, rerender] = React.useReducer(x => x + 1, 0);
    return () => {
      rerender({});
    };
  }

  return {
    useConnectivity: () => {
      const db = useTryDB();
      if (db === "missing-provider") return "online";

      const rerender = useRerender();
      React.useEffect(
        () => db._internals.events.on("connectivity-changed", rerender),
        []
      );

      return db.connectivity();
    },

    useData: function<K extends keyof Domain>(
      kind: K,
      id: string
    ): Changer<Domain[K]> {
      const db = useTryDB();
      if (db === "missing-provider")
        throw new Error(
          "The component you render needs a DBProvider grand-parent"
        );

      const rerender = useRerender();
      React.useEffect(
        () =>
          db._internals.events.on("change", function(k) {
            if (k[0] === kind && k[1] === id) rerender();
          }),
        []
      );

      React.useEffect(() => db.observe(kind, id), [kind, id]);

      const t = db._internals.withPendingTransactions(db._internals.canonData)[
        kind
      ][id];
      return [
        t ? t.value : "loading",
        React.useCallback(makeUpdater(db, kind, id), [kind, id])
      ];
    },

    useOncillaDebug: (): [
      DebugConfig,
      (partial: Partial<DebugConfig>) => void
    ] => {
      const db = useTryDB();
      if (db === "missing-provider")
        throw new Error(
          "The component you render needs a DBProvider grand-parent"
        );

      const { debugConfig, events } = db._internals;

      const rerender = useRerender();
      React.useEffect(() => events.on("debug-config-changed", rerender), []);

      return [
        debugConfig,
        React.useCallback(function(updates: Partial<DebugConfig>) {
          Object.assign(debugConfig, updates);
          events.emit("debug-config-changed", undefined);
        }, [])
      ];
    },

    usePendingChanges: () => {
      const db = useTryDB();
      if (db === "missing-provider") return false;

      const rerender = useRerender();
      React.useEffect(
        () =>
          db._internals.events.on(
            "pending-transaction-count-changed",
            rerender
          ),
        []
      );

      return db._internals.pendingTransactionCount();
    }
  };
}
