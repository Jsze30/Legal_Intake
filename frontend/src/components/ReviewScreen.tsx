import { useCallback, useState } from 'react';
import type { Decision, IntakeReview, TranscriptCase } from '../types';
import { TranscriptDrawer } from './TranscriptDrawer';

interface ReviewScreenProps {
  transcript: TranscriptCase;
  review: IntakeReview;
  decision: Decision | null;
  onDecision: (decision: Decision) => void;
  onBack: () => void;
}

const decisionCopy: Record<Decision, string> = {
  sign: 'Case marked to sign.',
  hold: 'Case held for attorney review.',
  decline: 'Case marked to decline.',
};

export function ReviewScreen({ transcript, review, decision, onDecision, onBack }: ReviewScreenProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [highlightedTurn, setHighlightedTurn] = useState<number | null>(null);

  const openTranscript = (turn: number | null = null) => {
    setHighlightedTurn(turn);
    setDrawerOpen(true);
  };
  const closeTranscript = useCallback(() => setDrawerOpen(false), []);

  return (
    <>
      <main className="app-main review-page">
        <div className="container">
          <div className="crumbs reveal-stage"><button type="button" onClick={onBack}>Intakes</button><span>›</span><span>Review</span></div>

          <header className="page-head reveal-stage delay-1">
            <div>
              <div className="eyebrow">New intake</div>
              <h1>{review.caseName}</h1>
              <div className="case-meta">
                <span>{review.matterType}</span><span className="dot" />
                <span>{review.location}</span><span className="dot" />
                <span>{review.incidentDate}</span><span className="status-text">AI review complete</span>
              </div>
            </div>
            <button className="text-button" type="button" onClick={() => openTranscript()}>Read full transcript ↗</button>
          </header>

          <section className="review-grid reveal-stage delay-2" aria-label="Case recommendation">
            <div className="review-main">
              <article className="recommendation">
                <div className="recommendation-top">
                  <div className="eyebrow">Finch recommendation</div>
                  <div className="confidence">{review.confidence}</div>
                </div>
                <h2>{review.recommendation}</h2>
                <p className="summary">{review.summary}</p>
              </article>

              <div className="pillars" aria-label="Decision pillars">
                {review.findings.map((finding) => (
                  <article className="pillar" key={finding.id}>
                    <div className="pillar-head">
                      <div className="eyebrow">{finding.category}</div>
                      <span className={`mini-status ${finding.status === 'Strong' ? 'good' : 'verify'}`}>{finding.status}</span>
                    </div>
                    <h3>{finding.title}</h3>
                    <p>{finding.explanation}</p>
                    <button className="evidence-link" type="button" onClick={() => openTranscript(finding.evidenceTurnIndex)}>See source ↗</button>
                  </article>
                ))}
              </div>
            </div>

            <aside className="review-side">
              <section className="side-section">
                <div className="side-title"><h3>Needs attention</h3><span className="count">{review.attentionItems.length} items</span></div>
                <div className="attention-list">
                  {review.attentionItems.map((item) => (
                    <div className="attention-item" key={item}><span className="attention-mark" /><b>{item}</b></div>
                  ))}
                </div>
              </section>
              <section className="side-section">
                <div className="side-title"><h3>Your decision</h3></div>
                <div className="actions">
                  <button className={`btn${decision === 'sign' || !decision ? ' btn-primary' : ' btn-quiet'}`} type="button" onClick={() => onDecision('sign')}>Sign case</button>
                  <button className={`btn${decision === 'hold' ? ' btn-primary' : ' btn-quiet'}`} type="button" onClick={() => onDecision('hold')}>Hold for review</button>
                  <button className={`btn${decision === 'decline' ? ' btn-primary' : ' btn-quiet'}`} type="button" onClick={() => onDecision('decline')}>Decline</button>
                </div>
                <p className="decision-note" aria-live="polite">{decision ? decisionCopy[decision] : ''}</p>
              </section>
            </aside>
          </section>

          <button className="transcript-row reveal-stage delay-3" type="button" onClick={() => openTranscript()}>
            <span><strong>Evidence from the call</strong><span>{transcript.turnCount} turns · every finding links to a source</span></span>
            <span className="text-button">Open transcript ↗</span>
          </button>
        </div>
      </main>

      <TranscriptDrawer transcript={transcript} open={drawerOpen} highlightedTurn={highlightedTurn} onClose={closeTranscript} />
    </>
  );
}
