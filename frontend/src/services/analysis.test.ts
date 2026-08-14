import { describe, expect, it } from 'vitest';
import { analyzeTranscript } from './analysis';
import type { TranscriptCase } from '../types';

describe('analyzeTranscript', () => {
  it('returns the evidence-linked Tamika review', async () => {
    const transcript: TranscriptCase = {
      id: '9e4c72df-90c3-4fae-bfd0-6d7ff75abf6f',
      preview: "Hi Alex, I'm Tamika.",
      turnCount: 4,
      transcript: [
        { speaker: 'Caller', text: "Hi Alex, I'm Tamika." },
        { speaker: 'Caller', text: 'The other vehicle T-boned us on the passenger side.' },
        { speaker: 'Caller', text: 'I fractured my left wrist and needed plate and screws.' },
        { speaker: 'Caller', text: 'I was told there may be a commercial liability policy.' },
      ],
    };

    const review = await analyzeTranscript(transcript);

    expect(review.recommendation).toBe('Sign this case.');
    expect(review.findings.map((finding) => finding.evidenceTurnIndex)).toEqual([2, 1, 3]);
    expect(review.attentionItems).toHaveLength(2);
  });
});
