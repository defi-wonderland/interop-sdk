export default function Home() {
  return (
    <main className='min-h-screen flex items-center justify-center p-8'>
      <div className='max-w-xl flex flex-col gap-4 text-center'>
        <h1 className='text-3xl font-bold'>Cross-chain benchmark</h1>
        <p className='text-text-secondary'>
          Compare quote performance across providers using{' '}
          <code className='font-mono'>@wonderland/interop-cross-chain</code>.
        </p>
        <p className='text-text-secondary text-sm'>Coming soon.</p>
      </div>
    </main>
  );
}
