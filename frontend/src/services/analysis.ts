import type { IntakeReview, ReviewFinding, TranscriptCase } from '../types';

const TAMIKA_ID = '9e4c72df-90c3-4fae-bfd0-6d7ff75abf6f';

function findTurn(transcript: TranscriptCase, pattern: RegExp, fallback = 0) {
  const index = transcript.transcript.findIndex((turn) => pattern.test(turn.text));
  return index >= 0 ? index : Math.min(fallback, Math.max(0, transcript.transcript.length - 1));
}

function tamikaReview(transcript: TranscriptCase): IntakeReview {
  return {
    transcriptId: transcript.id,
    caseName: 'Tamika Johnson',
    matterType: 'Rideshare collision',
    location: 'Decatur, Georgia',
    incidentDate: 'Oct 12, 2024',
    recommendation: 'Sign this case.',
    confidence: 'High confidence',
    summary: 'Substantial injury, favorable liability, and likely rideshare coverage. Verify the ride phase and policy limits.',
    findings: [
      {
        id: 'damages',
        category: 'Damages',
        status: 'Strong',
        title: 'Severe injury',
        explanation: 'Wrist surgery, PTSD care, $52,000 in bills, and two months off work.',
        evidenceTurnIndex: findTurn(transcript, /plate and screws|fractured left wrist/i, 8),
      },
      {
        id: 'liability',
        category: 'Liability',
        status: 'Strong',
        title: 'Passenger claim',
        explanation: 'Passenger in a T-bone crash. Police report and Lyft receipt available.',
        evidenceTurnIndex: findTurn(transcript, /t-boned|passenger side/i, 4),
      },
      {
        id: 'coverage',
        category: 'Coverage',
        status: 'Verify',
        title: 'Layered policy',
        explanation: 'Commercial Lyft policy likely. Ride phase and limits unconfirmed.',
        evidenceTurnIndex: findTurn(transcript, /million-dollar liability|commercial liability/i, 16),
      },
    ],
    attentionItems: ['Confirm the Lyft ride phase', 'Request policy declarations'],
  };
}

function inferName(transcript: TranscriptCase) {
  const opening = transcript.transcript.slice(0, 8).map((turn) => turn.text).join(' ');
  const match = opening.match(/(?:my (?:full )?name is|this is)\s+([A-Z][A-Za-z'-]+(?:\s+[A-Z][A-Za-z'-]+){0,3})/);
  return match?.[1]?.replace(/[.,].*$/, '') ?? 'New intake';
}

function genericReview(transcript: TranscriptCase): IntakeReview {
  const fullText = transcript.transcript.map((turn) => turn.text).join(' ');
  const hasSurgery = /surgery|operation|skin graft/i.test(fullText);
  const hasReport = /police report|report number|incident report/i.test(fullText);
  const hasCoverage = /insurance|policy|carrier|coverage/i.test(fullText);
  const findings: ReviewFinding[] = [
    {
      id: 'damages',
      category: 'Damages',
      status: hasSurgery ? 'Strong' : 'Verify',
      title: hasSurgery ? 'Significant treatment' : 'Treatment reported',
      explanation: hasSurgery
        ? 'The caller reports invasive treatment and continuing effects.'
        : 'Treatment is described, but records and the current prognosis should be confirmed.',
      evidenceTurnIndex: findTurn(transcript, /surgery|hospital|ER|doctor|treatment|therapy/i),
    },
    {
      id: 'liability',
      category: 'Liability',
      status: hasReport ? 'Strong' : 'Verify',
      title: hasReport ? 'Documented incident' : 'Facts need review',
      explanation: hasReport
        ? 'The call identifies a report or other incident documentation.'
        : 'Confirm the incident sequence, witnesses, and available documentation.',
      evidenceTurnIndex: findTurn(transcript, /report|witness|fault|hit|slipped|collision|crash/i, 1),
    },
    {
      id: 'coverage',
      category: 'Coverage',
      status: 'Verify',
      title: hasCoverage ? 'Coverage identified' : 'Coverage unknown',
      explanation: hasCoverage
        ? 'At least one potential coverage source is named and requires verification.'
        : 'No confirmed policy details were found in the call.',
      evidenceTurnIndex: findTurn(transcript, /insurance|policy|carrier|coverage/i, 2),
    },
  ];

  return {
    transcriptId: transcript.id,
    caseName: inferName(transcript),
    matterType: 'Personal injury intake',
    location: 'Location to verify',
    incidentDate: 'Date to verify',
    recommendation: 'Review this case.',
    confidence: 'Preliminary review',
    summary: 'The transcript contains potentially actionable facts. Confirm the highlighted evidence before making the final intake decision.',
    findings,
    attentionItems: ['Confirm missing incident details', 'Request supporting records'],
  };
}

export async function analyzeTranscript(transcript: TranscriptCase): Promise<IntakeReview> {
  return transcript.id === TAMIKA_ID ? tamikaReview(transcript) : genericReview(transcript);
}
