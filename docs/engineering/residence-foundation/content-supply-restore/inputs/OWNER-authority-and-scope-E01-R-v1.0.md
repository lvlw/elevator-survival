# OWNER authority and scope — E01-R v1.0

本文件记录 WebGPT 主线依据 Owner 已有批准与任务下发权限，对下一项独立工程 E01-R 的执行边界。

## 已授权

- Goal：`ENG-RESIDENCE-CONTENT-SUPPLY-RESTORE-001（E01-R）`
- 起始 SHA：`8c19ca0d28058cf743b41c8547cc2629c8eac767`
- 新分支：`feature/residence-content-supply-restore-001`
- 允许在该工程分支普通 commit / push。
- 允许在任务书精确路径内一次完成详细设计、实现、正反例、组合测试、自查修订、最终检查和完成报告。
- 完成后停止，提交最终准确 SHA 供 WebGPT 主线恢复接缝实审。

## 未授权

- 合并或推送 main。
- 强推。
- 修改 DEC-049—052 或已批准数值/内容。
- 修改 E01-P 纯核心语义以迁就 codec。
- 修改旧 v1/v2 reader / codec / tests 的行为。
- current 安装、Storage adapter、浏览器存档、多标签。
- E01-S、E02、E03、玩家入口、React/UI。
- O3 发布安排、商城、身体服务、第二真实委托、未来改专长。
- 新依赖、通用事件总线、通用任务 SDK。
