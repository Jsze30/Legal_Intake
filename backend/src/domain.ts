import { z } from "zod";

export const TranscriptSegmentSchema = z.object({
  speaker: z.string().trim().min(1).max(120),
  text: z.string().trim().min(1).max(50_000),
  startedAt: z.string().trim().min(1).max(120).optional(),
});

export const CreateIntakeSchema = z.object({
  source: z.string().trim().min(1).max(120).default("api"),
  externalReference: z.string().trim().min(1).max(255).optional(),
  transcript: z.union([
    z.string().trim().min(1).max(500_000),
    z.array(TranscriptSegmentSchema).min(1).max(10_000),
  ]),
});

export const IntakeIdSchema = z.uuid();

export type CreateIntakeInput = z.infer<typeof CreateIntakeSchema>;

export type StoredTranscript =
  | { format: "text"; text: string }
  | { format: "segments"; segments: z.infer<typeof TranscriptSegmentSchema>[] };

export function normalizeTranscript(transcript: CreateIntakeInput["transcript"]): StoredTranscript {
  return typeof transcript === "string"
    ? { format: "text", text: transcript }
    : { format: "segments", segments: transcript };
}

export function transcriptToText(transcript: StoredTranscript): string {
  if (transcript.format === "text") {
    return transcript.text;
  }

  return transcript.segments
    .map((segment, index) => {
      const timestamp = segment.startedAt === undefined ? "" : ` [${segment.startedAt}]`;
      return `${index + 1}. ${segment.speaker}${timestamp}: ${segment.text}`;
    })
    .join("\n");
}

const NullableText = z.string().nullable();
const NullableMoney = z.number().nonnegative().nullable();

const ClientExtractionSchema = z.object({
  firstName: NullableText,
  lastName: NullableText,
  phone: NullableText,
  email: NullableText,
  dateOfBirth: NullableText,
});

const IncidentExtractionSchema = z.object({
  incidentType: NullableText,
  occurredAtIso: NullableText,
  occurredAtText: NullableText,
  location: NullableText,
  description: NullableText,
});

const DefendantExtractionSchema = z.object({
  firstName: NullableText,
  lastName: NullableText,
  phone: NullableText,
  vehicleDescription: NullableText,
  allegedFault: NullableText,
});

const ProviderExtractionSchema = z.object({
  name: z.string().min(1),
  providerType: NullableText,
  phone: NullableText,
  address: NullableText,
});

const ContactExtractionSchema = z.object({
  name: z.string().min(1),
  contactType: z.enum(["ambulance", "tow_company", "auto_shop", "other"]),
  phone: NullableText,
  address: NullableText,
});

const TreatmentExtractionSchema = z.object({
  provider: ProviderExtractionSchema,
  treatedAtIso: NullableText,
  treatmentType: NullableText,
  diagnosis: NullableText,
  notes: NullableText,
  billedAmount: NullableMoney,
});

const ServiceExtractionSchema = z.object({
  contact: ContactExtractionSchema,
  serviceType: z.string().min(1),
  renderedAtIso: NullableText,
  notes: NullableText,
  billedAmount: NullableMoney,
});

const InsuranceExtractionSchema = z.object({
  ownerType: z.enum(["client", "defendant"]),
  ownerDefendantIndex: z.number().int().nonnegative().nullable(),
  insuranceType: z.enum(["auto", "health", "umbrella", "other"]),
  carrierName: NullableText,
  policyNumber: NullableText,
  coverageStatus: z.enum(["unknown", "reported", "verified", "denied"]),
  policyLimit: NullableMoney,
});

const PoliceReportExtractionSchema = z.object({
  agencyName: NullableText,
  reportNumber: NullableText,
  officerName: NullableText,
  reportStatus: z.enum(["mentioned", "requested", "received", "verified"]),
  notes: NullableText,
});

const WitnessExtractionSchema = z.object({
  firstName: NullableText,
  lastName: NullableText,
  phone: NullableText,
  email: NullableText,
  statementSummary: NullableText,
});

export const IntakeExtractionSchema = z.object({
  client: ClientExtractionSchema,
  incident: IncidentExtractionSchema,
  defendants: z.array(DefendantExtractionSchema),
  insurancePolicies: z.array(InsuranceExtractionSchema),
  treatments: z.array(TreatmentExtractionSchema),
  servicesRendered: z.array(ServiceExtractionSchema),
  policeReport: PoliceReportExtractionSchema.nullable(),
  witnesses: z.array(WitnessExtractionSchema),
});

export type IntakeExtraction = z.infer<typeof IntakeExtractionSchema>;

export type IntakeSummary = {
  id: string;
  source: string;
  externalReference: string | null;
  status: "received" | "processing" | "completed" | "failed";
  normalizedAt: string | null;
  failureReason: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CreatedIntake = {
  intake: IntakeSummary;
  created: boolean;
};

export type ExtractionJob = {
  id: string;
  intakeId: string;
  attempts: number;
  maxAttempts: number;
  transcript: StoredTranscript;
};
