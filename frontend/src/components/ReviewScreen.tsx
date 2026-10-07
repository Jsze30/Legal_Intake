import { useCallback, useState } from 'react';
import type { Decision, IntakeReview, ReviewFinding, TranscriptCase } from '../types';
import { FindingDetailsPanel } from './FindingDetailsPanel';
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
  const [selectedFinding, setSelectedFinding] = useState<ReviewFinding | null>(null);

  const openTranscript = (turn: number | null = null) => {
    setHighlightedTurn(turn);
    setDrawerOpen(true);
  };
  const closeTranscript = useCallback(() => setDrawerOpen(false), []);
  const closeDetails = useCallback(() => setSelectedFinding(null), []);

  const openFindingSource = () => {
    if (!selectedFinding) return;
    const turn = selectedFinding.evidenceTurnIndex;
    setSelectedFinding(null);
    openTranscript(turn);
  };

  const attentionForFinding = (finding: ReviewFinding) => {
    const categoryTerms: Record<ReviewFinding['category'], RegExp> = {
      Damages: /treatment|medical|injur|bill|damage/i,
      Liability: /liability|fault|incident|witness|report/i,
      Coverage: /coverage|insurance|policy|carrier|limit/i,
    };
    return review.attentionItems.find((item) => categoryTerms[finding.category].test(item));
  };

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
                <span>{review.incidentDate}</span>
              </div>
            </div>
            <button className="text-button" type="button" onClick={() => openTranscript()}>Read full transcript →</button>
          </header>

          <section className="review-grid reveal-stage delay-2" aria-label="Case recommendation">
            <div className="review-main">
              <article className="recommendation">
                <div className="recommendation-top">
                  <div className="eyebrow">Legal recommendation</div>
                </div>
                <h2>{review.recommendation}</h2>
                <p className="summary">{review.summary}</p>
              </article>

              <div className="pillars" aria-label="Decision pillars">
                {review.findings.map((finding) => (
                  <article className="pillar" key={finding.id}>
                    <div className="pillar-head">
                      <div className="eyebrow">{finding.category}</div>
                    </div>
                    <h3>{finding.title}</h3>
                    <p>{finding.explanation}</p>
                    <button
                      className="evidence-link"
                      type="button"
                      aria-expanded={selectedFinding?.id === finding.id}
                      onClick={() => setSelectedFinding(selectedFinding?.id === finding.id ? null : finding)}
                    >
                      {selectedFinding?.id === finding.id ? 'See details ↓' : 'See details →'}
                    </button>
                  </article>
                ))}
              </div>

            </div>

            <aside className="review-side">
              <section className="side-section">
                <div className="side-title"><h3>Needs attention</h3><span className="count">{review.attentionItems.length} item{review.attentionItems.length === 1 ? '' : 's'}</span></div>
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

            {selectedFinding && (
              <FindingDetailsPanel
                finding={selectedFinding}
                evidence={transcript.transcript[selectedFinding.evidenceTurnIndex] ?? transcript.transcript[0]}
                turnNumber={selectedFinding.evidenceTurnIndex + 1}
                attentionItem={attentionForFinding(selectedFinding)}
                onClose={closeDetails}
                onSeeSource={openFindingSource}
              />
            )}
          </section>

          <button className="transcript-row reveal-stage delay-3" type="button" onClick={() => openTranscript()}>
            <span><strong>Evidence from the call</strong><span>{transcript.turnCount} turns · every finding links to a source</span></span>
            <span className="text-button">Open transcript →</span>
          </button>
        </div>
      </main>

      <TranscriptDrawer transcript={transcript} open={drawerOpen} highlightedTurn={highlightedTurn} onClose={closeTranscript} />
    </>
  );
}
