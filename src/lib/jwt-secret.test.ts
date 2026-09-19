import { afterEach, describe, expect, it } from "vitest";
import { getJwtSecretBytes } from "@/lib/jwt-secret";

describe("JWT secret", () => {
  const previous = process.env.JWT_SECRET;

  afterEach(() => {
    if (previous === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = previous;
  });

  it("throws when JWT_SECRET is missing", () => {
    delete process.env.JWT_SECRET;
    expect(() => getJwtSecretBytes()).toThrow(/JWT_SECRET is not set/);
  });

  it("throws when JWT_SECRET is blank", () => {
    process.env.JWT_SECRET = "   ";
    expect(() => getJwtSecretBytes()).toThrow(/JWT_SECRET is not set/);
  });

  it("returns bytes for a configured secret", () => {
    process.env.JWT_SECRET = "unit-test-secret";
    const bytes = getJwtSecretBytes();
    expect(bytes.length).toBeGreaterThan(0);
  });
});
