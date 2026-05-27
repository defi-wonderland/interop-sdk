const TESTNET_PARAM = 'testnet';
const MODE_PARAM = 'mode';
const MODE_BUILD_VALUE = 'build';
const SUBMISSION_PARAM = 'submission';
const SUBMISSION_GASLESS_VALUE = 'gasless';

function readParam(name: string): string | null {
  if (typeof window === 'undefined') return null;
  return new URLSearchParams(window.location.search).get(name);
}

/** Updates a single URL search param without triggering navigation. Pass `null` to delete it. */
function writeParam(name: string, value: string | null): void {
  if (typeof window === 'undefined') return;
  const url = new URL(window.location.href);
  if (value === null) {
    url.searchParams.delete(name);
  } else {
    url.searchParams.set(name, value);
  }
  if (url.search !== window.location.search) {
    window.history.replaceState({}, '', url.toString());
  }
}

export function readIsTestnetFromUrl(): boolean {
  return readParam(TESTNET_PARAM) === 'true';
}

export function readBuildModeFromUrl(): boolean {
  return readParam(MODE_PARAM) === MODE_BUILD_VALUE;
}

export function readGaslessSubmissionFromUrl(): boolean {
  return readParam(SUBMISSION_PARAM) === SUBMISSION_GASLESS_VALUE;
}

export function writeIsTestnetParam(isTestnet: boolean): void {
  writeParam(TESTNET_PARAM, isTestnet ? 'true' : null);
}

export function writeBuildModeParam(isBuildMode: boolean): void {
  writeParam(MODE_PARAM, isBuildMode ? MODE_BUILD_VALUE : null);
}

export function writeGaslessSubmissionParam(isGasless: boolean): void {
  writeParam(SUBMISSION_PARAM, isGasless ? SUBMISSION_GASLESS_VALUE : null);
}
