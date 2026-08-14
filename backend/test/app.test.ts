import { describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import type { AppConfig } from "../src/config.js";
import type { DatabasePool } from "../src/db.js";
import type { CreatedIntake, CreateIntakeInput, IntakeSummary, StoredTranscript } from "../src/domain.js";
import type { IntakeResult, IntakeStore } from "../src/intake-store.js";

const intake: IntakeSummary = {
  id: "2fdd8754-5a63-4e96-b8f8-f54e24f90ae7",
  source: "api",
  externalReference: null,
  status: "received",
  normalizedAt: null,
  failureReason: null,
  createdAt: "2026-08-14T12:00:00.000Z",
  updatedAt: "2026-08-14T12:00:00.000Z",
};

class FakeIntakeStore implements IntakeStore {
  createIntake(input: CreateIntakeInput): Promise<CreatedIntake> {
    void input;
    return Promise.resolve({ intake, created: true });
  }

  getIntake(id: string): Promise<IntakeSummary | null> {
    return Promise.resolve(id === intake.id ? intake : null);
  }

  getTranscript(id: string): Promise<StoredTranscript | null> {
    return Promise.resolve(
      id === intake.id ? { format: "text", text: "Caller transcript" } : null,
    );
  }

  getResult(id: string): Promise<IntakeResult | null> {
    return Promise.resolve(id === intake.id
      ? {
          intake,
          client: null,
          incident: null,
          defendants: [],
          insurancePolicies: [],
          treatments: [],
          servicesRendered: [],
          policeReport: null,
          witnesses: [],
        }
      : null);
  }
}

const config: AppConfig = {
  nodeEnv: "test",
  host: "127.0.0.1",
  port: 3001,
  databaseUrl: "postgresql://unused",
  databaseSsl: false,
  corsOrigins: ["http://localhost:5173"],
  openAiApiKey: undefined,
  openAiModel: "test-model",
  workerPollIntervalMs: 1000,
  workerJobTimeoutSeconds: 600,
  workerMaxAttempts: 3,
};

const pool = {
  query: () => Promise.resolve({ rows: [{ "?column?": 1 }] }),
} as unknown as DatabasePool;

describe("intake API", () => {
  it("persists a submitted intake", async () => {
    const app = await createApp({ config, pool, intakeStore: new FakeIntakeStore() });
    const response = await app.inject({
      method: "POST",
      url: "/api/intakes",
      payload: { transcript: "Caller: I was rear-ended." },
    });

    expect(response.statusCode).toBe(202);
    expect(response.headers.location).toBe(`/api/intakes/${intake.id}`);
    expect(response.json()).toMatchObject({ id: intake.id, status: "received", created: true });
    await app.close();
  });

  it("rejects an invalid transcript", async () => {
    const app = await createApp({ config, pool, intakeStore: new FakeIntakeStore() });
    const response = await app.inject({
      method: "POST",
      url: "/api/intakes",
      payload: { transcript: "" },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({ error: "invalid_request" });
    await app.close();
  });

  it("returns intake status", async () => {
    const app = await createApp({ config, pool, intakeStore: new FakeIntakeStore() });
    const response = await app.inject({
      method: "GET",
      url: `/api/intakes/${intake.id}/status`,
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      id: intake.id,
      status: "received",
      normalizedAt: null,
      failureReason: null,
    });
    await app.close();
  });
});
