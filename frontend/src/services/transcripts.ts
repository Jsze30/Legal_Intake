import type { ImportBatch, ImportIssue, TranscriptCase, TranscriptTurn } from '../types';

const callerText = (transcript: TranscriptTurn[]) => {
  const caller = transcript.find((turn) => turn.speaker.toLowerCase().includes('caller'));
  return caller?.text ?? transcript[0]?.text ?? 'Transcript ready for review.';
};

export function parseJsonl(text: string, filename: string): ImportBatch {
  const lines = text
    .split(/\r?\n/)
    .map((value, index) => ({ value: value.trim(), line: index + 1 }))
    .filter(({ value }) => value.length > 0);

  const transcripts: TranscriptCase[] = [];
  const issues: ImportIssue[] = [];

  for (const entry of lines) {
    try {
      const value: unknown = JSON.parse(entry.value);
      if (!value || typeof value !== 'object') {
        throw new Error('Expected a JSON object.');
      }

      const candidate = value as { id?: unknown; transcript?: unknown };
      if (!Array.isArray(candidate.transcript) || candidate.transcript.length === 0) {
        throw new Error('Expected a non-empty transcript array.');
      }

      const validTurns = candidate.transcript.every(
        (turn): turn is TranscriptTurn =>
          Boolean(turn) &&
          typeof turn === 'object' &&
          typeof (turn as TranscriptTurn).speaker === 'string' &&
          typeof (turn as TranscriptTurn).text === 'string',
      );

      if (!validTurns) {
        throw new Error('Every turn must contain string speaker and text fields.');
      }

      const transcript = candidate.transcript as TranscriptTurn[];
      transcripts.push({
        id: typeof candidate.id === 'string' ? candidate.id : `transcript-${entry.line}`,
        transcript,
        preview: callerText(transcript),
        turnCount: transcript.length,
      });
    } catch (error) {
      issues.push({
        line: entry.line,
        reason: error instanceof Error ? error.message : 'Invalid JSON.',
      });
    }
  }

  return { filename, transcripts, issues };
}

export async function importTranscriptFile(file: File): Promise<ImportBatch> {
  return parseJsonl(await file.text(), file.name);
}

export async function loadSampleBatch(): Promise<ImportBatch> {
  const response = await fetch('/sample-transcripts.jsonl');
  if (!response.ok) {
    throw new Error('The sample transcript file could not be loaded.');
  }
  const filename = import.meta.env.VITE_DEMO_MODE === 'true'
    ? 'fictional-demo-transcripts.jsonl'
    : 'finch eng onsite - transcripts';
  return parseJsonl(await response.text(), filename);
}
