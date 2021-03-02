import React from "react";
import { makeDummyAdapter, makeWsProtocolAdapter } from "../dist";
import { configure } from "../dist/react";

const {
  create,
  useConnectivity,
  useCreate,
  useData,
  useMultipleData,
  useOncillaDebug,
  usePendingChanges,
} = configure({
  data: {
    things: {},
  },
  React,
});

const network = makeWsProtocolAdapter({
  url: "ws://localhost:8091/",
});

const { db } = create({
  network: network.adapter,
  onError: (err) => {
    throw err;
  },
});

db._internals.events.on("change", function (c) {
  console.log(
    "change",
    c[0],
    c[1],
    JSON.stringify(db._internals.canonData[c[0]][c[1]].value)
  );
});

console.log("connectivity", db.connectivity());
db._internals.events.on("connectivity-changed", () => {
  console.log("connectivity", db.connectivity());
});

db.observe("things", "thing1");
