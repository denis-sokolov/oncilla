import test from "ava";
import React from "react";

import { configure } from "./configure";
import { NetworkAdapter } from "./network";

function makeReactStub() {
  let contextValue = "missing-provider";
  const reactStub: typeof React = {
    ...React,
    createContext: () => ({} as any),
    useCallback: f => f,
    useContext: () => contextValue as any,
    useEffect: () => {},
    useReducer: (_: any, state: any) => [state, () => {}] as any
  };
  return {
    ...reactStub,
    _setContextValue: (val: any) => {
      contextValue = val;
    }
  };
}

function makeWindowStub(): Window {
  const overrides: Partial<Window> = {
    addEventListener: () => {}
  };
  return overrides as Window;
}

const makeNetworkStub: NetworkAdapter<any> = function() {
  return {
    getAndObserve: () => () => {},
    push: () => {}
  };
};

test("sanity react test", t => {
  const react = makeReactStub();
  const { create, useData } = configure({
    data: { task: { "1": { revision: "1", value: "Buy milk" } } },
    React: react
  });
  const { db } = create({
    network: makeNetworkStub,
    onError: err => t.fail(err.message),
    window: makeWindowStub()
  });
  react._setContextValue(db);
  const [task, updateTask] = useData("task", "1");
  t.is(task, "Buy milk");
  t.is(typeof updateTask, "function");
});
