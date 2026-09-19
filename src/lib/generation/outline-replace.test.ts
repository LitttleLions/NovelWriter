import { describe, expect, it, vi } from "vitest";

const withTransactionMock = vi.fn();

vi.mock("@/lib/db", () => ({
  withTransaction: withTransactionMock,
}));

import { replaceProjectOutline } from "@/lib/generation/outline-replace";

describe("replaceProjectOutline", () => {
  it("does not delete existing rows when the new outline is empty", async () => {
    await expect(replaceProjectOutline("1", [], () => null)).rejects.toThrow(/unverändert/);
    expect(withTransactionMock).not.toHaveBeenCalled();
  });
});
