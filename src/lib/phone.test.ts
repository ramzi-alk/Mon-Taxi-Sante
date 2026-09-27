import { describe, expect, it } from "vitest";
import { FRENCH_PHONE_LOOKUP_PATTERN, phoneSearchDigits } from "./phone";

describe("phoneSearchDigits", () => {
  it("strips a leading 0", () => {
    expect(phoneSearchDigits("0612345678")).toBe("612345678");
  });

  it("strips a +33 prefix", () => {
    expect(phoneSearchDigits("+33612345678")).toBe("612345678");
  });

  it("strips a 0033 prefix", () => {
    expect(phoneSearchDigits("0033612345678")).toBe("612345678");
  });

  it("ignores spaces, dots and dashes", () => {
    expect(phoneSearchDigits("06 12 34 56 78")).toBe("612345678");
    expect(phoneSearchDigits("06.12.34.56.78")).toBe("612345678");
    expect(phoneSearchDigits("06-12-34-56-78")).toBe("612345678");
    expect(phoneSearchDigits("+33 6 12 34 56 78")).toBe("612345678");
  });

  it("handles partial numbers typed while searching", () => {
    expect(phoneSearchDigits("06 12")).toBe("612");
    expect(phoneSearchDigits("+3361")).toBe("61");
  });

  it("returns null for non phone-like terms", () => {
    expect(phoneSearchDigits("Dupont")).toBeNull();
    expect(phoneSearchDigits("AB12CD34")).toBeNull();
    expect(phoneSearchDigits("")).toBeNull();
  });

  it("returns null when nothing meaningful is left after stripping", () => {
    expect(phoneSearchDigits("0")).toBeNull();
    expect(phoneSearchDigits("+33")).toBeNull();
  });
});

describe("FRENCH_PHONE_LOOKUP_PATTERN", () => {
  const accepts = (value: string) => FRENCH_PHONE_LOOKUP_PATTERN.test(value);

  it("accepts a compact number in any of the three prefixes", () => {
    expect(accepts("0612345678")).toBe(true);
    expect(accepts("+33612345678")).toBe(true);
    expect(accepts("0033612345678")).toBe(true);
  });

  it("accepts spaces, dots or dashes between groups", () => {
    expect(accepts("06 12 34 56 78")).toBe(true);
    expect(accepts("06.12.34.56.78")).toBe(true);
    expect(accepts("06-12-34-56-78")).toBe(true);
    expect(accepts("+33 6 12 34 56 78")).toBe(true);
    expect(accepts("0033 6 12 34 56 78")).toBe(true);
  });

  it("rejects a number that is too short, too long, or not French", () => {
    expect(accepts("06123456")).toBe(false);
    expect(accepts("061234567890")).toBe(false);
    expect(accepts("+1 612 345 6789")).toBe(false);
  });

  it("rejects non-numeric input", () => {
    expect(accepts("Dupont")).toBe(false);
    expect(accepts("")).toBe(false);
  });
});
