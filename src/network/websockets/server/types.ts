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

export type Params<AuthDetails> = {
  auth?: {
    canRead: (params: {
      auth: AuthDetails;
      kind: string;
      id: string;
    }) => boolean;
    canWrite: (params: {
      auth: AuthDetails;
      kind: string;
      id: string;
    }) => boolean;
    // parseToken will be called multiple times over the course of one socket lifetime to refresh the permissions periodically
    parseToken: (
      token: string,
      params: {
        close: () => void;
      }
    ) => Promise<AuthDetails>;
  };
  onChangeData: (params: {
    kind: string;
    lastSeenRevision: string;
    id: string;
    close: () => void;
    value: unknown;
  }) => Promise<{ newValue: unknown; newRevision: string } | "conflict">;
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
  | { port?: undefined; server?: undefined; _ws?: WsServer }
);

export type ValueContainer = { revision: string; value: unknown };
