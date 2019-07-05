import { Server as HttpServer } from "http";
import { Server as WsServer } from "ws";
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
  onAuthenticate?: (params: {
    close: () => void;
    token: string;
  }) => Promise<"success" | "failure">;
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
  | { port: number; server?: undefined; _ws?: undefined }
  | { port?: undefined; server: HttpServer; _ws?: undefined }
  | { port?: undefined; server?: undefined; _ws?: WsServer });

export type ValueContainer = { revision: string; value: unknown };
