import { FullDB } from "../../core";
import { ReactType } from "./types";

type Params = {
  React: ReactType;
};

export function createContext<Domain>(params: Params) {
  const { React } = params;
  const Context = React.createContext<FullDB<Domain> | "missing-provider">(
    "missing-provider"
  );

  return {
    Provider: Context.Provider,
    useTryDB: function (): FullDB<Domain> | "missing-provider" {
      return React.useContext(Context);
    },
  };
}
