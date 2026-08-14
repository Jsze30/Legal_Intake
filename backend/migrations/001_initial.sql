CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS schema_migrations (
    version text PRIMARY KEY,
    applied_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE intakes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    source text NOT NULL DEFAULT 'api',
    external_reference text,
    status text NOT NULL DEFAULT 'received',
    raw_transcript jsonb NOT NULL,
    normalized_at timestamptz,
    failure_reason text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT intakes_status_check CHECK (
        status IN ('received', 'processing', 'completed', 'failed')
    ),
    CONSTRAINT intakes_raw_transcript_object_check CHECK (
        jsonb_typeof(raw_transcript) = 'object'
    )
);

CREATE UNIQUE INDEX intakes_external_reference_unique_idx
    ON intakes(external_reference)
    WHERE external_reference IS NOT NULL;

CREATE INDEX intakes_status_created_at_idx ON intakes(status, created_at);

CREATE TABLE extraction_jobs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    intake_id uuid NOT NULL UNIQUE REFERENCES intakes(id) ON DELETE RESTRICT,
    status text NOT NULL DEFAULT 'pending',
    attempts integer NOT NULL DEFAULT 0,
    max_attempts integer NOT NULL DEFAULT 3,
    available_at timestamptz NOT NULL DEFAULT now(),
    locked_at timestamptz,
    locked_by text,
    model text,
    raw_output jsonb,
    last_error text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT extraction_jobs_status_check CHECK (
        status IN ('pending', 'processing', 'succeeded', 'failed')
    ),
    CONSTRAINT extraction_jobs_attempts_check CHECK (attempts >= 0),
    CONSTRAINT extraction_jobs_max_attempts_check CHECK (max_attempts > 0)
);

CREATE INDEX extraction_jobs_claim_idx
    ON extraction_jobs(status, available_at, created_at);

CREATE TABLE clients (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    intake_id uuid NOT NULL UNIQUE REFERENCES intakes(id) ON DELETE RESTRICT,
    first_name text,
    last_name text,
    phone text,
    email text,
    date_of_birth date,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE providers (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    provider_type text,
    phone text,
    address text,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE contacts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    contact_type text NOT NULL,
    phone text,
    address text,
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT contacts_type_check CHECK (
        contact_type IN ('ambulance', 'tow_company', 'auto_shop', 'other')
    )
);

CREATE TABLE incidents (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    intake_id uuid NOT NULL UNIQUE REFERENCES intakes(id) ON DELETE RESTRICT,
    client_id uuid NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
    incident_type text,
    occurred_at timestamptz,
    occurred_at_text text,
    location text,
    description text,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX incidents_client_id_idx ON incidents(client_id);

CREATE TABLE defendants (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    incident_id uuid NOT NULL REFERENCES incidents(id) ON DELETE RESTRICT,
    first_name text,
    last_name text,
    phone text,
    vehicle_description text,
    alleged_fault text,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX defendants_incident_id_idx ON defendants(incident_id);

CREATE TABLE insurance_policies (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    incident_id uuid NOT NULL REFERENCES incidents(id) ON DELETE RESTRICT,
    client_id uuid REFERENCES clients(id) ON DELETE RESTRICT,
    defendant_id uuid REFERENCES defendants(id) ON DELETE RESTRICT,
    insurance_type text NOT NULL,
    carrier_name text,
    policy_number text,
    coverage_status text NOT NULL DEFAULT 'unknown',
    policy_limit numeric(14, 2),
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT insurance_owner_check CHECK (
        num_nonnulls(client_id, defendant_id) = 1
    ),
    CONSTRAINT insurance_type_check CHECK (
        insurance_type IN ('auto', 'health', 'umbrella', 'other')
    ),
    CONSTRAINT insurance_coverage_status_check CHECK (
        coverage_status IN ('unknown', 'reported', 'verified', 'denied')
    ),
    CONSTRAINT insurance_policy_limit_check CHECK (
        policy_limit IS NULL OR policy_limit >= 0
    )
);

CREATE INDEX insurance_policies_incident_id_idx ON insurance_policies(incident_id);
CREATE INDEX insurance_policies_client_id_idx ON insurance_policies(client_id);
CREATE INDEX insurance_policies_defendant_id_idx ON insurance_policies(defendant_id);

CREATE TABLE treatments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    incident_id uuid NOT NULL REFERENCES incidents(id) ON DELETE RESTRICT,
    client_id uuid NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
    provider_id uuid NOT NULL REFERENCES providers(id) ON DELETE RESTRICT,
    treated_at timestamptz,
    treatment_type text,
    diagnosis text,
    notes text,
    billed_amount numeric(14, 2),
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT treatments_billed_amount_check CHECK (
        billed_amount IS NULL OR billed_amount >= 0
    )
);

CREATE INDEX treatments_incident_id_idx ON treatments(incident_id);
CREATE INDEX treatments_client_id_idx ON treatments(client_id);
CREATE INDEX treatments_provider_id_idx ON treatments(provider_id);

CREATE TABLE services_rendered (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    incident_id uuid NOT NULL REFERENCES incidents(id) ON DELETE RESTRICT,
    client_id uuid NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
    contact_id uuid NOT NULL REFERENCES contacts(id) ON DELETE RESTRICT,
    service_type text NOT NULL,
    rendered_at timestamptz,
    notes text,
    billed_amount numeric(14, 2),
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT services_rendered_amount_check CHECK (
        billed_amount IS NULL OR billed_amount >= 0
    )
);

CREATE INDEX services_rendered_incident_id_idx ON services_rendered(incident_id);
CREATE INDEX services_rendered_client_id_idx ON services_rendered(client_id);
CREATE INDEX services_rendered_contact_id_idx ON services_rendered(contact_id);

CREATE TABLE police_reports (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    incident_id uuid NOT NULL UNIQUE REFERENCES incidents(id) ON DELETE RESTRICT,
    agency_name text,
    report_number text,
    officer_name text,
    report_status text NOT NULL DEFAULT 'mentioned',
    notes text,
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT police_reports_status_check CHECK (
        report_status IN ('mentioned', 'requested', 'received', 'verified')
    )
);

CREATE TABLE witnesses (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    incident_id uuid NOT NULL REFERENCES incidents(id) ON DELETE RESTRICT,
    first_name text,
    last_name text,
    phone text,
    email text,
    statement_summary text,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX witnesses_incident_id_idx ON witnesses(incident_id);

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

CREATE TRIGGER intakes_set_updated_at
BEFORE UPDATE ON intakes
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER extraction_jobs_set_updated_at
BEFORE UPDATE ON extraction_jobs
FOR EACH ROW EXECUTE FUNCTION set_updated_at();
