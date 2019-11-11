import ava, { ExecutionContext } from "ava";

import { Connectivity } from "../types";
import { sync as makeSync } from "./index";

function test(
  name: string,
  cb: (
    t: ExecutionContext<{}>,
    sync: { get: () => Connectivity; set: (c: Connectivity) => void }
  ) => Promise<void>
) {
  ava(name, t => {
    let onConnectivityChange: (c: Connectivity) => void = () => {};
    const s = makeSync({
      canonData: {},
      network: params => {
        onConnectivityChange = params.onConnectivityChange;
        return {} as any;
      },
      onChange: () => {},
      onConnectivityChange: () => {},
      onError: err => t.fail(err.message),
      shouldCrashWrites: () => false
    });
    return cb(t, {
      get: s.connectivity,
      set: onConnectivityChange
    });
  });
}

test("should switch connectivity", async (t, sync) => {
  t.is(sync.get(), "connecting");
  sync.set("online");
  t.is(sync.get(), "online");
  sync.set("offline");
  t.is(sync.get(), "offline");
});
