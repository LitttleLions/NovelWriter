import { beforeEach, describe, expect, it, vi } from "vitest";

const { currentUserMock, queryMock } = vi.hoisted(() => ({
  currentUserMock: vi.fn(),
  queryMock: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  getCurrentUser: currentUserMock,
}));

vi.mock("@/lib/db", () => ({
  query: queryMock,
}));

import { DELETE as deleteChapter } from "@/app/api/projects/[id]/chapters/[chapterId]/route";
import { PUT as putOutlineCharacters } from "@/app/api/projects/[id]/outline/[outlineId]/characters/route";

const owner = { id: 7, email: "owner@example.com", is_admin: false };

function jsonRequest(body: unknown, method = "PUT") {
  return new Request("http://localhost/api/test", {
    method,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("chapter and outline object authorization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    currentUserMock.mockResolvedValue(owner);
  });

  it("does not delete a chapter when the project is not owned", async () => {
    queryMock.mockResolvedValueOnce({ rows: [] });

    const response = await deleteChapter(jsonRequest({}, "DELETE"), {
      params: Promise.resolve({ id: "99", chapterId: "1" }),
    });

    expect(response.status).toBe(404);
    expect(queryMock).toHaveBeenCalledTimes(1);
    expect(String(queryMock.mock.calls[0][0])).toMatch(/FROM projects/i);
    expect(queryMock.mock.calls.some((call: unknown[]) => String(call[0]).includes("DELETE FROM chapters"))).toBe(false);
  });

  it("deletes only after project ownership is confirmed", async () => {
    queryMock
      .mockResolvedValueOnce({ rows: [{ id: 99 }] })
      .mockResolvedValueOnce({ rows: [{ id: 1 }] });

    const response = await deleteChapter(jsonRequest({}, "DELETE"), {
      params: Promise.resolve({ id: "99", chapterId: "1" }),
    });

    expect(response.status).toBe(200);
    expect(String(queryMock.mock.calls[1][0])).toMatch(/DELETE FROM chapters/);
  });

  it("rejects outline-character writes when the outline is not in the owned project", async () => {
    queryMock
      .mockResolvedValueOnce({ rows: [{ id: 5 }] })
      .mockResolvedValueOnce({ rows: [] });

    const response = await putOutlineCharacters(
      jsonRequest({ character_ids: [12] }),
      { params: Promise.resolve({ id: "5", outlineId: "777" }) },
    );

    expect(response.status).toBe(404);
    expect(queryMock.mock.calls.some((call: unknown[]) => String(call[0]).includes("DELETE FROM outline_characters"))).toBe(false);
  });
});
