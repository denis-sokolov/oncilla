# Oncilla core

You need to work with Oncilla core if you’re not using React. If you use React, use [Oncilla React tools](./react.md).

**Unstable names!** The core API is all there, but the names of the functions and imports are subject to change.

## Create store

```js
// Import paths are subject to change
import { create } from "oncilla/core";
const store = create({
  network: myNetworkAdapter(),
  onError: error => showUserCrashScreen(error)
});
```

## Data access

### Mark values as relevant

First of all, you need to inform the store and the server that you are interested in particular data.

`observe` will mark a particular kind-id pair as one you’re interested in:

```jsx
const cancelObserving = store.observe(kind, id);
```

You can later decide you you’re not interested in particular data by calling `cancelObserving()`.

### Create and update values

Creating and updating values in the store is a synchronous operation that does not return anything.

```jsx
store.create(kind, id, value);
store.update(kind, id, prev => updated);
```

### Read values

Most of the time you want to read the data as optimistic UI with pending transactions applied:

```jsx
// API subject to change
const optimisticData = db._internals.withPendingTransactions(
  db._internals.canonData
);
console.log(optimisticData[kind][id]);
```

If you want to retrieve only the data that is considered canon, that is, fully synced and confirmed with the server, read canonData directly:

```jsx
// API subject to change
store._internals.canonData;
```

Beware, you are not allowed to mutate the canonData value.

### Value change event

```jsx
// API subject to change
db._internals.events.on("change", function([kind, id]) {
  //
});
```

## Other

### connectivity

```jsx
// "online" | "connecting" | "offline" | "crashed"
const status = db.connectivity();

// API subject to change
db._internals.events.on("connectivity-changed", () => {});
```

### debugConfig

```jsx
// API subject to change
db._internals.debugConfig.failingWrites = true;
db._internals.debugConfig.pretendOffline = true;
db._internals.debugConfig.optimisticUIEnabled = false;
```

### pendingTransactionCount

Always know how much work is unsaved:

```jsx
// API subject to change
db._internals.pendingTransactionCount;
db._internals.events.on("pending-transaction-count-changed", () => {});
```
