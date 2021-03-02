## React

### configure

Configures a version of Oncilla tools configured to be used in your React application.
Do it once somewhere at the top of your application.

The purpose of the extra step of configuring before creating is to ensure we can have
versions of Oncilla hooks specific to the shape of the data of your application.
The benefit is mostly for TypeScript users, and TypeScript is recommended.

```js
import React from 'react';
import { configure } from `oncilla/dist/react`;
const { create, useConnectivity, useCreate, useData, useMultipleData, useOncillaDebug, usePendingChanges } = configure({
  data: initialData,
  React: React
});
```

**The data parameter** to the `configure` call needs to be a skeleton of all of your data
as an object with data kinds as keys and a map of id to values as values.
In the example below, “bolts”, “nails” and “springs” are the kind names, they can be any strings
of your choosing, but they cannot change over the lifetime of the application.

```js
const initialData = {
  // Start with no bolts and no nails
  bolts: {},
  nails: {},
  // Start with one spring, id "s1"
  springs: { s1: { name: "Bouncy" } },
};
```

**If you use TypeScript**, you want to explicitly define the shape of your data,
as inferring from empty state is impossible:

```ts
type DataShape = {
  bolts: { name: string; diameter: number };
  nails: { name: string; sharpness: number };
  springs: { name: string };
};
configure<DataShape>({
  data: initialData,
  React: React,
});
```

### create

Creates an instance of Oncilla to handle your data.
Received from the `configure` call above.

```js
const { create } = configure(...);
import { makeDummyAdapter } from "oncilla";
const { db, withDB } = create({
  network: makeDummyAdapter(initialData),
  onError: err => {
    // Show an apologetic crash screen
  }
});
```

**The network parameter** describes how to synchronize your data to the backend.
See the available options in the Network adapters section.
