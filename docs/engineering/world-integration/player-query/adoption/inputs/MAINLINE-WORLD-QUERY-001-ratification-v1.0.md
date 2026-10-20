# WORLD-QUERY-001 主线技术定稿记录 v1.0

本文件为主线技术判断，不是Owner新原话，也不是新DEC／UIR。依据Owner已有任务下发权限，现对 `7a3acd3855aefdde68fdaed13ebe037f3e9bd6de` 上E03-A查询候选在下列边界内定稿，并只下发DOC-WORLD-QUERY-001归档任务。

## 已核对基础

ENG-LONGCHAIN-TEST-BUDGET-001准确SHA实审PASS，F01关闭，F02保持。原查询候选Git blob：
- query-contract-draft-v1.0.md：296f2df1fad8db02527ac041a3242df9872a7f81
- next-engineering-contract-draft-v1.0.md：710ef69d8f9868c57c23c2207ea4d1985fe3f5d9
- query-field-matrix.json：334b669e1e616e62296702cc5f17949cf45540e2

原候选的3/12/9支持分层及实际selector泄露发现保留；未拿路线PASS宣称生产查询已完成。

## 本次明确的技术消歧

1. 四phase／五完整停点；no-current是应用状态。已有first-hub初配不能借“选择界面”重发或重选；Setup读取catalog与实际发物分开。
2. opaque selector是引用，不是行动authority。私有绑定表不成第二玩法真相，不持久化；查询本身不隐式更新表或签发行动能力。cold、跨会话和旧快照不能复用到新对象。
3. 未支持的资格应在正式工程白名单中复用／窄抽取同源纯owner，不能调用resolver试算。真正缺公开安全依据的字段明确unknown并记录Gate，不自行增加感染未来、远端实时情报或新敌人阈值。
4. 接受下一项完整query工程的责任边界，但实际起始SHA、分支和写路径在文档实审后另发；原15个候选路径不是默认许可。

以上为对候选技术边界的定稿，不改变Owner已批准规则和参数。本次不新增玩法或信息层级取舍，因此无需Owner重新采纳。归档若发现与实际有效条款冲突，应停在精确冲突并返回主线，而非擅自修改载荷。

## 三份确定载荷

`approved-documents/` 中查询合同、24字段清单、工程契约是本次原字节安装载荷。旧候选完整保留，仅追加指向正式目标的局部覆盖说明；不追改它们原来DRAFT／未实现的历史含义。

## 授权停止点

只执行本包DOC任务，普通commit／push仅`feature/world-route-acceptance-001`，不合并、不推main、不强推。生产query、UI、浏览器、多标签、O3、素材、依赖升级及下一工程均不在本次执行权内。
