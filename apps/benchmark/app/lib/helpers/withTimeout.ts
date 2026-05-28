/**
 * Races a promise against a timeout. Clears the timer in `finally` so we never
 * leak a pending `setTimeout` after the underlying promise resolves first.
 */
export function withTimeout<T>(promise: Promise<T>, ms: number, message = 'TIMEOUT'): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(message)), ms);
  });

  return Promise.race([promise, timeoutPromise]).finally(() => {
    if (timeoutId !== undefined) clearTimeout(timeoutId);
  });
}
