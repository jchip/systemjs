"use strict";

const { load, exec, serial } = require("@xarc/run");

load({
  clean: exec("rimraf dist"),

  typecheck: exec("tsc --noEmit"),

  "build:rollup": exec("rollup -c"),
  "build:node": exec("node scripts/build-node.mjs"),
  build: serial("build:rollup", "build:node"),

  footprint: serial("build", exec("node scripts/footprint.mjs")),

  "test:browser": exec("node test/server.mjs"),
  "test:browser:watch": serial("build", exec({
    cmd: "node test/server.mjs",
    env: { WATCH_MODE: "true" }
  })),
  "test:internal": exec({
    cmd: "mocha -b test/import-map.mjs test/system-core.mjs test/url-resolution.mjs",
    env: { NODE_OPTIONS: "--unhandled-rejections=none --import tsx" }
  }),
  "test:node": exec("mocha --timeout 5000 -b test/system-node.mjs"),

  test: serial("build", "test:browser", "test:internal", "test:node")
});
