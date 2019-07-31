export type Serialization = {
  encode: (value: unknown, kind: any) => string;
  decode: (string: string, kind: any) => unknown;
};

export const jsonSerialization: Serialization = {
  encode: value => JSON.stringify(value),
  decode: string => JSON.parse(string)
};
