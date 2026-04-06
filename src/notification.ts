import notifier from 'node-notifier';

export interface SyncResult {
  bitableName: string;
  tableName: string;
  status: 'success' | 'failed' | 'timeout';
  error?: string;
}

export function showNotification(results: SyncResult[]) {
  const total = results.length;
  const successCount = results.filter(r => r.status === 'success').length;
  const failedCount = results.filter(r => r.status !== 'success').length;

  const lines: string[] = [];
  let currentBitable = '';

  for (const r of results) {
    if (r.bitableName !== currentBitable) {
      currentBitable = r.bitableName;
      lines.push(`📋 ${currentBitable}`);
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
