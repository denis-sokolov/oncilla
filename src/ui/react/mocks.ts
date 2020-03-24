import type { ExecutionContext } from "ava";
import React from "react";
import { configure } from "./configure";
import type { Data } from "../../core";
import { makeDummyAdapter, makeWindowMock } from "../mocks";

export function build<D extends Data<any>>(t: ExecutionContext, data: D) {
  type Domain = D extends Data<infer X> ? X : never;
  const react = makeReactMock();
  const configured = configure<Domain>({
    data: data,
    React: react,
  });
  const { db } = configured.create({
    network: makeDummyAdapter<Domain>(data),
    onError: (err) => t.fail(err.message),
    window: makeWindowMock(),
  });
  react._setContextValue(db);
  return configured;
}

export function makeReactMock() {
  let contextValue = "missing-provider";
  const reactStub: typeof React = {
    ...React,
    createContext: () => ({} as any),
    useCallback: (f) => f,
    useContext: () => contextValue as any,
    useEffect: () => {},
    useReducer: (_: any, state: any) => [state, () => {}] as any,
  };
  return {
    ...reactStub,
    _setContextValue: (val: any) => {
      contextValue = val;
    },
  };
}
