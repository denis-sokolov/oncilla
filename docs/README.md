# Starting guide

Oncilla DB is flexible to avoid locking you down in any technology or architecture choices as much as possible. The downside of this is a more involved configuration process.

Install Oncilla DB from npm registry with `npm install --save oncilla`.

Configure Oncilla DB for your data kinds. Data kinds are synchronized atomically, and in full. For an example, for a to-do app the kinds would be tasks and tags. Configure with empty objects for every key. You also need to provide your instance of React for Oncilla to generate hooks specific to your application.

```js
import { configure } from "oncilla";
const { create } = configure({
  data: {
    categories: {},
    tasks: {}
  },
  React
});
```

If you use TypeScript, add a TypeScript type to help the compiler catch typing errors. (The values of the generic parameter object are singular, confusingly)

```ts
configure<{ categories: Category; tasks: Task }>({
  data: { categories: {}, tasks: {} }
});
```

Then create an adapter that will save your data. To begin with, you can start with a dummy one that does not actually talk to a real server. In the code below a1 and a2 are ids of the items that will help the server know which items to update. The “singleton” is a special id for when there is always only one particular instance of a kind.

```js
import { makeDummyAdapter } from "oncilla";
const network = makeDummyAdapter({
  categories: { singleton: ["home", "studies", "fun"] },
  tasks: {
    a1: { title: "Buy milk", category: "home" },
    a2: { title: "Learn next chapter", category: "studies" }
  }
});
```

Now include your database in the UI. React is the primary way to use Oncilla, but you can also integrate with another view system.

```jsx
const { withDB } = create({ network: network });
ReactDOM.render(withDB(<App />));
```

Now you can use the data access hooks in your components, as shown in the [main readme](../README.md).

When you decide to move forward with the real network implementation, see [the networking docs](network/README.md).
