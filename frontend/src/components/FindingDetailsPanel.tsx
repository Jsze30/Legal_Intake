import type { ReviewFinding, TranscriptTurn } from '../types';

interface FindingDetailsPanelProps {
  finding: ReviewFinding;
  evidence: TranscriptTurn;
  turnNumber: number;
  attentionItem?: string;
  onClose: () => void;
  onSeeSource: () => void;
}

const categoryInsight: Record<ReviewFinding['category'], string> = {
  Damages: 'The damages analysis weighs treatment intensity, injury duration, medical expenses, and disruption to work or daily life. The current call provides the starting point, while medical records will determine the supported value.',
  Liability: 'The liability analysis looks for a clear incident sequence, fault facts, independent witnesses, and contemporaneous documentation. Consistency between the call and collected records will strengthen this assessment.',
  Coverage: 'The coverage analysis identifies every potential policy and the facts that may trigger it. Carrier confirmation, policy status, applicable limits, and any exclusions still need to be verified directly.',
};

export function FindingDetailsPanel({ finding, evidence, turnNumber, attentionItem, onClose, onSeeSource }: FindingDetailsPanelProps) {
  const fallbackAssessment = finding.status === 'Strong'
    ? 'The call contains direct support for this part of the case. It should still be confirmed against records and third-party evidence before the final decision.'
    : 'The call identifies a potential path, but the available facts are not complete enough to treat this part of the case as confirmed.';
  const detailSummary = finding.detailSummary
    ?? `${categoryInsight[finding.category]} Compare this assessment with the supporting records before the final intake decision.`;
  const supportingFacts = finding.supportingFacts?.length
    ? finding.supportingFacts
    : [`Caller statement from turn ${turnNumber}: ${evidence.text}`];
  const whyItMatters = finding.whyItMatters ?? categoryInsight[finding.category];
  const assessment = finding.assessment ?? fallbackAssessment;

  return (
    <section className="detail-panel" role="region" aria-label={`${finding.category} details`}>
      <header className="detail-panel-head">
        <div>
          <div className="eyebrow">{finding.category} analysis</div>
          <h2>{finding.title}</h2>
        </div>
        <button className="detail-close" type="button" onClick={onClose}>Close ↑</button>
      </header>

      <p className="detail-lede">{detailSummary}</p>

      <section className="detail-facts">
        <div className="detail-label">Key facts used</div>
        <ul>
          {supportingFacts.map((fact) => <li key={fact}>{fact}</li>)}
        </ul>
      </section>

      <div className="detail-insights">
        <section>
          <div className="detail-label">Why it matters</div>
          <p>{whyItMatters}</p>
        </section>
        <section>
          <div className="detail-label">Legal assessment</div>
          <p>{assessment}</p>
        </section>
      </div>

      <section className="evidence-card">
        <div className="detail-label">Transcript evidence</div>
        <div className="evidence-meta">{evidence.speaker} · turn {turnNumber}</div>
        <blockquote>“{evidence.text}”</blockquote>
        <button className="evidence-link" type="button" onClick={onSeeSource}>See source in transcript →</button>
      </section>

      {attentionItem && (
        <section className="detail-next-step">
          <div className="detail-label">Still needs attention</div>
          <p>{attentionItem}</p>
        </section>
      )}
    </section>
  );
}
