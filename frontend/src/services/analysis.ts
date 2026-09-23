import type { IntakeReview, ReviewFinding, TranscriptCase } from '../types';
import { createDemoIntakeResult, waitForDemoResult } from './demo-analysis';
import { processIntake, type IntakeRequestOptions, type IntakeResult } from './intakes-api';

export interface AnalysisOptions extends IntakeRequestOptions {
  demoDelayMs?: number;
  demoMode?: boolean;
}

function clean(value: string | null | undefined): string | null {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

function joinName(firstName: string | null | undefined, lastName: string | null | undefined): string | null {
  return clean([firstName, lastName].filter(Boolean).join(' '));
}

export function inferClientName(transcript: TranscriptCase): string | null {
  const callerOpening = transcript.transcript
    .filter((turn) => turn.speaker.toLowerCase().includes('caller'))
    .slice(0, 10)
    .map((turn) => turn.text)
    .join(' ')
    .replace(/-I(?:'m| am)\b/g, '. I am');
  const patterns = [
    /[Mm]y full name is\s+([A-Z][A-Za-z'-]+(?:\s+[A-Z][A-Za-z'-]+){0,3})/,
    /[Mm]y name is\s+([A-Z][A-Za-z'-]+(?:\s+[A-Z][A-Za-z'-]+){0,3})/,
    /[Tt]his is\s+([A-Z][A-Za-z'-]+(?:\s+[A-Z][A-Za-z'-]+){0,3})/,
    /[Ii](?:'| a)m\s+([A-Z][A-Za-z'-]+(?:\s+[A-Z][A-Za-z'-]+){0,3})/,
  ];

  for (const pattern of patterns) {
    const match = callerOpening.match(pattern);
    if (match?.[1]) return match[1].replace(/[.,].*$/, '');
  }
  return null;
}

function humanize(value: string | null | undefined, fallback: string): string {
  const normalized = clean(value);
  if (!normalized) return fallback;
  return normalized.replace(/[_-]+/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatIncidentDate(incident: IntakeResult['incident']): string {
  if (incident?.occurredAtText) return incident.occurredAtText;
  if (!incident?.occurredAt) return 'Date to verify';

  const date = new Date(incident.occurredAt);
  if (Number.isNaN(date.getTime())) return incident.occurredAt;
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date);
}

function findEvidenceTurn(
  transcript: TranscriptCase,
  values: Array<string | null | undefined>,
  fallback: RegExp,
): number {
  const terms = [...new Set(values
    .flatMap((value) => clean(value)?.split(/\s+/) ?? [])
    .filter((term) => term.length >= 4)
    .map((term) => term.toLocaleLowerCase()))];
  let bestIndex = -1;
  let bestScore = 0;
  const firstCallerIndex = transcript.transcript.findIndex((turn) => (
    turn.speaker.toLowerCase().includes('caller')
  ));

  transcript.transcript.forEach((turn, index) => {
    if (firstCallerIndex >= 0 && !turn.speaker.toLowerCase().includes('caller')) return;
    const text = turn.text.toLocaleLowerCase();
    const termScore = terms.filter((term) => text.includes(term)).length * 2;
    const fallbackScore = fallback.test(turn.text) ? 1 : 0;
    const score = termScore + fallbackScore;
    if (score > bestScore) {
      bestScore = score;
      bestIndex = index;
    }
  });
  return bestIndex >= 0 ? bestIndex : Math.max(firstCallerIndex, 0);
}

function amountIsPositive(value: string | number | null): boolean {
  if (value === null) return false;
  const amount = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(amount) && amount > 0;
}

function formatAmount(value: string | number | null): string | null {
  if (!amountIsPositive(value)) return null;
  const amount = typeof value === 'number' ? value : Number(value);
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(amount);
}

function uniqueFacts(values: Array<string | null | undefined>): string[] {
  return [...new Set(values.map((value) => clean(value)).filter((value): value is string => Boolean(value)))];
}

function buildReview(transcript: TranscriptCase, result: IntakeResult): IntakeReview {
  const treatmentText = result.treatments
    .flatMap((treatment) => [treatment.treatmentType, treatment.diagnosis, treatment.notes, treatment.provider.name]);
  const hasSubstantialTreatment = result.treatments.some((treatment) => (
    amountIsPositive(treatment.billedAmount)
    || /surgery|operation|fracture|hospital|emergency|injection/i.test(
      [treatment.treatmentType, treatment.diagnosis, treatment.notes].filter(Boolean).join(' '),
    )
  ));
  const hasTreatment = result.treatments.length > 0;
  const damagesStrong = hasSubstantialTreatment;

  const liabilityText = [
    result.incident?.description,
    ...result.defendants.map((defendant) => defendant.allegedFault),
    result.policeReport?.agencyName,
    result.policeReport?.reportNumber,
    ...result.witnesses.map((witness) => witness.statementSummary),
  ];
  const hasLiabilitySupport = Boolean(
    result.policeReport
    || result.witnesses.length
    || result.defendants.some((defendant) => clean(defendant.allegedFault)),
  );

  const verifiedPolicies = result.insurancePolicies.filter((policy) => policy.coverageStatus === 'verified');
  const identifiedPolicies = result.insurancePolicies.filter((policy) => policy.coverageStatus !== 'denied');
  const coverageStrong = verifiedPolicies.length > 0;
  const coverageText = result.insurancePolicies.flatMap((policy) => [
    policy.carrierName,
    policy.policyNumber,
    policy.insuranceType,
  ]);
  const treatmentFacts = uniqueFacts(result.treatments.flatMap((treatment) => [
    treatment.diagnosis ? `Diagnosis: ${treatment.diagnosis}` : null,
    treatment.treatmentType ? `Treatment: ${treatment.treatmentType}` : null,
    treatment.provider.name ? `Provider: ${treatment.provider.name}` : null,
    formatAmount(treatment.billedAmount) ? `Reported charges: ${formatAmount(treatment.billedAmount)}` : null,
    treatment.notes ? `Clinical detail: ${treatment.notes}` : null,
  ]));
  const liabilityFacts = uniqueFacts([
    result.incident?.description ? `Incident account: ${result.incident.description}` : null,
    ...result.defendants.map((defendant) => defendant.allegedFault ? `Alleged fault: ${defendant.allegedFault}` : null),
    result.policeReport?.reportNumber
      ? `Police report: ${[result.policeReport.agencyName, result.policeReport.reportNumber].filter(Boolean).join(' · ')}`
      : null,
    ...result.witnesses.map((witness) => witness.statementSummary ? `Witness account: ${witness.statementSummary}` : null),
  ]);
  const coverageFacts = uniqueFacts(result.insurancePolicies.map((policy) => {
    const carrier = clean(policy.carrierName) ?? 'Unconfirmed carrier';
    const limit = formatAmount(policy.policyLimit);
    return `${carrier} ${humanize(policy.insuranceType, 'insurance')} coverage is ${policy.coverageStatus}${limit ? ` with a reported limit of ${limit}` : ''}.`;
  }));
  const diagnoses = uniqueFacts(result.treatments.map((treatment) => treatment.diagnosis));
  const treatmentTypes = uniqueFacts(result.treatments.map((treatment) => treatment.treatmentType));
  const providers = uniqueFacts(result.treatments.map((treatment) => treatment.provider.name));
  const totalReportedCharges = result.treatments.reduce((total, treatment) => {
    const amount = typeof treatment.billedAmount === 'number'
      ? treatment.billedAmount
      : Number(treatment.billedAmount);
    return Number.isFinite(amount) ? total + amount : total;
  }, 0);
  const chargesText = totalReportedCharges > 0 ? formatAmount(totalReportedCharges) : null;
  const primaryDiagnosis = diagnoses[0] ?? 'the reported injuries';
  const primaryTreatment = treatmentTypes[0] ?? 'the reported treatment';
  const providerText = providers.length ? providers.join(', ') : 'the identified providers';
  const incidentAccount = clean(result.incident?.description);
  const allegedFault = clean(result.defendants.find((defendant) => clean(defendant.allegedFault))?.allegedFault);
  const reportReference = result.policeReport?.reportNumber
    ? `${clean(result.policeReport.agencyName) ?? 'the responding agency'} report ${result.policeReport.reportNumber}`
    : null;
  const witnessCount = result.witnesses.length;
  const primaryPolicy = identifiedPolicies[0];
  const primaryCarrier = clean(primaryPolicy?.carrierName) ?? 'an unconfirmed carrier';
  const primaryLimit = primaryPolicy ? formatAmount(primaryPolicy.policyLimit) : null;
  const rideshareCoverage = /rideshare|lyft|uber/i.test([
    result.incident?.incidentType,
    result.incident?.description,
    primaryPolicy?.carrierName,
  ].filter(Boolean).join(' '));

  const findings: ReviewFinding[] = [
    {
      id: 'damages',
      category: 'Damages',
      status: damagesStrong ? 'Strong' : 'Verify',
      title: damagesStrong ? 'Significant treatment' : hasTreatment ? 'Treatment reported' : 'Treatment unknown',
      explanation: damagesStrong
        ? 'The intake identifies substantial medical treatment, injuries, or related charges.'
        : hasTreatment
          ? 'Medical treatment is identified, but severity and supporting records still need verification.'
          : 'No medical treatment was extracted from the transcript.',
      detailSummary: hasTreatment
        ? `Finch identified ${result.treatments.length} treatment entr${result.treatments.length === 1 ? 'y' : 'ies'} in the extracted intake. The combination of diagnoses, treatment intensity, providers, and reported charges informs the damages assessment, but the value remains dependent on records, causation, prognosis, and any continuing limitations.`
        : 'The extracted intake does not contain enough medical information to evaluate injury severity, treatment duration, or likely case value. Those facts need to be collected before damages can be assessed reliably.',
      supportingFacts: treatmentFacts.length ? treatmentFacts : ['No specific treatment, diagnosis, provider, or billed amount was extracted.'],
      whyItMatters: hasTreatment
        ? `${primaryDiagnosis} requiring ${primaryTreatment}${chargesText ? ` with ${chargesText} in reported charges` : ''} indicates more than minor, self-limited harm. Treatment intensity and objective diagnosis are central to both case value and the credibility of the claimed limitations.`
        : 'Without a diagnosis, treatment course, provider, or billed amount, Finch cannot distinguish a significant injury from temporary symptoms or estimate the likely damages range.',
      assessment: hasTreatment
        ? `The present damages assessment is supported by treatment through ${providerText}${chargesText ? ` and ${chargesText} in extracted charges` : ''}. Finch should obtain the medical records, itemized bills, causation opinions, prognosis, and work-loss documentation before treating the damages picture as complete.`
        : 'The transcript does not provide enough medical detail for a reliable damages assessment. Treatment history, current symptoms, prognosis, prior similar conditions, and economic losses remain open.',
      evidenceTurnIndex: findEvidenceTurn(transcript, treatmentText, /surgery|hospital|doctor|treatment|therapy|injur|pain/i),
    },
    {
      id: 'liability',
      category: 'Liability',
      status: hasLiabilitySupport ? 'Strong' : 'Verify',
      title: hasLiabilitySupport ? 'Supporting facts identified' : 'Facts need review',
      explanation: hasLiabilitySupport
        ? 'The intake identifies fault details, a police report, or a witness that may support liability.'
        : 'Confirm the incident sequence, responsible parties, witnesses, and available documentation.',
      detailSummary: hasLiabilitySupport
        ? 'Finch found independent liability indicators beyond the existence of an incident, including attributed fault, official reporting, or witness information. The next step is to compare the caller account against the report, physical evidence, and third-party statements for consistency.'
        : 'The current intake describes an incident but does not provide enough independent support to make a confident liability assessment. Fault allocation, documentation, and possible comparative negligence remain open.',
      supportingFacts: liabilityFacts.length ? liabilityFacts : ['No police report, witness account, or specific allegation of fault was extracted.'],
      whyItMatters: hasLiabilitySupport
        ? `${allegedFault ? `The specific allegation that ${allegedFault.replace(/\.$/, '')}` : 'The specific fault account'}${reportReference ? `, together with ${reportReference},` : ''} gives Finch facts that can be tested against independent evidence. That is materially stronger than a conclusion that the other party was simply at fault.`
        : 'A viable claim requires a defensible account of who owed a duty, what they did wrong, and how that conduct caused the incident. Those elements are not yet supported by independent details in the extracted intake.',
      assessment: hasLiabilitySupport
        ? `${incidentAccount ? `The caller reports: ${incidentAccount}` : 'The incident sequence contains attributed fault.'} ${reportReference ? `${reportReference} provides a direct verification path.` : 'No police report number was extracted.'} ${witnessCount ? `${witnessCount} witness${witnessCount === 1 ? '' : 'es'} may provide independent support.` : 'No witness was extracted, so the report and physical evidence will carry more weight.'}`
        : 'Finch should obtain the full incident sequence, identify every responsible party, preserve photos or video, locate witnesses, and determine whether comparative fault could reduce recovery.',
      evidenceTurnIndex: findEvidenceTurn(transcript, liabilityText, /police|report|witness|fault|hit|slip|collision|crash|t-bon/i),
    },
    {
      id: 'coverage',
      category: 'Coverage',
      status: coverageStrong ? 'Strong' : 'Verify',
      title: coverageStrong ? 'Coverage verified' : identifiedPolicies.length ? 'Coverage identified' : 'Coverage unknown',
      explanation: coverageStrong
        ? 'At least one extracted insurance policy is marked as verified.'
        : identifiedPolicies.length
          ? 'At least one potential policy was identified and still requires verification.'
          : 'No available insurance policy was extracted from the transcript.',
      detailSummary: identifiedPolicies.length
        ? `Finch identified ${identifiedPolicies.length} potential coverage source${identifiedPolicies.length === 1 ? '' : 's'}. A reported policy creates a path to recovery, but carrier acceptance, policy status, applicable limits, exclusions, and the insured activity at the time of loss still control the practical coverage analysis.`
        : 'No usable policy information was extracted from the intake. Coverage cannot be evaluated until the responsible parties, carriers, policy types, and loss-date status are identified.',
      supportingFacts: coverageFacts.length ? coverageFacts : ['No carrier, policy type, policy number, status, or limit was extracted.'],
      whyItMatters: primaryPolicy
        ? `${primaryCarrier} is the first identified source of recovery${primaryLimit ? `, with a reported limit of ${primaryLimit}` : ''}. Identifying a policy is necessary but does not establish that the carrier has accepted coverage or that the stated limit applies to this loss.`
        : 'Even a strong liability and damages case may not be economically viable without an available defendant or applicable insurance policy. No recovery source is currently identified.',
      assessment: primaryPolicy
        ? `The ${humanize(primaryPolicy.insuranceType, 'insurance')} policy is currently marked ${primaryPolicy.coverageStatus}, not necessarily verified.${rideshareCoverage ? ' Confirm the ride phase, the driver policy, the platform policy, and any excess or uninsured motorist layer.' : ' Obtain the declarations, confirm the policy was active on the loss date, and verify applicable limits and exclusions.'}`
        : 'Finch should identify the responsible parties, request insurance information, confirm all first-party and third-party policies, and investigate additional coverage layers before making the final intake decision.',
      evidenceTurnIndex: findEvidenceTurn(transcript, coverageText, /insurance|policy|carrier|coverage|liability limit/i),
    },
  ];

  const attentionItems: string[] = [];
  if (!hasTreatment) attentionItems.push('Confirm treatment and injuries');
  else if (!hasSubstantialTreatment) attentionItems.push('Request medical records and bills');
  if (!hasLiabilitySupport) attentionItems.push('Confirm liability evidence');
  if (!identifiedPolicies.length) attentionItems.push('Identify available insurance coverage');
  else if (!coverageStrong) attentionItems.push('Verify policy status and limits');
  if (attentionItems.length === 0) attentionItems.push('Review supporting records before the final decision');

  const shouldSign = damagesStrong && hasLiabilitySupport && identifiedPolicies.length > 0;
  const highConfidence = damagesStrong && hasLiabilitySupport && coverageStrong;
  const strongCount = findings.filter((finding) => finding.status === 'Strong').length;
  const inferredClientName = inferClientName(transcript);
  const extractedClientName = joinName(result.client?.firstName, result.client?.lastName);
  const extractedNameMatchesCaller = Boolean(
    inferredClientName
    && extractedClientName
    && extractedClientName.toLocaleLowerCase().startsWith(inferredClientName.toLocaleLowerCase()),
  );

  return {
    transcriptId: transcript.id,
    caseName: extractedNameMatchesCaller
      ? extractedClientName!
      : inferredClientName ?? extractedClientName ?? 'New intake',
    matterType: humanize(result.incident?.incidentType, 'Personal injury intake'),
    location: clean(result.incident?.location) ?? 'Location to verify',
    incidentDate: formatIncidentDate(result.incident),
    recommendation: shouldSign ? 'Sign this case.' : 'Review this case.',
    confidence: highConfidence ? 'High confidence' : 'Preliminary review',
    summary: shouldSign
      ? 'The extracted facts show meaningful damages, liability support, and a potential source of coverage. Verify the open items before final acceptance.'
      : `${strongCount} of 3 decision pillars have strong extracted support. Resolve the open items before making the final intake decision.`,
    findings,
    attentionItems,
  };
}

export async function analyzeTranscript(
  transcript: TranscriptCase,
  options: AnalysisOptions = {},
): Promise<IntakeReview> {
  const demoMode = options.demoMode ?? import.meta.env.VITE_DEMO_MODE === 'true';
  if (demoMode) {
    await waitForDemoResult(options.demoDelayMs ?? 1_400, options.signal);
    return buildReview(transcript, createDemoIntakeResult(transcript));
  }

  const result = await processIntake(transcript, options);
  return buildReview(transcript, result);
}
