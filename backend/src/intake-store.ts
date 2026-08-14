import type { DatabaseClient, DatabasePool } from "./db.js";
import { withTransaction } from "./db.js";
import type {
  CreatedIntake,
  CreateIntakeInput,
  ExtractionJob,
  IntakeExtraction,
  IntakeSummary,
  StoredTranscript,
} from "./domain.js";
import { normalizeTranscript } from "./domain.js";

type IntakeRow = {
  id: string;
  source: string;
  external_reference: string | null;
  status: IntakeSummary["status"];
  normalized_at: Date | null;
  failure_reason: string | null;
  created_at: Date;
  updated_at: Date;
};

type IntakeWithTranscriptRow = IntakeRow & {
  raw_transcript: StoredTranscript;
};

type ClaimedJobRow = {
  id: string;
  intake_id: string;
  attempts: number;
  max_attempts: number;
  raw_transcript: StoredTranscript;
};

export type IntakeResult = {
  intake: IntakeSummary;
  client: Record<string, unknown> | null;
  incident: Record<string, unknown> | null;
  defendants: Record<string, unknown>[];
  insurancePolicies: Record<string, unknown>[];
  treatments: Record<string, unknown>[];
  servicesRendered: Record<string, unknown>[];
  policeReport: Record<string, unknown> | null;
  witnesses: Record<string, unknown>[];
};

export interface IntakeStore {
  createIntake(input: CreateIntakeInput): Promise<CreatedIntake>;
  getIntake(id: string): Promise<IntakeSummary | null>;
  getTranscript(id: string): Promise<StoredTranscript | null>;
  getResult(id: string): Promise<IntakeResult | null>;
}

export class PostgresIntakeStore implements IntakeStore {
  readonly #pool: DatabasePool;
  readonly #workerMaxAttempts: number;

  constructor(pool: DatabasePool, workerMaxAttempts: number) {
    this.#pool = pool;
    this.#workerMaxAttempts = workerMaxAttempts;
  }

  async createIntake(input: CreateIntakeInput): Promise<CreatedIntake> {
    return withTransaction(this.#pool, async (client) => {
      const transcript = normalizeTranscript(input.transcript);
      const values = [
        input.source,
        input.externalReference ?? null,
        JSON.stringify(transcript),
      ];

      const inserted = await client.query<IntakeRow>(
        `
          INSERT INTO intakes (source, external_reference, raw_transcript)
          VALUES ($1, $2, $3::jsonb)
          ON CONFLICT (external_reference)
            WHERE external_reference IS NOT NULL
          DO NOTHING
          RETURNING *
        `,
        values,
      );

      const insertedIntake = inserted.rows[0];
      if (insertedIntake !== undefined) {
        await client.query(
          `
            INSERT INTO extraction_jobs (intake_id, max_attempts)
            VALUES ($1, $2)
          `,
          [insertedIntake.id, this.#workerMaxAttempts],
        );

        return { intake: mapIntakeRow(insertedIntake), created: true };
      }

      if (input.externalReference === undefined) {
        throw new Error("Intake insert did not return a row");
      }

      const existing = await client.query<IntakeRow>(
        "SELECT * FROM intakes WHERE external_reference = $1",
        [input.externalReference],
      );
      const existingIntake = existing.rows[0];
      if (existingIntake === undefined) {
        throw new Error("Conflicting intake could not be loaded");
      }

      return { intake: mapIntakeRow(existingIntake), created: false };
    });
  }

