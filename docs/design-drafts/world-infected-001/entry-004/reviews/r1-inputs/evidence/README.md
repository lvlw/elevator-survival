# 0362460 定点复核材料

这不是完整仓库归档。source/check.py为准确受审提交的完整原样模型，Git blob已核对；两配置从已挂载的原批准载荷读取，其SHA-256与本次候选引用一致。

`dependency-slice.json`只含本组用到的数据。主线未运行完整98项、原生24项或CTB；测试中场所/危险解除为显式准备态，任务件本身经Model.step真实提取。没有替换Model方法，没有Storage/current/通知，故inputUnchanged只指模型传入前态不变。

在本包目录执行：

```sh
python evidence/probe.py --out /tmp/entry004-review.json
```

在完整实际仓库上复核（保持本脚本不改）：

```sh
python <本包>/evidence/probe.py --repo-root <仓库根> --out <仓库外>/entry004-full-data-before.json
```

原0362460模型本次定点运行：31项、17匹配、14不符（11误接受、3个KeyError），退出1。原输入31/31保持不变。详细实际后态/拒绝分类见probe-results.json。主体脚本使用当前仓库时会记录实际modelGitBlob；matchesReviewBaseModelBlob只标识是否仍为0362460模型，修复后变false是正常的指纹变化，不是用例失败。

F01含4项任务执行／来源矛盾；F02含10项字段／原值／语义拒绝缺口。其余17项是应保持的合法流程及拒绝对照。修复后应保留同一固定集，并在完整仓库数据上重新运行。若确需改变有限模型表示，保留原脚本，补独立可审的适配／等价回归并说明，不可编辑输入原件或抹去原反例。

input-audit.json是五件旧任务输入的原包字节→Git blob核对，远端对象由GitHub连接器读取。source目录的旧模型与配置只用作审查证据，不复制为新运行时配置。
