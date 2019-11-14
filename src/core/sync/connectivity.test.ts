import ava, { ExecutionContext } from "ava";

import { Connectivity } from "../types";
import { sync as makeSync } from "./index";

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

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
});

test("should not switch connectivity to offline immediately", async (t, sync) => {
  sync.set("online");
  sync.set("offline");
  t.is(sync.get(), "online");
});

test("should switch connectivity to offline after a bit", async (t, sync) => {
  sync.set("online");
  sync.set("offline");
  await sleep(1000);
  t.is(sync.get(), "offline");
});

test("should not switch connectivity to online too early", async (t, sync) => {
  sync.set("offline");
  await sleep(1000);
  t.is(sync.get(), "offline");
  sync.set("online");
  t.is(sync.get(), "offline");
});

test("should not switch connectivity to online after bouncing", async (t, sync) => {
  sync.set("offline");
  await sleep(1000);
  sync.set("online");
  await sleep(500);
  sync.set("offline");
  await sleep(100);
  sync.set("online");
  await sleep(500);
  t.is(sync.get(), "offline");
});

test("connectivity should respect latest online state after bouncing", async (t, sync) => {
  sync.set("offline");
  await sleep(1000);
  t.is(sync.get(), "offline");
  sync.set("online");
  await sleep(500);
  t.is(sync.get(), "offline");
  sync.set("connecting");
  await sleep(500);
  t.is(sync.get(), "connecting");
});
