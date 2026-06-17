// Outline chip shown in place of a rank / badges for a provider with no global
// feed (Bungee). Mirrors the dimmed "NO FEED" pill in the mobile design.
export function NoFeedChip(): React.ReactNode {
  return (
    <span className='inline-flex items-center whitespace-nowrap border border-border-subtle px-2 py-[3px] font-mono text-[8px] font-medium uppercase tracking-[0.05em] text-text-muted'>
      no feed
    </span>
  );
}
