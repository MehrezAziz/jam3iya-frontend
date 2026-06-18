export interface TextHighlight {
  start: number;
  end: number;
}

export function HighlightMatch({
  text,
  highlight,
  className = 'rounded-sm bg-primary/20 font-semibold text-primary',
}: {
  text: string;
  highlight?: TextHighlight | null;
  className?: string;
}) {
  if (!highlight || highlight.start < 0 || highlight.end <= highlight.start) {
    return <>{text}</>;
  }
  const start = Math.max(0, Math.min(highlight.start, text.length));
  const end = Math.max(start, Math.min(highlight.end, text.length));
  return (
    <>
      {text.slice(0, start)}
      <span className={className}>{text.slice(start, end)}</span>
      {text.slice(end)}
    </>
  );
}
