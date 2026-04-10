export type BrowserChannel = 'chrome' | 'msedge';

const BASE_BROWSER_ARGS = [
  '--disable-blink-features=AutomationControlled',
  '--disable-infobars',
  '--no-first-run',
  '--no-default-browser-check',
];

export function getBrowserChannels(preferred: string | undefined): BrowserChannel[] {
  const supported: BrowserChannel[] = ['chrome', 'msedge'];
  if (preferred === 'chrome' || preferred === 'msedge') {
    return [preferred, ...supported.filter(channel => channel !== preferred)];
  }
  return supported;
}

export function buildBrowserArgs(profile: string): string[] {
  const args = [...BASE_BROWSER_ARGS];
  const trimmedProfile = profile.trim();
  if (trimmedProfile) {
    args.push(`--profile-directory=${trimmedProfile}`);
  }
  return args;
}

export function formatFatalError(error: unknown): string {
  if (error instanceof Error) {
    return error.stack || error.message;
  }
  return String(error);
}

export function applyFatalExit(
  error: unknown,
  logger: (message?: unknown) => void = console.error,
) {
  logger('[fatal] Sync task crashed.');
  logger(formatFatalError(error));
  process.exitCode = 1;
}
