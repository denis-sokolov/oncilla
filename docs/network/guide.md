# Network starting guide

On the client side, use our custom Oncilla WebSocket adapter:

```js
import { makeWsProtocolAdapter } from "oncilla";
const network = makeWsProtocolAdapter({
  url: "wss://example.com/",
});
```

For development convenience you can run an in-memory WebSocket server running on Node.js:

```js
import { runMemoryServer } from "oncilla/dist/server";

export function attachWebSockets(server: HttpServer) {
  runMemoryServer({
    initialData: {
      tasks: {
        [taskId1]: { title: "Buy milk" },
      },
    },
    port: 8090,
  });
}
```

For a serious server-side implementation, you need to implement your own custom websocket server using Oncilla tooling:

```js
import { runWebsocketServer } from "oncilla/dist/server";

runWebsocketServer({
  onChangeData: async function({ kind, id, lastSeenRevision, send, value }) {
    // getItem is your function that returns { revision, value } object
    const curr = await getItem(kind, id);
    if (curr.revision !== lastSeenRevision) return "conflict";

    curr.revision = String(Number(curr.revision) + 1);
    curr.value = value;
    // saveCurrentItem is your function that tries to write into the database
    try {
      await saveCurrentItem(curr);
    } catch (err) {
      if (isConflict(err)) return "conflict";
      throw err;
    }

    return {
      newRevision: curr.revision,
      newValue: curr.value
    };
  },
  onRequestData: async function({ kind, id, send }) {
    // getItem is your function that returns { revision, value } object
    send(await getItem(kind, id));
    // observeChanges is your function that allows to listen to
    // when an item changes in the database.
    observeChanges(kind, id, () => {
      send(await getItem(kind, id));
    });
  },
  port: 8090
});
```

Both client and server support serialization options:

```js
makeWsProtocolAdapter({
  serialization: {
    encode: (value) => JSON.stringify(value),
    decode: (string) => JSON.parse(string),
  },
});
```
