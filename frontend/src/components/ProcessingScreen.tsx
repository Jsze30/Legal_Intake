import { useEffect, useState } from 'react';
import { analyzeTranscript } from '../services/analysis';
import type { IntakeReview, TranscriptCase } from '../types';

interface ProcessingScreenProps {
  transcript: TranscriptCase;
  onComplete: (review: IntakeReview) => void;
}

const steps = [
  'Reading the call',
  'Assessing damages, liability, and coverage',
  'Linking findings to source evidence',
];

export function ProcessingScreen({ transcript, onComplete }: ProcessingScreenProps) {
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const interval = reducedMotion ? 40 : 560;
    const timers = steps.slice(1).map((_, index) => window.setTimeout(() => setActiveStep(index + 1), interval * (index + 1)));
    const completeTimer = window.setTimeout(() => {
      void analyzeTranscript(transcript).then((review) => {
        if (!cancelled) onComplete(review);
      });
    }, interval * steps.length);

    return () => {
      cancelled = true;
      timers.forEach(window.clearTimeout);
      window.clearTimeout(completeTimer);
    };
  }, [onComplete, transcript]);

  return (
    <main className="app-main">
      <section className="container processing-view" aria-live="polite">
        <div className="eyebrow">Finch intake</div>
        <h1>Analyzing transcript.</h1>
        <div className="process-list">
          {steps.map((step, index) => (
            <div className={`process-step${index === activeStep ? ' is-active' : ''}${index < activeStep ? ' is-complete' : ''}`} key={step}>
              {step}
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
