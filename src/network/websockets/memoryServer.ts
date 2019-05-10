import { Data } from "../../core";

import { runWebsocketServer } from "./server";

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

type Params = {
  data: Data<any>;
  port: number;
};

export function runMemoryServer(params: Params) {
  const { data, port } = params;

  function getItem(kind: string, id: string) {
    const item = data[kind][id];
    if (!item) throw new Error(`Invalid item ${kind} ${id}`);
    return item;
  }

  runWebsocketServer({
    onChangeData: async function({ kind, id, send, value }) {
      await wait(500);
      const curr = getItem(kind, id);
      curr.revision = String(Number(curr.revision) + 1);
      curr.value = value;
      send(curr);
      return "success";
    },
    onRequestData: function({ kind, id, send }) {
      send(getItem(kind, id));
    },
    port
  });
}
