import { describe, expect, it } from "vitest";

import { breakpointForWidth } from "./useBreakpoint";

describe("breakpointForWidth", () => {
  it("classifies widths into breakpoints", () => {
    expect(breakpointForWidth(375)).toBe("mobile");
    expect(breakpointForWidth(800)).toBe("tablet");
    expect(breakpointForWidth(1440)).toBe("desktop");
    expect(breakpointForWidth(767)).toBe("mobile");
    expect(breakpointForWidth(1024)).toBe("desktop");
  });
});
