# CI #156 主线读取记录（结构化摘记，不是原日志字节副本）

准确提交：2258e1bad17ffb03297b691be51bf9bfe5883979。
Run 38451127806，attempt 1；job 115482027719。

主线通过 GitHub.fetch 读取 run，并通过 fetch_workflow_run_jobs / fetch_workflow_job_logs 读取阶段和完整 job 日志。仓库没有被此操作修改；没有重跑工作流。

实际阶段：架构与typecheck成功，test:run失败，build跳过。失败是11个新增路线用例触及5000ms测试超时；不是11个费用／HP／任务断言失败。测试总计241文件／4306项，其中5文件失败、236文件通过；11项失败、4295项通过。完整测试阶段耗时388.82s。

失败分布：cold-continuation 6项，nine-combinations 2项，hotel-benefit／segmented／toolbox各1项。逐项说明和日志所示耗时见同目录 ci156-failure-summary.json；locator_description 是便于定位的人类摘要，不冒称原测试标题逐字副本。失败用例所报最大耗时为6860ms。

作者本地两workers的4306通过，以及冻结112项双跑，保留为作者各自实际执行证据。它们没有把本次默认CI失败改写成成功。9条真实游戏死亡实验是另一分类，与这11个测试超时无关。

此次不依据审计摘要宣称依赖可利用或安全，也不执行依赖修复。构建被跳过不等于存在构建错误；必须在后续准确提交完整执行。
