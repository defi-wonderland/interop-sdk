export function DisplaySkeleton() {
  return (
    <div className='bg-surface rounded-2xl border border-border p-6 animate-pulse'>
      <div className='flex flex-col gap-4'>
        <div className='flex items-center justify-between'>
          <div className='h-5 bg-border/40 rounded w-1/3' />
          <div className='h-8 w-8 bg-border/30 rounded-lg' />
        </div>
        <div className='h-14 bg-border/20 rounded-xl' />
        <div className='grid grid-cols-3 gap-3 mt-1'>
          <div className='h-12 bg-border/20 rounded-lg' />
          <div className='h-12 bg-border/20 rounded-lg' />
          <div className='h-12 bg-border/20 rounded-lg' />
        </div>
      </div>
    </div>
  );
}
