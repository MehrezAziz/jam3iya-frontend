'use client';

import { Plus } from 'lucide-react';
import { HighlightMatch } from '@/components/highlight-match';
import type { BeneficiaryDonationPickHit } from '@/lib/api/beneficiaries';

export function BeneficiaryDonationPickRow({
  hit,
  disabled,
  dimmed,
  onPick,
  onAddToCampaign,
  priorLabel,
  notOnCampaignLabel,
  addToCampaignTitle,
}: {
  hit: BeneficiaryDonationPickHit;
  disabled?: boolean;
  dimmed?: boolean;
  onPick: () => void;
  onAddToCampaign?: () => void;
  priorLabel?: string;
  notOnCampaignLabel?: string;
  addToCampaignTitle?: string;
}) {
  const showPhone = Boolean(hit.phone && hit.phoneHighlight);
  const showCin = Boolean(hit.cin && hit.cinHighlight);

  return (
    <li
      className={`flex items-center gap-1 border-b border-border last:border-0 ${dimmed ? 'bg-muted/40' : ''}`}
    >
      <button
        type="button"
        disabled={disabled}
        className={`min-w-0 flex-1 px-3 py-2 text-left text-sm ${
          !disabled ? 'hover:bg-muted' : 'cursor-not-allowed opacity-60'
        }`}
        onClick={onPick}
      >
        <span className="font-medium">{hit.fullName}</span>
        <span className="text-muted-foreground"> · {hit.code}</span>
        {(showPhone || showCin) ? (
          <span className="ms-1 text-xs text-muted-foreground">
            ·{' '}
            {showPhone ? <HighlightMatch text={hit.phone!} highlight={hit.phoneHighlight} /> : null}
            {showPhone && showCin ? ' · ' : null}
            {showCin ? <HighlightMatch text={hit.cin!} highlight={hit.cinHighlight} /> : null}
          </span>
        ) : null}
        {priorLabel ? <span className="ms-1 text-xs text-muted-foreground">· {priorLabel}</span> : null}
        {notOnCampaignLabel ? (
          <span className="ms-1 text-xs text-muted-foreground">· {notOnCampaignLabel}</span>
        ) : null}
      </button>
      {onAddToCampaign ? (
        <button
          type="button"
          title={addToCampaignTitle}
          className="me-2 flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-primary/40 text-primary hover:bg-primary/10"
          onClick={onAddToCampaign}
        >
          <Plus className="h-4 w-4" />
        </button>
      ) : null}
    </li>
  );
}
