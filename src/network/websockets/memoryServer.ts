import type { Server as HttpServer } from "http";

import type { Data } from "../../core";

import type { Serialization } from "./serialization";
import { runWebsocketServer } from "./server";

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

type Params = {
  initialData: { [kind: string]: { [id: string]: unknown } };
  serialization?: Serialization;
} & (
  | { port: number; server?: undefined }
  | { port?: undefined; server: HttpServer }
);

export function runMemoryServer(params: Params) {
  const { initialData, port, serialization, server } = params;

  const data: Data<any> = {};
  Object.keys(initialData).forEach((kind) => {
    data[kind] = {};
    Object.keys(initialData[kind]).forEach((id) => {
      data[kind][id] = { revision: "1", value: initialData[kind][id] };
    });
  });

  function getItem(kind: string, id: string) {
    const item = data[kind][id];
    if (!item) throw new Error(`Invalid item ${kind} ${id}`);
    return item;
  }

  runWebsocketServer({
    onChangeData: async function ({ kind, id, value }) {
      await wait(500);
      const curr = getItem(kind, id);
      curr.revision = String(Number(curr.revision) + 1);
      curr.value = value;
      return { newRevision: curr.revision, newValue: curr.value };
    },
    onRequestData: function ({ kind, id, send }) {
      send(getItem(kind, id));
    },
    port: port as any,
    serialization,
    server: server as any,
  });
}
