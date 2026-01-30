interface ExampleButtonsProps {
  examples: Array<{ key: string; description: string; onClick: () => void }>;
}

export function ExampleButtons({ examples }: ExampleButtonsProps) {
  return (
    <div className='flex items-center gap-2 flex-wrap'>
      <span className='text-xs font-medium text-text-muted font-sans'>Try:</span>
      {examples.map((example) => (
        <button
          key={example.key}
          onClick={example.onClick}
          className='px-2.5 py-1 bg-surface-secondary border border-border text-text-primary rounded-full text-[11px] transition-colors cursor-pointer hover:border-border-focus'
        >
          {example.description}
        </button>
      ))}
    </div>
  );
}
