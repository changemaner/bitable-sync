import { chromium } from 'playwright';
import notifier from 'node-notifier';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import {
  applyFatalExit,
  buildBrowserArgs,
  getBrowserChannels,
} from './runtime';

interface TableConfig {
  tableId: string;
  name: string;
}

interface BitableConfig {
  name: string;
  url: string;
  tables: TableConfig[];
}

interface Config {
  bitables: BitableConfig[];
  chromeUserDataDir: string;
  chromeProfile: string;
  browserChannel?: 'chrome' | 'msedge';
  cdpUrl: string;
  syncTimeoutMs: number;
  headless: boolean;
  maxRetries: number;
  retryDelayMs: number;
}

interface SyncResult {
  bitableName: string;
  tableName: string;
  tableId: string;
  status: 'success' | 'failed' | 'timeout' | 'skipped';
  error?: string;
  retries: number;
}

interface ProgressState {
  completed: string[]; // tableIds that have been synced
  failed: string[];
  startTime: number;
}

const PROGRESS_FILE = join(__dirname, '..', '.sync-progress.json');

function loadProgress(): ProgressState {
  if (existsSync(PROGRESS_FILE)) {
    try {
      return JSON.parse(readFileSync(PROGRESS_FILE, 'utf-8'));
    } catch {
      return { completed: [], failed: [], startTime: Date.now() };
    }
  }
  return { completed: [], failed: [], startTime: Date.now() };
}

function saveProgress(progress: ProgressState) {
  writeFileSync(PROGRESS_FILE, JSON.stringify(progress, null, 2));
}

function clearProgress() {
  if (existsSync(PROGRESS_FILE)) {
    writeFileSync(PROGRESS_FILE, JSON.stringify({ completed: [], failed: [], startTime: Date.now() }));
  }
}

async function loadConfig(): Promise<Config> {
  const configPath = join(__dirname, '..', 'config.json');
  const raw = readFileSync(configPath, 'utf-8');
  const config = JSON.parse(raw);
  return {
    maxRetries: 2,
    retryDelayMs: 3000,
    ...config,
  };
}

async function launchBrowser(userDataDir: string, profile: string, headless: boolean, preferredChannel?: 'chrome' | 'msedge') {
  const channels = getBrowserChannels(preferredChannel);
  const launchErrors: string[] = [];

  console.log(`[browser] User data dir: ${userDataDir}`);
  console.log(`[browser] Profile: ${profile || 'Default browser profile'}`);

  for (const channel of channels) {
    try {
      console.log(`[browser] Trying browser channel: ${channel}`);

      const context = await chromium.launchPersistentContext(userDataDir, {
        channel,
        headless,
        viewport: { width: 1440, height: 900 },
        args: buildBrowserArgs(profile),
      });

      console.log(`[browser] Browser launched successfully with channel: ${channel}`);
      return context;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      launchErrors.push(`${channel}: ${message}`);
      console.error(`[browser] Failed to launch ${channel}: ${message}`);
    }
  }

  throw new Error(
    [
      'Unable to launch a supported browser.',
      `Checked channels: ${channels.join(', ')}`,
      `User data dir: ${userDataDir}`,
      `Profile: ${profile || 'Default'}`,
      'Please confirm Chrome or Edge is installed and that config.json points to the correct browser profile.',
      `Launch errors: ${launchErrors.join(' | ')}`,
    ].join('\n')
  );
}

async function waitForPageLoad(page: any, timeoutMs = 30000) {
  await page.waitForLoadState('networkidle', { timeout: timeoutMs }).catch(() => {
    console.log('[page] networkidle timeout, continuing anyway');
  });
  await page.waitForTimeout(2000);
}

async function scrollToSidebarItem(page: any, tableId: string) {
  // Scroll the sidebar to make the target item visible
  await page.evaluate((id) => {
    const item = document.getElementById(`bitable-ssr-sidebar-item-${id}`);
    if (item) {
      item.scrollIntoView({ block: 'center' });
    }
  }, tableId);
  await page.waitForTimeout(500);
}