  async getIntake(id: string): Promise<IntakeSummary | null> {
    const result = await this.#pool.query<IntakeRow>(
      "SELECT * FROM intakes WHERE id = $1",
      [id],
    );
    const row = result.rows[0];
    return row === undefined ? null : mapIntakeRow(row);
  }

  async getTranscript(id: string): Promise<StoredTranscript | null> {
    const result = await this.#pool.query<Pick<IntakeWithTranscriptRow, "raw_transcript">>(
      "SELECT raw_transcript FROM intakes WHERE id = $1",
      [id],
    );
    return result.rows[0]?.raw_transcript ?? null;
  }

  async getResult(id: string): Promise<IntakeResult | null> {
    const intake = await this.getIntake(id);
    if (intake === null) {
      return null;
    }

    const [client, incident, defendants, policies, treatments, services, report, witnesses] =
      await Promise.all([
        this.#pool.query<Record<string, unknown>>(
          `
            SELECT id, first_name AS "firstName", last_name AS "lastName", phone,
                   email, date_of_birth AS "dateOfBirth"
            FROM clients WHERE intake_id = $1
          `,
          [id],
        ),
        this.#pool.query<Record<string, unknown>>(
          `
            SELECT id, client_id AS "clientId", incident_type AS "incidentType",
                   occurred_at AS "occurredAt", occurred_at_text AS "occurredAtText",
                   location, description
            FROM incidents WHERE intake_id = $1
          `,
          [id],
        ),
        this.#pool.query<Record<string, unknown>>(
          `
            SELECT d.id, d.first_name AS "firstName", d.last_name AS "lastName",
                   d.phone, d.vehicle_description AS "vehicleDescription",
                   d.alleged_fault AS "allegedFault"
            FROM defendants d
            JOIN incidents i ON i.id = d.incident_id
            WHERE i.intake_id = $1
            ORDER BY d.created_at, d.id
          `,
          [id],
        ),
        this.#pool.query<Record<string, unknown>>(
          `
            SELECT p.id, p.client_id AS "clientId", p.defendant_id AS "defendantId",
                   p.insurance_type AS "insuranceType", p.carrier_name AS "carrierName",
                   p.policy_number AS "policyNumber", p.coverage_status AS "coverageStatus",
                   p.policy_limit AS "policyLimit"
            FROM insurance_policies p
            JOIN incidents i ON i.id = p.incident_id
            WHERE i.intake_id = $1
            ORDER BY p.created_at, p.id
          `,
          [id],
        ),
        this.#pool.query<Record<string, unknown>>(
          `
            SELECT t.id, t.treated_at AS "treatedAt", t.treatment_type AS "treatmentType",
                   t.diagnosis, t.notes, t.billed_amount AS "billedAmount",
                   jsonb_build_object(
                     'id', p.id,
                     'name', p.name,
                     'providerType', p.provider_type,
                     'phone', p.phone,
                     'address', p.address
                   ) AS provider
            FROM treatments t
            JOIN incidents i ON i.id = t.incident_id
            JOIN providers p ON p.id = t.provider_id
            WHERE i.intake_id = $1
            ORDER BY t.created_at, t.id
          `,
          [id],
        ),
        this.#pool.query<Record<string, unknown>>(
          `
            SELECT s.id, s.service_type AS "serviceType", s.rendered_at AS "renderedAt",
                   s.notes, s.billed_amount AS "billedAmount",
                   jsonb_build_object(
                     'id', c.id,
                     'name', c.name,
                     'contactType', c.contact_type,
                     'phone', c.phone,
                     'address', c.address
                   ) AS contact
            FROM services_rendered s
            JOIN incidents i ON i.id = s.incident_id
            JOIN contacts c ON c.id = s.contact_id
            WHERE i.intake_id = $1
            ORDER BY s.created_at, s.id
          `,
          [id],
        ),
        this.#pool.query<Record<string, unknown>>(
          `
            SELECT p.id, p.agency_name AS "agencyName", p.report_number AS "reportNumber",
                   p.officer_name AS "officerName", p.report_status AS "reportStatus", p.notes
            FROM police_reports p
            JOIN incidents i ON i.id = p.incident_id
            WHERE i.intake_id = $1
          `,
          [id],
        ),
        this.#pool.query<Record<string, unknown>>(
          `
            SELECT w.id, w.first_name AS "firstName", w.last_name AS "lastName",
                   w.phone, w.email, w.statement_summary AS "statementSummary"
            FROM witnesses w
            JOIN incidents i ON i.id = w.incident_id
            WHERE i.intake_id = $1
            ORDER BY w.created_at, w.id
          `,
          [id],
        ),
      ]);

    return {
      intake,
      client: client.rows[0] ?? null,
      incident: incident.rows[0] ?? null,
      defendants: defendants.rows,
      insurancePolicies: policies.rows,
      treatments: treatments.rows,
      servicesRendered: services.rows,
      policeReport: report.rows[0] ?? null,
      witnesses: witnesses.rows,
    };
  }
}

