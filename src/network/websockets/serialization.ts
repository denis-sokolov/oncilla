export type Serialization = {
  encode: (value: unknown) => string;
  decode: (string: string) => unknown;
};

export const jsonSerialization: Serialization = {
  encode: value => JSON.stringify(value),
  decode: string => JSON.parse(string)
};
