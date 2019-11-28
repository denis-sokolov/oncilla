# Server-side

## Oncilla WebSocket server

If you run Node.js on the backend, you may want to run Oncilla WebSocket server tool for convenience. It abstracts the protocol away for you leaving you to focus on your data.

Also see [the starting guide](./guide.md).

```js
import { runWebsocketServer } from "oncilla/dist/server";

runWebsocketServer({
  // One of the following two is required
  port: 8090,
  // Instance of Node HttpServer, whether built-in, or Express-like
  server: httpServer,

  // You can start without defining auth, but beware
  auth: {
    canRead: ({ authDetails, kind, id }) => true,
    canWrite: ({ authDetails, kind, id }) => true,
    // parseToken will be called multiple times over the course of one socket lifetime to refresh the permissions periodically
    parseToken: async (token, { close }) => authDetails
  },
  onRequestData: async function({ kind, id, send }) {
    // Send an item immediately
    send(item);

    // And set up observation logic
    observe(kind, id, () => send(item));
  },
  onChangeData: async function({ kind, id, lastSeenRevision, send, value }) {
    if (revisionOld) return "conflict";

    // It is up to you how you compute revisions and how you normalize values
    return {
      newRevision: "new revision for item",
      newValue: "saved value"
    };
  },

  // Optional, allows to change the way the values are serialized to be transmitted over the network
  serialization: {
    encode: (value, { kind, id }) => JSON.stringify(value),
    decode: (string, { kind, id }) => JSON.parse(string)
  }
});
```
