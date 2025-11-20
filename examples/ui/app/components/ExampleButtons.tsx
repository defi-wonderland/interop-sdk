interface ExampleButtonsProps {
  examples: Array<{ key: string; description: string; onClick: () => void }>;
}

export function ExampleButtons({ examples }: ExampleButtonsProps) {
  return (
    <div className='flex flex-col gap-2'>
      <div className='text-sm font-medium text-text-secondary'>Examples</div>
      <div className='flex flex-wrap gap-2'>
        {examples.map((example) => (
          <button
            key={example.key}
            onClick={example.onClick}
            className='px-3 py-1.5 bg-accent-light/50 hover:bg-accent-light text-accent rounded-lg text-xs font-medium transition-colors cursor-pointer'
          >
            {example.description}
          </button>
        ))}
      </div>
    </div>
  );
}
