import { chromium } from 'playwright';
import { join } from 'path';

export interface BrowserConfig {
  userDataDir: string;
  profile: string;
  headless: boolean;
}

export async function launchChrome(config: BrowserConfig) {
  const profileDir = join(config.userDataDir, config.profile);
  console.log(`[browser] Launching Chrome with profile: ${profileDir}`);

  const context = await chromium.launchPersistentContext(profileDir, {
    channel: 'chrome',
    headless: config.headless,
    viewport: { width: 1440, height: 900 },
    args: [
      '--disable-blink-features=AutomationControlled',
      '--disable-infobars',
      '--no-first-run',
      '--no-default-browser-check',
    ],
  });

  console.log('[browser] Chrome launched successfully');
  return context;
}
