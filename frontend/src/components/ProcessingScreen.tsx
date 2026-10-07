import { useEffect, useState } from 'react';
import { analyzeTranscript } from '../services/analysis';
import type { IntakeReview, TranscriptCase } from '../types';

interface ProcessingScreenProps {
  transcript: TranscriptCase;
  onComplete: (review: IntakeReview) => void;
  onCancel: () => void;
}

const steps = [
  'Reading the call',
  'Assessing damages, liability, and coverage',
  'Linking findings to source evidence',
];

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return 'The transcript could not be analyzed.';
}

export function ProcessingScreen({ transcript, onComplete, onCancel }: ProcessingScreenProps) {
  const [activeStep, setActiveStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const interval = reducedMotion ? 40 : 560;

    const timers = steps.slice(1).map((_, index) => window.setTimeout(
      () => setActiveStep(index + 1),
      interval * (index + 1),
    ));

    void analyzeTranscript(transcript, { signal: controller.signal })
      .then(onComplete)
      .catch((analysisError: unknown) => {
        if (!controller.signal.aborted) setError(errorMessage(analysisError));
      });

    return () => {
      controller.abort();
      timers.forEach(window.clearTimeout);
    };
  }, [attempt, onComplete, transcript]);

  return (
    <main className="app-main">
      <section className="container processing-view" aria-live="polite">
        <div className="eyebrow">Legal intake</div>
        <h1>Analyzing transcript.</h1>
        <div className="process-list">
          {steps.map((step, index) => (
            <div className={`process-step${index === activeStep ? ' is-active' : ''}${index < activeStep ? ' is-complete' : ''}`} key={step}>
              {step}
            </div>
          ))}
        </div>
        {error && (
          <div className="processing-error" role="alert">
            <strong>Analysis could not finish.</strong>
            <p>{error}</p>
            <div className="processing-actions">
              <button
                className="button"
                type="button"
                onClick={() => {
                  setActiveStep(0);
                  setError(null);
                  setAttempt((value) => value + 1);
                }}
              >
                Try again
              </button>
              <button className="text-button" type="button" onClick={onCancel}>Back to intakes</button>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
