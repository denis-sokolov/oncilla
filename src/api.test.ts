import test from "ava";

import { makeDummyAdapter, makeWsProtocolAdapter } from ".";
import { configure } from "./react";
import { runMemoryServer, runWebsocketServer } from "./server";

test("react is exposed", (t) => {
  t.is(typeof configure, "function");
});

test("network adapters are exposed", (t) => {
  t.is(typeof makeDummyAdapter, "function");
  t.is(typeof makeWsProtocolAdapter, "function");
});

test("in-memory server is exposed", (t) => {
  t.is(typeof runMemoryServer, "function");
});

test("custom web socket server is exposed", (t) => {
  t.is(typeof runWebsocketServer, "function");
});
