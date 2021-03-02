import type { FullDB } from "../../../core";
import type {
  MassUpdater,
  MassUpdaterInternal,
  Updater,
  UpdaterInternal,
} from "./types";

export function makeMassUpdater<Domain, K extends keyof Domain>(
  db: FullDB<Domain>
): MassUpdater<Domain, K> {
  const updater: MassUpdaterInternal<Domain, K> = function (
    _options,
    kind,
    id,
    delta
  ) {
    db.update(kind, id, delta);
  };
  return (a: any, b: any, c: any, d?: any) =>
    d ? updater(a, b, c, d) : updater({}, a, b, c);
}

export function makeUpdater<Domain, K extends keyof Domain>(
  massUpdater: MassUpdater<Domain, K>,
  kind: K,
  id: string
): Updater<Domain[K]> {
  const updater: UpdaterInternal<Domain[K]> = function (options, delta) {
    massUpdater(options, kind, id, delta);
  };
  return ((a: any, b?: any) => {
    if (typeof a === "string")
      return updater({}, (prev) => ({ ...prev, [a]: b }));
    updater(b ? a : {}, b || a);
  }) as any;
}
