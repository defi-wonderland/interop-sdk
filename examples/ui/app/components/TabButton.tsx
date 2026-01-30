interface TabButtonProps {
  isActive: boolean;
  onClick: () => void;
  children: React.ReactNode;
}

export function TabButton({ isActive, onClick, children }: TabButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-[13px] font-medium transition-all cursor-pointer ${
        isActive
          ? 'bg-background text-text-primary shadow-sm border border-border'
          : 'bg-transparent text-text-muted hover:text-text-secondary'
      }`}
    >
      {children}
    </button>
  );
}
