# Network

To connect your app to your server, you need a talking channel. The default choice on the web is WebSockets.

To let Oncilla DB talk to your server, you’ll need to implement an endpoint. See [the Oncilla WebSocket protocol mini-specification](wsProtocol.md) to see what you need to do.

On the client side, use our custom Oncilla WebSocket adapter:

```js
import { makeWsProtocolAdapter } from "oncilla";
const network = makeWsProtocolAdapter({
  url: "wss://example.com/"
});
```

For development convenience you can run an in-memory WebSocket server running on Node.js:

```js
import { runMemoryServer } from "oncilla/dist/server";

export function attachWebSockets(server: HttpServer) {
  runMemoryServer({
    initialData: {
      tasks: {
        [taskId1]: { title: "Buy milk" }
      }
    },
    port: 8090
  });
}
```