async function clickTableInSidebar(page: any, tableId: string, tableName: string) {
  // First scroll to make sure the item is rendered
  await scrollToSidebarItem(page, tableId);

  const sidebarItem = `#bitable-ssr-sidebar-item-${tableId}`;
  const item = page.locator(sidebarItem);
  const isVisible = await item.isVisible().catch(() => false);

  if (!isVisible) {
    // Try scrolling again and waiting longer
    await scrollToSidebarItem(page, tableId);
    await page.waitForTimeout(1000);
    const isVisible2 = await item.isVisible().catch(() => false);
    if (!isVisible2) {
      console.log(`  [table] "${tableName}" not visible in sidebar after scroll`);
      return false;
    }
  }

  await item.click();
  console.log(`  [table] Clicked "${tableName}" in sidebar`);
  await page.waitForTimeout(1500);
  return true;
}

async function waitForTableRender(page: any, timeoutMs = 15000) {
  await page.waitForSelector('#bitable-container canvas, #bitable-container [class*="scroll"]', { timeout: timeoutMs }).catch(() => {});
  await page.waitForTimeout(1500);
}

async function triggerSync(page: any, tableId: string, tableName: string, syncTimeoutMs: number): Promise<{ status: 'success' | 'failed' | 'timeout'; error?: string }> {
  const sidebarItem = page.locator(`#bitable-ssr-sidebar-item-${tableId} span.bitable-new-table-tab_item-name, #bitable-ssr-sidebar-item-${tableId} span`).last();
  const isVisible = await sidebarItem.isVisible().catch(() => false);

  if (!isVisible) {
    await scrollToSidebarItem(page, tableId);
    const isVisible2 = await sidebarItem.isVisible().catch(() => false);
    if (!isVisible2) {
      return { status: 'failed', error: '侧边栏元素未找到' };
    }
  }

  await sidebarItem.click({ button: 'right' });
  await page.waitForTimeout(800);

  const syncBtn = page.getByText('同步数据').first();
  const syncBtnVisible = await syncBtn.isVisible().catch(() => false);

  if (!syncBtnVisible) {
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
    return { status: 'failed', error: '未找到同步数据按钮' };
  }

  await syncBtn.click();
  await page.waitForTimeout(1000);

  const checkComplete = async (): Promise<boolean> => {
    const toast = page.getByText(/同步成功|同步完成|全部导入成功/).first();
    if (await toast.isVisible().catch(() => false)) return true;

    const loading = page.locator('[class*="loading"], [class*="spin"]').first();
    if (await loading.isVisible().catch(() => false)) return false;

    return true;
  };

  const startTime = Date.now();
  while (Date.now() - startTime < syncTimeoutMs) {
    const done = await checkComplete();
    if (done) {
      await page.waitForTimeout(1000);
      return { status: 'success' };
    }
    await page.waitForTimeout(1000);
  }

  return { status: 'timeout', error: '同步超时' };
}

async function syncTableWithRetry(
  page: any,
  bitableName: string,
  table: TableConfig,
  syncTimeoutMs: number,
  maxRetries: number,
  retryDelayMs: number
): Promise<SyncResult> {
  let lastError = '';
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    if (attempt > 0) {
      console.log(`  [retry] Attempt ${attempt + 1}/${maxRetries + 1} for "${table.name}"`);
      await page.waitForTimeout(retryDelayMs);
    }

    const clicked = await clickTableInSidebar(page, table.tableId, table.name);
    if (!clicked) {
      lastError = '侧边栏未找到';
      continue;
    }

    await waitForTableRender(page);

    const result = await triggerSync(page, table.tableId, table.name, syncTimeoutMs);
    if (result.status === 'success') {
      return {
        bitableName,
        tableName: table.name,
        tableId: table.tableId,
        status: 'success',
        retries: attempt,
      };
    }

    lastError = result.error || '未知错误';
    console.log(`  [sync] Failed: ${lastError} (attempt ${attempt + 1})`);

    // Close any open menus before retry
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
  }

  return {
    bitableName,
    tableName: table.name,
    tableId: table.tableId,
    status: 'failed',
    error: lastError,
    retries: maxRetries + 1,
  };
}

