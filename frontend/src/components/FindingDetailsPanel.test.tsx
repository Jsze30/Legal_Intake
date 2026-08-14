import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { ReviewFinding } from '../types';
import { FindingDetailsPanel } from './FindingDetailsPanel';

describe('FindingDetailsPanel', () => {
  it('renders a previously stored finding that predates expanded detail fields', () => {
    const legacyFinding = {
      id: 'damages',
      category: 'Damages',
      status: 'Strong',
      title: 'Significant treatment',
      explanation: 'The intake identifies substantial treatment.',
      evidenceTurnIndex: 2,
    } as ReviewFinding;

    render(
      <FindingDetailsPanel
        finding={legacyFinding}
        evidence={{ speaker: 'Caller', text: 'I fractured my wrist and needed surgery.' }}
        turnNumber={3}
        onClose={vi.fn()}
        onSeeSource={vi.fn()}
      />,
    );

    expect(screen.getByRole('region', { name: 'Damages details' })).toBeVisible();
    expect(screen.getByText(/Caller statement from turn 3/)).toBeVisible();
    expect(screen.getByRole('button', { name: 'See source in transcript →' })).toBeVisible();
  });
});
