import { useRef, useState, type ChangeEvent, type DragEvent } from 'react';
import { importTranscriptFile, loadSampleBatch } from '../services/transcripts';
import type { ImportBatch } from '../types';

interface UploadScreenProps {
  onImport: (batch: ImportBatch) => void;
}

export function UploadScreen({ onImport }: UploadScreenProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState('');
  const [loadingSample, setLoadingSample] = useState(false);

  const finishImport = (batch: ImportBatch) => {
    if (batch.transcripts.length === 0) {
      const detail = batch.issues[0] ? ` Line ${batch.issues[0].line}: ${batch.issues[0].reason}` : '';
      setError(`No valid transcripts were found.${detail}`);
      return;
    }
    setError('');
    onImport(batch);
  };

  const handleFile = async (file?: File) => {
    if (!file) return;
    try {
      finishImport(await importTranscriptFile(file));
    } catch {
      setError('The selected file could not be read.');
    }
  };

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    void handleFile(event.target.files?.[0]);
    event.target.value = '';
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragging(false);
    void handleFile(event.dataTransfer.files[0]);
  };

  const handleSample = async () => {
    setLoadingSample(true);
    setError('');
    try {
      finishImport(await loadSampleBatch());
    } catch (sampleError) {
      setError(sampleError instanceof Error ? sampleError.message : 'The sample data could not be loaded.');
    } finally {
      setLoadingSample(false);
    }
  };

  return (
    <main className="app-main upload-main">
      <section className="container reveal-stage">
        <header className="upload-head">
          <div className="eyebrow">New intake</div>
          <h1>Upload transcripts.</h1>
          <p className="lede">Upload the dataset, then choose the single call you want to analyze.</p>
        </header>

        <div
          className={`upload-zone${dragging ? ' is-dragging' : ''}`}
          onClick={() => inputRef.current?.click()}
          onDragEnter={(event) => { event.preventDefault(); setDragging(true); }}
          onDragOver={(event) => event.preventDefault()}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          role="button"
          tabIndex={0}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') inputRef.current?.click();
          }}
          data-testid="upload-zone"
        >
          <input ref={inputRef} type="file" hidden onChange={handleChange} aria-label="Choose transcript file" />
          <div className="upload-content">
            <svg className="upload-mark" viewBox="0 0 48 48" fill="none" aria-hidden="true">
              <path d="M24 33V9m0 0-9 9m9-9 9 9M9 31v6a2 2 0 0 0 2 2h26a2 2 0 0 0 2-2v-6" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <h2>Drop the file here</h2>
            <p>Upload your call to analyze.</p>
            <span className="button">Choose file</span>
          </div>
        </div>

        <div className="preview-action">
          <button className="text-button" type="button" onClick={() => void handleSample()} disabled={loadingSample}>
            {loadingSample ? 'Loading sample data...' : 'Preview with sample data'}
          </button>
        </div>
        {error && <div className="error-box" role="alert">{error}</div>}
      </section>
    </main>
  );
}
