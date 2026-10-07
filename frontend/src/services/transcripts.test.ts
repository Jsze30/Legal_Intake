import { afterEach, describe, expect, it, vi } from 'vitest';
import { loadSampleBatch, parseJsonl } from './transcripts';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('loadSampleBatch', () => {
  it.each([
    ['true', 'fictional-demo-transcripts.jsonl'],
    ['false', 'sample-transcripts.jsonl'],
  ])('labels the sample for demo mode %s', async (demoMode, filename) => {
    vi.stubEnv('VITE_DEMO_MODE', demoMode);
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      id: 'sample', transcript: [{ speaker: 'Caller', text: 'Hello.' }],
    })));
    vi.stubGlobal('fetch', fetchMock);

    const batch = await loadSampleBatch();

    expect(fetchMock).toHaveBeenCalledWith('/sample-transcripts.jsonl');
    expect(batch.filename).toBe(filename);
    expect(batch.transcripts).toHaveLength(1);
    expect(batch.issues).toEqual([]);
  });
});

describe('parseJsonl', () => {
  it('imports one transcript per line and ignores historical outcomes', () => {
    const input = [
      JSON.stringify({
        id: 'case-1',
        transcript: [{ speaker: 'Caller', text: 'I need help.' }],
        outcome_status: 'settled',
        outcome_value: 100000,
      }),
      JSON.stringify({
        id: 'case-2',
        transcript: [{ speaker: 'Caller', text: 'This is another call.' }],
      }),
    ].join('\n');

    const result = parseJsonl(input, 'cases.jsonl');

    expect(result.transcripts).toHaveLength(2);
    expect(result.issues).toHaveLength(0);
    expect(result.transcripts[0]).toEqual({
      id: 'case-1',
      transcript: [{ speaker: 'Caller', text: 'I need help.' }],
      preview: 'I need help.',
      turnCount: 1,
    });
    expect(result.transcripts[0]).not.toHaveProperty('outcome_status');
    expect(result.transcripts[0]).not.toHaveProperty('outcome_value');
  });

  it('keeps valid lines and reports invalid ones', () => {
    const input = [
      '{not json}',
      JSON.stringify({ id: 'case-2', transcript: [{ speaker: 'Caller', text: 'Valid.' }] }),
      JSON.stringify({ id: 'case-3', transcript: [] }),
    ].join('\n');

    const result = parseJsonl(input, 'mixed.jsonl');

    expect(result.transcripts).toHaveLength(1);
    expect(result.issues.map((issue) => issue.line)).toEqual([1, 3]);
  });
});
