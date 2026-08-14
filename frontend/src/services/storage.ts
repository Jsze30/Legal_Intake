import type { Decision, ImportBatch, IntakeReview, TranscriptCase } from '../types';

const STORAGE_KEY = 'finch-intake-demo-v1';

export interface StoredAppState {
  batch: ImportBatch | null;
  selectedTranscript: TranscriptCase | null;
  review: IntakeReview | null;
  decision: Decision | null;
}

export function loadState(): StoredAppState {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as StoredAppState;
  } catch {
    sessionStorage.removeItem(STORAGE_KEY);
  }
  return { batch: null, selectedTranscript: null, review: null, decision: null };
}

export function saveState(state: StoredAppState) {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function clearState() {
  sessionStorage.removeItem(STORAGE_KEY);
}
