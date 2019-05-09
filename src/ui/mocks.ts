export function makeWindowMock(): Window {
  const overrides: Partial<Window> = {
    addEventListener: () => {}
  };
  return overrides as Window;
}

export { networkMock } from "../network/mocks";
