interface TabButtonProps {
  isActive: boolean;
  onClick: () => void;
  children: React.ReactNode;
}

export function TabButton({ isActive, onClick, children }: TabButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 px-4 py-3 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
        isActive
          ? 'bg-gradient-to-r from-accent to-accent-hover text-white shadow-lg shadow-accent/30 scale-[1.02]'
          : 'bg-surface/50 text-text-secondary hover:bg-surface'
      }`}
    >
      {children}
    </button>
  );
}
