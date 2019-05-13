import { Server as HttpServer } from "http";

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
    id: string;
    send: (v: ValueContainer) => void;
    value: unknown;
  }) => Promise<"success" | "conflict">;
  onRequestData: (params: {
    kind: string;
    id: string;
    send: (v: ValueContainer) => void;
  }) => void;
} & (
  | { port: number; server?: undefined }
  | { port?: undefined; server: HttpServer });

export type ValueContainer = { revision: string; value: unknown };
