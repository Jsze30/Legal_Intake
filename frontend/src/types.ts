export interface TranscriptTurn {
  speaker: string;
  text: string;
}

export interface TranscriptCase {
  id: string;
  transcript: TranscriptTurn[];
  preview: string;
  turnCount: number;
}

export interface ImportIssue {
  line: number;
  reason: string;
}

export interface ImportBatch {
  filename: string;
  transcripts: TranscriptCase[];
  issues: ImportIssue[];
}

export type FindingCategory = 'Damages' | 'Liability' | 'Coverage';
export type FindingStatus = 'Strong' | 'Verify';

export interface ReviewFinding {
  id: string;
  category: FindingCategory;
  status: FindingStatus;
  title: string;
  explanation: string;
  evidenceTurnIndex: number;
}

export interface IntakeReview {
  transcriptId: string;
  caseName: string;
  matterType: string;
  location: string;
  incidentDate: string;
  recommendation: string;
  confidence: 'High confidence' | 'Preliminary review';
  summary: string;
  findings: ReviewFinding[];
  attentionItems: string[];
}

export type Decision = 'sign' | 'hold' | 'decline';
export type AppScreen = 'upload' | 'selection' | 'processing' | 'review';
