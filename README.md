# bitable-sync

飞书多维表格（Bitable）引用数据表自动同步工具。模拟人工在飞书多维表格中右键 -> "同步数据" 的操作，使用 Playwright 驱动 Chrome/Edge 浏览器自动完成批量同步。

## 核心功能

- **自动同步** — 启动后自动打开飞书多维表格，依次对配置的引用数据表执行同步操作
- **断点续传** — 同步进度记录在 `.sync-progress.json`，中断后重新运行会跳过已完成表
- **失败重试** — 单表同步失败后自动重试（次数可配置）
- **桌面通知** — 同步完成后弹出 Windows 桌面通知，汇总成功/失败情况
- **Channel 回退** — Chrome 不可用时自动回退到 Edge

## 系统要求

- Windows 10/11
- Node.js 18+
- Chrome 或 Edge 浏览器（已登录飞书）

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置 config.json

```json
{
  "bitables": [
    {
      "name": "我的多维表",
      "url": "https://xxx.feishu.cn/base/xxx?table=xxx&view=xxx",
      "tables": [
        { "tableId": "tblXXXXXXXX", "name": "表1" },
        { "tableId": "tblYYYYYYYY", "name": "表2" }
      ]
    }
  ],
  "chromeUserDataDir": "C:\\Users\\<用户名>\\AppData\\Local\\Google\\Chrome\\User Data",
  "chromeProfile": "Default",
  "syncTimeoutMs": 60000,
  "headless": false,
  "maxRetries": 2,
  "retryDelayMs": 3000
}
```

| 参数 | 说明 |
|------|------|
| `bitables[].url` | 多维表格完整 URL（含 table/view 参数） |
| `bitables[].tables[].tableId` | 引用数据表的 tableId（从 URL 参数 `?table=` 获取） |
| `chromeUserDataDir` | Chrome 用户数据目录路径 |
| `chromeProfile` | Chrome 用户配置名称，默认 `Default` |
| `syncTimeoutMs` | 单表同步超时（毫秒），默认 60000 |
| `headless` | 是否隐藏浏览器窗口 |
| `maxRetries` | 单表失败最大重试次数 |
| `retryDelayMs` | 重试间隔（毫秒） |

### 3. 运行

```bash
# 方式一：双击 run_sync.bat

# 方式二：命令行运行
npx tsx src/sync.ts
```

## 运行测试

```bash
npm test
```

## 项目结构

```
bitable_sync/
├── src/
│   ├── sync.ts           # 主入口，同步编排逻辑
│   ├── runtime.ts        # 浏览器 channel 解析、命令行参数、错误处理
│   ├── browser.ts        # 备用浏览器启动模块
│   └── notification.ts   # 桌面通知模块
├── test/
│   └── runtime.test.ts   # runtime 模块单元测试
├── config.json           # 用户配置文件
├── run_sync.bat          # Windows 一键启动脚本
├── 使用指南.md            # 详细使用指南（面向非技术用户）
├── CHANGELOG.md          # 版本更新记录
└── package.json
```

## 技术栈

- **TypeScript** — `tsx` 直接执行，无需编译
- **Playwright** — 驱动 Chromium 内核浏览器
- **node-notifier** — Windows 桌面通知
- **Node.js 原生 Test Runner** — 单元测试

## License

MIT
