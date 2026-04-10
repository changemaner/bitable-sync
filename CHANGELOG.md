# Changelog

## [1.1.1] - 2026-04-10

### Added
- 新增 `src/runtime.ts` 和 `test/runtime.test.ts`，覆盖浏览器渠道回退、Profile 参数构造和致命错误退出行为。

### Fixed
- 增强 `run_sync.bat` 在配置错误或启动失败时的日志可见性，避免窗口直接关闭后难以定位原因。
- 修复浏览器启动强依赖 `chrome` 渠道的问题，现在会在 `chrome` 不可用时自动回退到 `msedge`。
- 修复传给 Playwright 的用户数据目录参数，避免把 Profile 路径当成新的用户数据根目录使用。
- 修复顶层异常只打印不失败退出的问题，启动失败时现在会返回非 0 退出码。

### Changed
- `run_sync.bat` 失败时会把运行日志写入 `logs\\last_run.log`，同时在窗口中打印日志内容并暂停，便于业务人员截图或反馈。
- `config.json` 和《使用指南.md》补充 `browserChannel` 配置说明，以及“窗口一闪而过时查看日志”的排查路径。

## [1.1.0] - 2026-04-10

### Added
- 新增 `run_sync.bat`，Windows 用户可以直接双击启动脚本，不需要先区分 `cmd` 和 `PowerShell`。
- `run_sync.bat` 会在首次运行时自动安装依赖，并在启动前检查 `Node.js`、`npm`、`config.json` 和 `src/sync.ts` 是否就绪。

### Changed
- 重写《使用指南.md》的主流程，改为“修改 `config.json` -> 双击 `run_sync.bat` -> 再配置任务计划”的小白路线。
- 更新 Windows 定时执行说明，优先推荐任务计划程序直接调用 `run_sync.bat`，并保留 `cmd.exe` 作为兼容备用方案。
- 补充更多面向小白的排错说明，包括 Node.js 未安装、首次运行无响应、任务计划不触发等常见场景。
