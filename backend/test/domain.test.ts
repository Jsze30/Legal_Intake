import { describe, expect, it } from "vitest";
import {
  CreateIntakeSchema,
  IntakeExtractionSchema,
  normalizeTranscript,
  transcriptToText,
} from "../src/domain.js";

describe("intake domain", () => {
  it("normalizes a plain transcript", () => {
    expect(normalizeTranscript("Caller: I was rear-ended.")).toEqual({
      format: "text",
      text: "Caller: I was rear-ended.",
    });
  });

  it("formats transcript segments for extraction", () => {
    const transcript = normalizeTranscript([
      { speaker: "Agent", text: "What happened?" },
      { speaker: "Caller", text: "I was rear-ended.", startedAt: "00:05" },
    ]);

    expect(transcriptToText(transcript)).toBe(
      "1. Agent: What happened?\n2. Caller [00:05]: I was rear-ended.",
    );
  });

  it("rejects an empty transcript", () => {
    expect(CreateIntakeSchema.safeParse({ transcript: "  " }).success).toBe(false);
  });

  it("accepts the complete extraction shape", () => {
    const result = IntakeExtractionSchema.safeParse({
      client: {
        firstName: "Taylor",
        lastName: "Jones",
        phone: null,
        email: null,
        dateOfBirth: null,
      },
      incident: {
        incidentType: "auto_collision",
        occurredAtIso: null,
        occurredAtText: "last Friday",
        location: "Austin, Texas",
        description: "Rear-end collision",
      },
      defendants: [],
      insurancePolicies: [],
      treatments: [],
      servicesRendered: [],
      policeReport: null,
      witnesses: [],
    });

    expect(result.success).toBe(true);
  });
});
