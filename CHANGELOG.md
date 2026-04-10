# Changelog

## [1.1.0] - 2026-04-10

### Added
- 新增 `run_sync.bat`，Windows 用户可以直接双击启动脚本，不需要先区分 `cmd` 和 `PowerShell`。
- `run_sync.bat` 会在首次运行时自动安装依赖，并在启动前检查 `Node.js`、`npm`、`config.json` 和 `src/sync.ts` 是否就绪。

### Changed
- 重写《使用指南.md》的主流程，改为“修改 `config.json` -> 双击 `run_sync.bat` -> 再配置任务计划”的小白路线。
- 更新 Windows 定时执行说明，优先推荐任务计划程序直接调用 `run_sync.bat`，并保留 `cmd.exe` 作为兼容备用方案。
- 补充更多面向小白的排错说明，包括 Node.js 未安装、首次运行无响应、任务计划不触发等常见场景。
