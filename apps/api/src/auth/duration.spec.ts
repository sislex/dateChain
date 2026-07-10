import { parseDurationMs } from "./duration";

describe("parseDurationMs", () => {
  it.each([
    ["15m", 900_000],
    ["30d", 2_592_000_000],
    ["3600s", 3_600_000],
    ["12h", 43_200_000],
    ["500ms", 500],
  ])("parses %s", (input, expected) => {
    expect(parseDurationMs(input)).toBe(expected);
  });

  it("throws on invalid input", () => {
    expect(() => parseDurationMs("banana")).toThrow(/Invalid duration/);
  });
});
