export type MassUpdaterInternal<Domain, K extends keyof Domain> = (
  options: {},
  kind: K,
  id: string,
  delta: (prev: Domain[K]) => Domain[K]
) => void;
export type MassUpdater<Domain, K extends keyof Domain> = MassUpdaterInternal<
  Domain,
  K
> & {
  (kind: K, id: string, delta: (prev: Domain[K]) => Domain[K]): void;
};

export type UpdaterInternal<T> = (options: {}, delta: (prev: T) => T) => void;
export type Updater<T> = UpdaterInternal<T> & {
  (delta: (prev: T) => T): void;
} & (T extends {}
    ? { <K extends keyof T & string>(field: K, value: T[K]): void }
    : {});
export type Changer<T> = [T | "loading", Updater<T>];
