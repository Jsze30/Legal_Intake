import type { TranscriptCase } from '../types';

export type IntakeStatus = 'received' | 'processing' | 'completed' | 'failed';

export interface IntakeSummary {
  id: string;
  status: IntakeStatus;
  failureReason: string | null;
}

export interface IntakeClient {
  firstName: string | null;
  lastName: string | null;
}

export interface IntakeIncident {
  incidentType: string | null;
  occurredAt: string | null;
  occurredAtText: string | null;
  location: string | null;
  description: string | null;
}

export interface IntakeDefendant {
  firstName: string | null;
  lastName: string | null;
  vehicleDescription: string | null;
  allegedFault: string | null;
}

export interface IntakeInsurancePolicy {
  insuranceType: string;
  carrierName: string | null;
  policyNumber: string | null;
  coverageStatus: 'unknown' | 'reported' | 'verified' | 'denied';
  policyLimit: string | number | null;
}

export interface IntakeTreatment {
  treatmentType: string | null;
  diagnosis: string | null;
  notes: string | null;
  billedAmount: string | number | null;
  provider: {
    name: string;
    providerType: string | null;
  };
}

export interface IntakePoliceReport {
  agencyName: string | null;
  reportNumber: string | null;
  reportStatus: 'mentioned' | 'requested' | 'received' | 'verified';
  notes: string | null;
}

export interface IntakeWitness {
  firstName: string | null;
  lastName: string | null;
  statementSummary: string | null;
}

export interface IntakeResult {
  intake: IntakeSummary;
  client: IntakeClient | null;
  incident: IntakeIncident | null;
  defendants: IntakeDefendant[];
  insurancePolicies: IntakeInsurancePolicy[];
  treatments: IntakeTreatment[];
  servicesRendered: unknown[];
  policeReport: IntakePoliceReport | null;
  witnesses: IntakeWitness[];
}

export interface IntakeRequestOptions {
  signal?: AbortSignal;
  pollIntervalMs?: number;
  timeoutMs?: number;
}

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '');
const defaultPollIntervalMs = 1_000;
const defaultTimeoutMs = 120_000;

export class IntakeApiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'IntakeApiError';
  }
}

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;

  try {
    response = await fetch(`${apiBaseUrl}${path}`, init);
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error;
    throw new IntakeApiError('The Finch backend could not be reached. Make sure the API is running.');
  }

  if (!response.ok) {
    let detail: string | undefined;
    try {
      const body = await response.json() as { error?: string; failureReason?: string };
      detail = body.failureReason ?? body.error;
    } catch {
      detail = undefined;
    }

    throw new IntakeApiError(detail ? `The backend returned: ${detail}` : `The backend returned HTTP ${response.status}.`);
  }

  return response.json() as Promise<T>;
}

function wait(milliseconds: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException('The request was cancelled.', 'AbortError'));
      return;
    }

    const timeout = window.setTimeout(() => {
      signal?.removeEventListener('abort', handleAbort);
      resolve();
    }, milliseconds);

    function handleAbort() {
      window.clearTimeout(timeout);
      reject(new DOMException('The request was cancelled.', 'AbortError'));
    }

    signal?.addEventListener('abort', handleAbort, { once: true });
  });
}

export async function submitIntake(transcript: TranscriptCase, signal?: AbortSignal): Promise<IntakeSummary> {
  return requestJson<IntakeSummary>('/api/intakes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      source: 'web',
      externalReference: transcript.id,
      transcript: transcript.transcript,
    }),
    signal,
  });
}

export async function waitForIntakeResult(
  intakeId: string,
  options: IntakeRequestOptions = {},
): Promise<IntakeResult> {
  const pollIntervalMs = options.pollIntervalMs ?? defaultPollIntervalMs;
  const timeoutMs = options.timeoutMs ?? defaultTimeoutMs;
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    const intake = await requestJson<IntakeSummary>(`/api/intakes/${intakeId}/status`, {
      signal: options.signal,
    });

    if (intake.status === 'completed') {
      return requestJson<IntakeResult>(`/api/intakes/${intakeId}/results`, {
        signal: options.signal,
      });
    }

    if (intake.status === 'failed') {
      throw new IntakeApiError(intake.failureReason ?? 'The transcript analysis failed.');
    }

    await wait(pollIntervalMs, options.signal);
  }

  throw new IntakeApiError('The transcript is still processing. Try again in a moment.');
}

export async function processIntake(
  transcript: TranscriptCase,
  options: IntakeRequestOptions = {},
): Promise<IntakeResult> {
  const intake = await submitIntake(transcript, options.signal);
  return waitForIntakeResult(intake.id, options);
}
