import type { ImportBatch, TranscriptCase } from '../types';

interface SelectionScreenProps {
  batch: ImportBatch;
  selectedId: string | null;
  onSelect: (transcript: TranscriptCase) => void;
  onAnalyze: () => void;
  onReplace: () => void;
}

export function SelectionScreen({ batch, selectedId, onSelect, onAnalyze, onReplace }: SelectionScreenProps) {
  const selected = batch.transcripts.find((transcript) => transcript.id === selectedId) ?? null;

  return (
    <main className="app-main selection-main">
      <section className="container selection-view">
        <header className="selection-head">
          <div>
            <div className="eyebrow">Intake review</div>
            <h1>Choose a transcript.</h1>
            <p className="lede">{batch.transcripts.length} transcripts found. Select the one call you want to analyze.</p>
          </div>
        </header>

        <div className="file-summary">
          <div className="file-summary-main">
            <svg className="file-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M6 2h8l4 4v16H6V2Z" stroke="currentColor" strokeWidth="1.6" />
              <path d="M14 2v5h4M9 12h6M9 16h6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
            <div>
              <div className="file-name">{batch.filename}</div>
              <div className="file-count">{batch.transcripts.length} transcripts ready</div>
            </div>
          </div>
          <button className="text-button" type="button" onClick={onReplace}>Replace file</button>
        </div>

        {batch.issues.length > 0 && (
          <div className="validation-note" role="status">
            Imported {batch.transcripts.length} valid transcripts. Skipped invalid line{batch.issues.length === 1 ? '' : 's'} {batch.issues.map((issue) => issue.line).join(', ')}.
          </div>
        )}

        <div className="transcript-list" role="radiogroup" aria-label="Available transcripts">
          {batch.transcripts.map((transcript, index) => {
            const isSelected = transcript.id === selectedId;
            return (
              <button
                className={`transcript-option${isSelected ? ' is-selected' : ''}`}
                type="button"
                role="radio"
                aria-checked={isSelected}
                onClick={() => onSelect(transcript)}
                key={transcript.id}
                data-testid={`transcript-${index + 1}`}
              >
                <span className="radio-mark" aria-hidden="true" />
                <span className="option-copy">
                  <span className="option-kicker">Transcript {String(index + 1).padStart(2, '0')}</span>
                  <span className="option-preview">“{transcript.preview}”</span>
                  <span className="option-id">{transcript.id.slice(0, 8)}</span>
                </span>
                <span className="turn-count">{transcript.turnCount} turns</span>
              </button>
            );
          })}
        </div>

        <div className="action-bar">
          <button className="button" type="button" disabled={!selected} onClick={onAnalyze}>Analyze transcript</button>
        </div>
      </section>
    </main>
  );
}
