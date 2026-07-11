import { normalizeContact } from "./contact";

describe("normalizeContact", () => {
  it("maps different phone spellings to one canonical E.164 form", () => {
    const expected = "+79990000101";
    expect(normalizeContact("phone", "+79990000101")).toBe(expected);
    expect(normalizeContact("phone", "79990000101")).toBe(expected);
    expect(normalizeContact("phone", "89990000101")).toBe(expected);
    expect(normalizeContact("phone", " +7 (999) 000-01-01 ")).toBe(expected);
  });

  it("lowercases and trims emails", () => {
    expect(normalizeContact("email", "  User@Example.COM ")).toBe("user@example.com");
  });
});
