# 分支保全说明

本机初始 HEAD 为准确 a7，普通/暂存 diff 和 status 均为空；唯一工作树为 `E:/projects/elevator-survival`，初始在 `feature/world-presentation-prep-001`。未 stash、清理、重置或切换别人的工作树。从 a7 普通新建本治理分支，旧设计、工程和固定分支均保留。

本轮 `git ls-remote --heads origin` 真实返回30项，与输入快照逐项一致。[登记表](branch-register.json) 逐项给出 tip、merge-base退出码、距a7提交数、a7外独有提交数、本地上游与同名实时远端比较。

| 分类 | 数量及含义 |
| --- | --- |
| 旧默认 main | 1；`a76e9c1c998051fc1643b6e0c3d53443fa55feed`，在a7之前62提交 |
| 历史旧feature检查点 | 27；全部为a7祖先，各自在a7外独有提交数为0 |
| 已审工程停点 | 1；`feature/world-presentation-prep-001` 指向a7 |
| 固定检查点 | 1；`baseline/world-pre-b1-20261031` 指向a7；本轮不重复建、不移动 |

“逻辑归档/检查点”仅是用途分类，不表示远端删除、服务端归档或锁定，也不表示每个历史 tip 全部通过。历史审查见各原件。服务器保护本轮未重新核验；输入曾报告 protected=false/rulesets=[]，不可冒充新查询。

创建治理分支后本地30条分支，其中21条无上游（含尚未推送的治理分支）；初始旧分支无上游20条。对已存在同名远端的本地分支，未发现本地独有提交；不能把无上游当成可删。本地旧 `refs/remotes/elevator-survival/main` 仍停在 `3c78d8d31f3f4f71a548cc03c1b6748378ab352a`，原样保留。标签本轮 `ls-remote --tags origin` 退出0并返回空，不把此前连接器失败写成“历史无标签”。

本轮不 fetch/prune，不新建本地固定baseline、不打标签、不逐条合并、不动main。仅可推送 `HEAD:refs/heads/chore/world-baseline-governance-001`。提交前/推送前后保存独立回读；旧30个远端head与初始本地旧ref的最终比较随轻包回执提供。