export class ExtractionJobStore {
  readonly #pool: DatabasePool;
  readonly #jobTimeoutSeconds: number;

  constructor(pool: DatabasePool, jobTimeoutSeconds: number) {
    this.#pool = pool;
    this.#jobTimeoutSeconds = jobTimeoutSeconds;
  }

  async claimNext(workerId: string): Promise<ExtractionJob | null> {
    return withTransaction(this.#pool, async (client) => {
      const claimed = await client.query<ClaimedJobRow>(
        `
          WITH candidate AS (
            SELECT j.id
            FROM extraction_jobs j
            WHERE j.attempts < j.max_attempts
              AND (
                (j.status = 'pending' AND j.available_at <= now())
                OR (
                  j.status = 'processing'
                  AND j.locked_at < now() - ($1::text || ' seconds')::interval
                )
              )
            ORDER BY j.available_at, j.created_at
            FOR UPDATE SKIP LOCKED
            LIMIT 1
          )
          UPDATE extraction_jobs j
          SET status = 'processing',
              attempts = j.attempts + 1,
              locked_at = now(),
              locked_by = $2,
              last_error = NULL
          FROM candidate c, intakes i
          WHERE j.id = c.id
            AND i.id = j.intake_id
          RETURNING j.id, j.intake_id, j.attempts, j.max_attempts, i.raw_transcript
        `,
        [this.#jobTimeoutSeconds, workerId],
      );

      const job = claimed.rows[0];
      if (job === undefined) {
        return null;
      }

      await client.query(
        "UPDATE intakes SET status = 'processing', failure_reason = NULL WHERE id = $1",
        [job.intake_id],
      );

      return {
        id: job.id,
        intakeId: job.intake_id,
        attempts: job.attempts,
        maxAttempts: job.max_attempts,
        transcript: job.raw_transcript,
      };
    });
  }

  async complete(
    job: ExtractionJob,
    extraction: IntakeExtraction,
    model: string,
  ): Promise<void> {
    validateExtractionRelationships(extraction);

    await withTransaction(this.#pool, async (client) => {
      const clientId = await insertClient(client, job.intakeId, extraction);
      const incidentId = await insertIncident(client, job.intakeId, clientId, extraction);
      const defendantIds = await insertDefendants(client, incidentId, extraction);

      await insertInsurancePolicies(
        client,
        incidentId,
        clientId,
        defendantIds,
        extraction,
      );
      await insertTreatments(client, incidentId, clientId, extraction);
      await insertServices(client, incidentId, clientId, extraction);
      await insertPoliceReport(client, incidentId, extraction);
      await insertWitnesses(client, incidentId, extraction);

      await client.query(
        `
          UPDATE extraction_jobs
          SET status = 'succeeded', model = $2, raw_output = $3::jsonb,
              locked_at = NULL, locked_by = NULL, last_error = NULL
          WHERE id = $1
        `,
        [job.id, model, JSON.stringify(extraction)],
      );
      await client.query(
        `
          UPDATE intakes
          SET status = 'completed', normalized_at = now(), failure_reason = NULL
          WHERE id = $1
        `,
        [job.intakeId],
      );
    });
  }

  async fail(job: ExtractionJob, error: unknown): Promise<void> {
    const message = safeErrorMessage(error);
    const permanentlyFailed = job.attempts >= job.maxAttempts;
    const retryDelaySeconds = Math.min(300, 2 ** job.attempts * 5);

    await withTransaction(this.#pool, async (client) => {
      await client.query(
        `
          UPDATE extraction_jobs
          SET status = $2,
              available_at = CASE WHEN $2 = 'pending'
                THEN now() + ($3::text || ' seconds')::interval
                ELSE available_at
              END,
              locked_at = NULL,
              locked_by = NULL,
              last_error = $4
          WHERE id = $1
        `,
        [job.id, permanentlyFailed ? "failed" : "pending", retryDelaySeconds, message],
      );
      await client.query(
        `
          UPDATE intakes
          SET status = $2, failure_reason = $3
          WHERE id = $1
        `,
        [job.intakeId, permanentlyFailed ? "failed" : "received", message],
      );
    });
  }
}

