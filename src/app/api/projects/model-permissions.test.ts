import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  currentUserMock,
  queryMock,
  connectMock,
  validateProjectModelMock,
  resolveModelMock,
} = vi.hoisted(() => ({
  currentUserMock: vi.fn(),
  queryMock: vi.fn(),
  connectMock: vi.fn(),
  validateProjectModelMock: vi.fn(),
  resolveModelMock: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  getCurrentUser: currentUserMock,
}));

vi.mock("@/lib/db", () => ({
  default: { connect: connectMock },
  query: queryMock,
}));

vi.mock("@/lib/ai-settings", () => ({
  validateProjectModel: validateProjectModelMock,
  resolveModel: resolveModelMock,
}));

import { POST as createProject } from "@/app/api/projects/route";
import { PUT as updateProject } from "@/app/api/projects/[id]/route";
import { POST as duplicateProject } from "@/app/api/projects/[id]/duplicate/route";

const user = { id: 42, email: "writer@example.com", is_admin: false };
const approvedModel = "anthropic/claude-sonnet-4.6";
const fallbackModel = "google/gemini-2.5-pro";

function jsonRequest(body: unknown, method = "POST") {
  return new Request("http://localhost/api/projects", {
    method,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function routeParams(id = "project-1") {
  return { params: Promise.resolve({ id }) };
}

describe("project model permission boundaries", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    currentUserMock.mockResolvedValue(user);
    connectMock.mockResolvedValue({
      query: vi.fn().mockResolvedValue({ rows: [] }),
      release: vi.fn(),
    });
  });

  it("rejects an unapproved model during project creation", async () => {
    validateProjectModelMock.mockRejectedValue(
      new Error("Das gewählte Modell ist nicht für dieses Projekt freigegeben."),
    );

    const response = await createProject(
      jsonRequest({ title: "Novel", ai_provider: "provider/arbitrary-model" }),
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({
      error: "Das gewählte Modell ist nicht für dieses Projekt freigegeben.",
    });
    expect(queryMock).not.toHaveBeenCalled();
  });

  it("saves the approved model selected during project creation", async () => {
    validateProjectModelMock.mockResolvedValue(approvedModel);
    queryMock.mockResolvedValue({
      rows: [{ id: "project-1", title: "Novel", ai_provider: approvedModel }],
    });

    const response = await createProject(
      jsonRequest({ title: "Novel", ai_provider: approvedModel }),
    );

    expect(response.status).toBe(200);
    expect((await response.json()).project.ai_provider).toBe(approvedModel);
    expect(queryMock.mock.calls[0][1]).toContain(approvedModel);
  });

  it("rejects an unapproved model during project update", async () => {
    queryMock.mockResolvedValueOnce({
      rows: [{ project_type: "novel", screenplay_format: null, ai_provider: approvedModel }],
    });
    validateProjectModelMock.mockRejectedValue(
      new Error("Das gewählte Modell ist nicht für dieses Projekt freigegeben."),
    );

    const response = await updateProject(
      jsonRequest({ ai_provider: "provider/arbitrary-model" }, "PUT"),
      routeParams(),
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({
      error: "Das gewählte Modell ist nicht für dieses Projekt freigegeben.",
    });
    expect(queryMock).toHaveBeenCalledTimes(1);
  });

  it("preserves an approved model during project update", async () => {
    queryMock
      .mockResolvedValueOnce({
        rows: [{ project_type: "novel", screenplay_format: null, ai_provider: fallbackModel }],
      })
      .mockResolvedValueOnce({
        rows: [{ id: "project-1", ai_provider: approvedModel }],
      });
    validateProjectModelMock.mockResolvedValue(approvedModel);

    const response = await updateProject(
      jsonRequest({ ai_provider: approvedModel }, "PUT"),
      routeParams(),
    );

    expect(response.status).toBe(200);
    expect((await response.json()).project.ai_provider).toBe(approvedModel);
    expect(queryMock.mock.calls[1][1]).toContain(approvedModel);
  });

  it("falls back to the current standard when duplicating a removed historical model", async () => {
    const clientQuery = vi.fn().mockImplementation(async (sql: string) => {
      if (sql.includes("SELECT * FROM projects")) {
        return {
          rows: [{
            id: "project-1",
            user_id: user.id,
            title: "Novel",
            ai_provider: "provider/removed-model",
            project_type: "novel",
            screenplay_format: null,
            screenplay_style_preset: null,
          }],
        };
      }
      if (sql.includes("INSERT INTO projects")) {
        return { rows: [{ id: "copy-1", ai_provider: fallbackModel }] };
      }
      return { rows: [] };
    });
    connectMock.mockResolvedValue({ query: clientQuery, release: vi.fn() });
    resolveModelMock.mockResolvedValue(fallbackModel);

    const response = await duplicateProject(new Request("http://localhost/api/projects/project-1"), routeParams());

    expect(response.status).toBe(200);
    expect((await response.json()).project.ai_provider).toBe(fallbackModel);
    expect(resolveModelMock).toHaveBeenCalledWith("provider/removed-model");
    const insertCall = clientQuery.mock.calls.find(([sql]) => sql.includes("INSERT INTO projects"));
    expect(insertCall?.[1]).toContain(fallbackModel);
  });
});