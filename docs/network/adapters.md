# Network adapters

## Dummy adapter

Dummy adapter pretends to save information to some server, but in reality it stores it in JavaScript memory and pretends to do work by sleeping.

This is useful to develop your application – you don’t need a backend active, your state is refreshed any time you restart your application, and you can safely use these in preview deployments.

```jsx
import { makeDummyAdapter } from "oncilla";
const initialData = {
  categories: { singleton: ["home", "studies", "fun"] },
  tasks: {
    a1: { title: "Buy milk", category: "home" },
    a2: { title: "Learn next chapter", category: "studies" },
  },
};
const network = makeDummyAdapter(initialData);
```

## Oncilla WebSocket adapter

Oncilla WebSocket adapter talks to a backend using the Oncilla WebSocket protocol.

```jsx
import { makeWsProtocolAdapter } from "oncilla";
const network = makeWsProtocolAdapter({
  url: "wss://example.com/",

  // Optional, allows to modify how the items are serialized for transmitting over the network
  serialization: {
    encode: (value, { kind, id }) => JSON.stringify(value),
    decode: (string, { kind, id }) => JSON.parse(string),
  },
});
```

On the server-side you can use either Oncilla server tools or your own custom implementation. See [server-side documentation](./server-side).
