import OpenAI from "openai";
import { zodResponseFormat } from "openai/helpers/zod";
import type { IntakeExtraction, StoredTranscript } from "./domain.js";
import { IntakeExtractionSchema, transcriptToText } from "./domain.js";

export interface IntakeExtractor {
  readonly model: string;
  extract(transcript: StoredTranscript): Promise<IntakeExtraction>;
}

export class OpenAiIntakeExtractor implements IntakeExtractor {
  readonly model: string;
  readonly #client: OpenAI;

  constructor(apiKey: string, model: string) {
    this.#client = new OpenAI({ apiKey });
    this.model = model;
  }

  async extract(transcript: StoredTranscript): Promise<IntakeExtraction> {
    const completion = await this.#client.chat.completions.parse({
      model: this.model,
      messages: [
        {
          role: "system",
          content: [
            "Extract only facts explicitly stated in this personal-injury intake transcript.",
            "Use null for unknown scalar values and an empty array when no item is mentioned.",
            "Do not infer fault, diagnoses, policy limits, dates, or contact details.",
            "A provider is a medical provider. A contact is an ambulance, tow company, auto shop, or other non-medical service vendor.",
            "ownerDefendantIndex is zero-based and must identify an item in defendants when ownerType is defendant.",
            "ownerDefendantIndex must be null when ownerType is client.",
            "Use ISO 8601 only when a complete timestamp or date is stated. Preserve vague incident date language in occurredAtText.",
          ].join(" "),
        },
        {
          role: "user",
          content: transcriptToText(transcript),
        },
      ],
      response_format: zodResponseFormat(IntakeExtractionSchema, "intake_extraction"),
    });

    const message = completion.choices[0]?.message;
    if (message?.refusal !== null && message?.refusal !== undefined) {
      throw new Error(`Model refused extraction: ${message.refusal}`);
    }
    if (message?.parsed === null || message?.parsed === undefined) {
      throw new Error("Model returned no parsed intake extraction");
    }

    return message.parsed;
  }
}
