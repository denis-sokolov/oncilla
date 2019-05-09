import { NetworkAdapter } from "./types";

export const networkMock: NetworkAdapter<any> = function() {
  return {
    getAndObserve: () => () => {},
    push: () => {}
  };
};