function mapIntakeRow(row: IntakeRow): IntakeSummary {
  return {
    id: row.id,
    source: row.source,
    externalReference: row.external_reference,
    status: row.status,
    normalizedAt: row.normalized_at?.toISOString() ?? null,
    failureReason: row.failure_reason,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

function validateExtractionRelationships(extraction: IntakeExtraction): void {
  for (const policy of extraction.insurancePolicies) {
    if (policy.ownerType === "client" && policy.ownerDefendantIndex !== null) {
      throw new Error("Client insurance policy cannot reference a defendant index");
    }
    if (policy.ownerType === "defendant") {
      const index = policy.ownerDefendantIndex;
      if (index === null || extraction.defendants[index] === undefined) {
        throw new Error("Defendant insurance policy references an unknown defendant");
      }
    }
  }
}

async function insertClient(
  client: DatabaseClient,
  intakeId: string,
  extraction: IntakeExtraction,
): Promise<string> {
  const result = await client.query<{ id: string }>(
    `
      INSERT INTO clients (
        intake_id, first_name, last_name, phone, email, date_of_birth
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id
    `,
    [
      intakeId,
      extraction.client.firstName,
      extraction.client.lastName,
      extraction.client.phone,
      extraction.client.email,
      normalizeDate(extraction.client.dateOfBirth),
    ],
  );
  return requiredId(result.rows[0], "client");
}

async function insertIncident(
  client: DatabaseClient,
  intakeId: string,
  clientId: string,
  extraction: IntakeExtraction,
): Promise<string> {
  const incident = extraction.incident;
  const result = await client.query<{ id: string }>(
    `
      INSERT INTO incidents (
        intake_id, client_id, incident_type, occurred_at, occurred_at_text,
        location, description
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id
    `,
    [
      intakeId,
      clientId,
      incident.incidentType,
      normalizeTimestamp(incident.occurredAtIso),
      incident.occurredAtText,
      incident.location,
      incident.description,
    ],
  );
  return requiredId(result.rows[0], "incident");
}

async function insertDefendants(
  client: DatabaseClient,
  incidentId: string,
  extraction: IntakeExtraction,
): Promise<string[]> {
  const ids: string[] = [];

  for (const defendant of extraction.defendants) {
    const result = await client.query<{ id: string }>(
      `
        INSERT INTO defendants (
          incident_id, first_name, last_name, phone, vehicle_description, alleged_fault
        ) VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id
      `,
      [
        incidentId,
        defendant.firstName,
        defendant.lastName,
        defendant.phone,
        defendant.vehicleDescription,
        defendant.allegedFault,
      ],
    );
    ids.push(requiredId(result.rows[0], "defendant"));
  }

  return ids;
}

async function insertInsurancePolicies(
  client: DatabaseClient,
  incidentId: string,
  clientId: string,
  defendantIds: string[],
  extraction: IntakeExtraction,
): Promise<void> {
  for (const policy of extraction.insurancePolicies) {
    const defendantId = policy.ownerType === "defendant"
      ? defendantIds[policy.ownerDefendantIndex ?? -1] ?? null
      : null;

    await client.query(
      `
        INSERT INTO insurance_policies (
          incident_id, client_id, defendant_id, insurance_type, carrier_name,
          policy_number, coverage_status, policy_limit
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `,
      [
        incidentId,
        policy.ownerType === "client" ? clientId : null,
        defendantId,
        policy.insuranceType,
        policy.carrierName,
        policy.policyNumber,
        policy.coverageStatus,
        policy.policyLimit,
      ],
    );
  }
}

async function insertTreatments(
  client: DatabaseClient,
  incidentId: string,
  clientId: string,
  extraction: IntakeExtraction,
): Promise<void> {
  for (const treatment of extraction.treatments) {
    const provider = await client.query<{ id: string }>(
      `
        INSERT INTO providers (name, provider_type, phone, address)
        VALUES ($1, $2, $3, $4)
        RETURNING id
      `,
      [
        treatment.provider.name,
        treatment.provider.providerType,
        treatment.provider.phone,
        treatment.provider.address,
      ],
    );
    const providerId = requiredId(provider.rows[0], "provider");

    await client.query(
      `
        INSERT INTO treatments (
          incident_id, client_id, provider_id, treated_at, treatment_type,
          diagnosis, notes, billed_amount
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `,
      [
        incidentId,
        clientId,
        providerId,
        normalizeTimestamp(treatment.treatedAtIso),
        treatment.treatmentType,
        treatment.diagnosis,
        treatment.notes,
        treatment.billedAmount,
      ],
    );
  }
}

async function insertServices(
  client: DatabaseClient,
  incidentId: string,
  clientId: string,
  extraction: IntakeExtraction,
): Promise<void> {
  for (const service of extraction.servicesRendered) {
    const contact = await client.query<{ id: string }>(
      `
        INSERT INTO contacts (name, contact_type, phone, address)
        VALUES ($1, $2, $3, $4)
        RETURNING id
      `,
      [
        service.contact.name,
        service.contact.contactType,
        service.contact.phone,
        service.contact.address,
      ],
    );
    const contactId = requiredId(contact.rows[0], "contact");

    await client.query(
      `
        INSERT INTO services_rendered (
          incident_id, client_id, contact_id, service_type, rendered_at,
          notes, billed_amount
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      `,
      [
        incidentId,
        clientId,
        contactId,
        service.serviceType,
        normalizeTimestamp(service.renderedAtIso),
        service.notes,
        service.billedAmount,
      ],
    );
  }
}

async function insertPoliceReport(
  client: DatabaseClient,
  incidentId: string,
  extraction: IntakeExtraction,
): Promise<void> {
  const report = extraction.policeReport;
  if (report === null) {
    return;
  }

  await client.query(
    `
      INSERT INTO police_reports (
        incident_id, agency_name, report_number, officer_name, report_status, notes
      ) VALUES ($1, $2, $3, $4, $5, $6)
    `,
    [
      incidentId,
      report.agencyName,
      report.reportNumber,
      report.officerName,
      report.reportStatus,
      report.notes,
    ],
  );
}

async function insertWitnesses(
  client: DatabaseClient,
  incidentId: string,
  extraction: IntakeExtraction,
): Promise<void> {
  for (const witness of extraction.witnesses) {
    await client.query(
      `
        INSERT INTO witnesses (
          incident_id, first_name, last_name, phone, email, statement_summary
        ) VALUES ($1, $2, $3, $4, $5, $6)
      `,
      [
        incidentId,
        witness.firstName,
        witness.lastName,
        witness.phone,
        witness.email,
        witness.statementSummary,
      ],
    );
  }
}

function requiredId(row: { id: string } | undefined, entity: string): string {
  if (row === undefined) {
    throw new Error(`Database did not return the inserted ${entity} ID`);
  }
  return row.id;
}

function normalizeTimestamp(value: string | null): string | null {
  if (value === null || Number.isNaN(Date.parse(value))) {
    return null;
  }
  return new Date(value).toISOString();
}

function normalizeDate(value: string | null): string | null {
  return value !== null && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null;
}

function safeErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : "Unknown extraction failure";
  return message.slice(0, 2_000);
}
