import { afterEach, describe, expect, it, vi } from 'vitest';
import { analyzeTranscript, inferClientName } from './analysis';
import type { TranscriptCase } from '../types';

const intakeId = '2fdd8754-5a63-4e96-b8f8-f54e24f90ae7';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function tamikaTranscript(): TranscriptCase {
  return {
    id: '9e4c72df-90c3-4fae-bfd0-6d7ff75abf6f',
    preview: "Hi Alex, I'm Tamika.",
    turnCount: 4,
    transcript: [
      { speaker: 'Caller', text: "Hi Alex, I'm Tamika." },
      { speaker: 'Caller', text: 'The other vehicle T-boned us on the passenger side.' },
      { speaker: 'Caller', text: 'I fractured my left wrist and needed surgery with a plate and screws.' },
      { speaker: 'Caller', text: 'I was told Lyft may have a commercial liability insurance policy.' },
    ],
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('analyzeTranscript', () => {
  it('submits the transcript and builds an evidence-linked review from backend results', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse({ id: intakeId, status: 'received', failureReason: null }, 202))
      .mockResolvedValueOnce(jsonResponse({ id: intakeId, status: 'processing', failureReason: null }))
      .mockResolvedValueOnce(jsonResponse({ id: intakeId, status: 'completed', failureReason: null }))
      .mockResolvedValueOnce(jsonResponse({
        intake: { id: intakeId, status: 'completed', failureReason: null },
        client: { firstName: 'Tamika', lastName: 'Johnson' },
        incident: {
          incidentType: 'rideshare_collision',
          occurredAt: '2024-10-12T00:00:00.000Z',
          occurredAtText: null,
          location: 'Decatur, Georgia',
          description: 'The Lyft was T-boned on the passenger side.',
        },
        defendants: [{
          firstName: 'Victor',
          lastName: null,
          vehicleDescription: null,
          allegedFault: 'Rolled through a stop sign.',
        }],
        insurancePolicies: [{
          insuranceType: 'auto',
          carrierName: 'Lyft',
          policyNumber: null,
          coverageStatus: 'reported',
          policyLimit: 1_000_000,
        }],
        treatments: [{
          treatmentType: 'Wrist surgery',
          diagnosis: 'Fractured wrist',
          notes: 'Plate and screws',
          billedAmount: 52_000,
          provider: { name: 'Emory', providerType: 'hospital' },
        }],
        servicesRendered: [],
        policeReport: {
          agencyName: 'DeKalb County',
          reportNumber: '24-DK-73891',
          reportStatus: 'mentioned',
          notes: null,
        },
        witnesses: [],
      }));
    vi.stubGlobal('fetch', fetchMock);

    const transcript = tamikaTranscript();
    const review = await analyzeTranscript(transcript, { pollIntervalMs: 0 });

    expect(review).toMatchObject({
      caseName: 'Tamika Johnson',
      matterType: 'Rideshare Collision',
      location: 'Decatur, Georgia',
      incidentDate: 'Oct 12, 2024',
      recommendation: 'Sign this case.',
      confidence: 'Preliminary review',
    });
    expect(review.findings.map((finding) => finding.evidenceTurnIndex)).toEqual([2, 1, 3]);
    expect(review.findings[0].whyItMatters).toContain('$52,000');
    expect(review.findings[0].assessment).toContain('Emory');
    expect(review.findings[1].assessment).toContain('24-DK-73891');
    expect(review.findings[2].assessment).toContain('ride phase');
    expect(review.attentionItems).toEqual(['Verify policy status and limits']);
    expect(fetchMock).toHaveBeenCalledTimes(4);
    expect(fetchMock).toHaveBeenNthCalledWith(1, '/api/intakes', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({
        source: 'web',
        externalReference: transcript.id,
        transcript: transcript.transcript,
      }),
    }));
  });

  it('reports a failed backend analysis', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse({ id: intakeId, status: 'received', failureReason: null }, 202))
      .mockResolvedValueOnce(jsonResponse({
        id: intakeId,
        status: 'failed',
        failureReason: 'Model request failed',
      }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(analyzeTranscript(tamikaTranscript(), { pollIntervalMs: 0 }))
      .rejects.toThrow('Model request failed');
  });
});

describe('inferClientName', () => {
  it('uses the caller name instead of the intake specialist name', () => {
    const transcript: TranscriptCase = {
      id: 'generic-case',
      preview: 'I need help with a fall.',
      turnCount: 4,
      transcript: [
        { speaker: 'Intake Specialist', text: 'Thanks for calling Finch Legal, this is Carlos.' },
        { speaker: 'Caller', text: "Hi Carlos. I'm calling because I slipped and fell." },
        { speaker: 'Intake Specialist', text: 'May I have your full legal name?' },
        { speaker: 'Caller', text: 'Sure. My name is Maria Elena Gonzalez.' },
      ],
    };

    expect(inferClientName(transcript)).toBe('Maria Elena Gonzalez');
  });

  it('stops a name before the caller begins the next sentence with a dash', () => {
    const transcript: TranscriptCase = {
      id: 'dash-separated-case',
      preview: 'My full name is Tamika Renee Johnson.',
      turnCount: 1,
      transcript: [{
        speaker: 'Caller',
        text: "My full name is Tamika Renee Johnson-I'm thirty-one.",
      }],
    };

    expect(inferClientName(transcript)).toBe('Tamika Renee Johnson');
  });
});
