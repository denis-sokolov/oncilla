export function makeKindIdStore<
  Keys extends number | string | symbol,
  T extends object
>(defaultValue: T) {
  const store: { [k in Keys]?: { [id: string]: T | undefined } } = {};
  return {
    get: function (kind: Keys, id: string) {
      store[kind] = store[kind] || {};
      const kindStore = store[kind];
      if (!kindStore) throw new Error();

      kindStore[id] = kindStore[id] || defaultValue;
      const value = kindStore[id];
      if (!value) throw new Error();

      return value;
    },
  };
}
