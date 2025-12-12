export function DisplaySkeleton() {
  return (
    <div className='relative backdrop-blur-xl bg-surface/50 rounded-3xl border border-border/30 p-6 shadow-2xl animate-pulse'>
      <div className='flex flex-col gap-4'>
        <div className='h-6 bg-border/30 rounded-lg w-1/3' />
        <div className='h-16 bg-border/20 rounded-xl' />
        <div className='grid grid-cols-2 gap-4 mt-2'>
          <div className='h-4 bg-border/20 rounded' />
          <div className='h-4 bg-border/20 rounded' />
        </div>
      </div>
    </div>
  );
}
