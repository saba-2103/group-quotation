import { describe, it, expect } from "vitest";
import * as types from "./types";
import * as graph from "./graph";
import * as expr from "./expr";
import * as api from "./api";
import * as hydrate from "./hydrate";
import * as actions from "./actions";
import * as workflow from "./workflow";
import * as render from "./render";
import * as errors from "./errors";

describe("runtime scaffold", () => {
  it.each([
    ["types", types],
    ["graph", graph],
    ["expr", expr],
    ["api", api],
    ["hydrate", hydrate],
    ["actions", actions],
    ["workflow", workflow],
    ["render", render],
    ["errors", errors],
  ])("%s sub-module resolves", (_name, mod) => {
    expect(mod).toBeDefined();
  });
});
