import { describe, it, expect } from "vitest";
import * as runtime from "./index";

describe("runtime scaffold", () => {
  it("exports without error", () => {
    expect(runtime).toBeDefined();
  });
});