async function syncBitable(page: any, bitable: BitableConfig, config: Config, progress: ProgressState): Promise<SyncResult[]> {
  const results: SyncResult[] = [];

  console.log(`\n[bitable] Opening: ${bitable.name}`);
  console.log(`[bitable] URL: ${bitable.url}`);

  await page.goto(bitable.url, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await waitForPageLoad(page);

  const pageTitle = await page.title();
  console.log(`[bitable] Page loaded: ${pageTitle}`);

  if (pageTitle.includes('登录') || pageTitle.includes('Login')) {
    console.log('[bitable] Not logged in!');
    for (const table of bitable.tables) {
      results.push({
        bitableName: bitable.name,
        tableName: table.name,
        tableId: table.tableId,
        status: 'failed',
        error: '未登录',
        retries: 0,
      });
    }
    return results;
  }

  const totalTables = bitable.tables.length;
  for (let i = 0; i < totalTables; i++) {
    const table = bitable.tables[i];

    // Skip already completed tables
    if (progress.completed.includes(table.tableId)) {
      console.log(`\n[table] Skipping "${table.name}" - already synced`);
      results.push({
        bitableName: bitable.name,
        tableName: table.name,
        tableId: table.tableId,
        status: 'skipped',
        retries: 0,
      });
      continue;
    }

    console.log(`\n[table] Processing: ${table.name} (${table.tableId}) [${i + 1}/${totalTables}]`);

    const result = await syncTableWithRetry(
      page,
      bitable.name,
      table,
      config.syncTimeoutMs,
      config.maxRetries,
      config.retryDelayMs
    );

    results.push(result);

    // Update progress
    if (result.status === 'success') {
      progress.completed.push(table.tableId);
    } else {
      progress.failed.push(table.tableId);
    }
    saveProgress(progress);

    await page.waitForTimeout(1000);
  }

  return results;
}

function showNotification(results: SyncResult[]) {
  const filtered = results.filter(r => r.status !== 'skipped');
  const total = filtered.length;
  const successCount = filtered.filter(r => r.status === 'success').length;
  const failedCount = filtered.filter(r => r.status !== 'success').length;

  const lines: string[] = [];
  let currentBitable = '';

  for (const r of filtered) {
    if (r.bitableName !== currentBitable) {
      currentBitable = r.bitableName;
      lines.push(`${currentBitable}`);
    }
    const icon = r.status === 'success' ? '✅' : '❌';
    lines.push(`  ${icon} ${r.tableName}${r.error ? ` (${r.error})` : ''}`);
  }

  lines.push(`\n共 ${successCount}/${total} 个表同步成功${failedCount > 0 ? `，${failedCount} 个失败` : ''}`);

  notifier.notify(
    {
      title: '飞书多维表格同步完成',
      message: lines.join('\n'),
      icon: undefined,
      sound: true,
      wait: false,
    },
    (err) => {
      if (err) {
        console.error('[notification] Failed to show notification:', err);
      }
    }
  );
}

export async function main() {
  console.log('=== 飞书多维表格引用数据表同步工具 ===\n');

  const config = await loadConfig();
  console.log(`[config] Loaded ${config.bitables.length} bitable(s)`);
  console.log(`[config] Max retries: ${config.maxRetries}, Sync timeout: ${config.syncTimeoutMs}ms`);

  const progress = loadProgress();
  const elapsed = Math.round((Date.now() - progress.startTime) / 1000);
  console.log(`[progress] ${progress.completed.length} completed, ${progress.failed.length} failed (last run: ${elapsed}s ago)`);

  const context = await launchBrowser(
    config.chromeUserDataDir,
    config.chromeProfile,
    config.headless,
    config.browserChannel
  );

  const allResults: SyncResult[] = [];

  try {
    for (const bitable of config.bitables) {
      const page = await context.newPage();
      try {
        const results = await syncBitable(page, bitable, config, progress);
        allResults.push(...results);
      } finally {
        await page.close();
      }
    }
  } catch (error) {
    console.error('[error] Unexpected error:', error);
  } finally {
    await context.close();
    console.log('\n[browser] Browser closed');
  }

  const filtered = allResults.filter(r => r.status !== 'skipped');
  const successCount = filtered.filter(r => r.status === 'success').length;
  console.log(`\n=== 同步完成 ===`);
  console.log(`成功: ${successCount}/${filtered.length}`);

  for (const r of filtered) {
    const icon = r.status === 'success' ? '✅' : '❌';
    const retryInfo = r.retries > 0 ? ` (重试${r.retries}次)` : '';
    console.log(`  ${icon} ${r.bitableName} > ${r.tableName}${r.error ? ` - ${r.error}` : ''}${retryInfo}`);
  }

  showNotification(allResults);

  // Clear progress file after successful run
  if (successCount === filtered.length && filtered.length > 0) {
    clearProgress();
    console.log('\n[progress] Progress cleared');
  }
}

if (require.main === module) {
  main().catch(applyFatalExit);
}
