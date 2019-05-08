import React from "react";

export function makeReactMock() {
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

export { makeWindowMock, networkMock } from "../mocks";
