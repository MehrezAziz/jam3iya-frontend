'use client';

import { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export function CopyableId({
  id,
  label,
  className,
}: {
  id: string;
  label?: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(id);
      setCopied(true);
      toast.success(label ? `${label} copied` : 'Copied');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Could not copy');
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      className={cn(
        'inline-flex max-w-full items-center gap-1 rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-muted-foreground hover:text-foreground',
        className,
      )}
      title={id}
    >
      <span className="truncate">{id.slice(0, 8)}…</span>
      {copied ? <Check className="h-3 w-3 shrink-0 text-green-600" /> : <Copy className="h-3 w-3 shrink-0" />}
    </button>
  );
}
