import { Server as HttpServer } from "http";

import { Serialization } from "../serialization";

export const stringy = ({ kind, id }: K) => `${kind}-${id}`;

export type K = {
  id: string;
  kind: string;
};

export type KV = K & {
  value: ValueContainer;
};

export type Params = {
  onChangeData: (params: {
    kind: string;
    lastSeenRevision: string;
    id: string;
    close: () => void;
    send: (v: ValueContainer) => void;
    value: unknown;
  }) => Promise<"success" | "conflict">;
  onRequestData: (params: {
    kind: string;
    id: string;
    close: () => void;
    send: (v: ValueContainer) => void;
  }) => void;
  serialization?: Serialization;
} & (
  | { port: number; server?: undefined }
  | { port?: undefined; server: HttpServer });

export type ValueContainer = { revision: string; value: unknown };
