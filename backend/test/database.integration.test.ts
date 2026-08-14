import pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { DatabasePool } from "../src/db.js";
import type { IntakeExtraction } from "../src/domain.js";
import { ExtractionJobStore, PostgresIntakeStore } from "../src/intake-store.js";

const databaseUrl = process.env.TEST_DATABASE_URL;
const describeWithDatabase = databaseUrl === undefined ? describe.skip : describe;
const { Pool } = pg;

describeWithDatabase("PostgreSQL intake pipeline", () => {
  let pool: DatabasePool;
  let intakeStore: PostgresIntakeStore;
  let jobStore: ExtractionJobStore;

  beforeAll(() => {
    pool = new Pool({ connectionString: databaseUrl });
    intakeStore = new PostgresIntakeStore(pool, 3);
    jobStore = new ExtractionJobStore(pool, 600);
  });

  afterAll(async () => {
    await pool.end();
  });

  it("persists, claims, and completes an intake atomically", async () => {
    const submitted = await intakeStore.createIntake({
      source: "integration-test",
      externalReference: "integration-call-001",
      transcript: [
        { speaker: "Agent", text: "What happened?" },
        { speaker: "Caller", text: "I was rear-ended and went to Central Hospital." },
      ],
    });

    expect(submitted.created).toBe(true);
    expect(submitted.intake.status).toBe("received");

    const duplicate = await intakeStore.createIntake({
      source: "integration-test",
      externalReference: "integration-call-001",
      transcript: "This duplicate should not create another intake.",
    });

    expect(duplicate.created).toBe(false);
    expect(duplicate.intake.id).toBe(submitted.intake.id);

    const job = await jobStore.claimNext("integration-worker");
    expect(job?.intakeId).toBe(submitted.intake.id);
    if (job === null) {
      throw new Error("Expected an extraction job");
    }

    await jobStore.complete(job, extractionFixture, "integration-model");

    const result = await intakeStore.getResult(submitted.intake.id);
    expect(result?.intake.status).toBe("completed");
    expect(result?.client).toMatchObject({ firstName: "Taylor", lastName: "Jones" });
    expect(result?.incident).toMatchObject({ incidentType: "auto_collision" });
    expect(result?.defendants).toHaveLength(1);
    expect(result?.insurancePolicies).toHaveLength(1);
    expect(result?.treatments).toHaveLength(1);
    expect(result?.policeReport).toMatchObject({ reportNumber: "APD-1234" });
    expect(result?.witnesses).toHaveLength(1);
  });
});

const extractionFixture: IntakeExtraction = {
  client: {
    firstName: "Taylor",
    lastName: "Jones",
    phone: "512-555-0100",
    email: null,
    dateOfBirth: null,
  },
  incident: {
    incidentType: "auto_collision",
    occurredAtIso: "2026-08-08T15:00:00-05:00",
    occurredAtText: "last Friday",
    location: "Austin, Texas",
    description: "Rear-end collision",
  },
  defendants: [
    {
      firstName: "Jordan",
      lastName: "Smith",
      phone: null,
      vehicleDescription: "Blue sedan",
      allegedFault: "Caller reports that the other driver rear-ended them.",
    },
  ],
  insurancePolicies: [
    {
      ownerType: "defendant",
      ownerDefendantIndex: 0,
      insuranceType: "auto",
      carrierName: "State Farm",
      policyNumber: null,
      coverageStatus: "reported",
      policyLimit: null,
    },
  ],
  treatments: [
    {
      provider: {
        name: "Central Hospital",
        providerType: "hospital",
        phone: null,
        address: null,
      },
      treatedAtIso: null,
      treatmentType: "emergency_room",
      diagnosis: "concussion",
      notes: null,
      billedAmount: null,
    },
  ],
  servicesRendered: [],
  policeReport: {
    agencyName: "Austin Police Department",
    reportNumber: "APD-1234",
    officerName: null,
    reportStatus: "mentioned",
    notes: null,
  },
  witnesses: [
    {
      firstName: "Casey",
      lastName: null,
      phone: null,
      email: null,
      statementSummary: "Observed the rear-end collision.",
    },
  ],
};
