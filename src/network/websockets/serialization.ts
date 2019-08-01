export type SerializationContext = {
  id: string;
  kind: string;
};

export type Serialization = {
  encode: (value: unknown, context: SerializationContext) => string;
  decode: (string: string, context: SerializationContext) => unknown;
};

export const jsonSerialization: Serialization = {
  encode: value => JSON.stringify(value),
  decode: string => JSON.parse(string)
};
