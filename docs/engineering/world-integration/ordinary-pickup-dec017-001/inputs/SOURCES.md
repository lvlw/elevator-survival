# 依据与审查发现

## 主线当前准确基线

- Branch：`feature/world-owner-playtest-ux-001`
- HEAD：`a84adc827e56c4d8d01d4f8b541a90c9f35a6523`
- Tree：`382ec90c28f8a816a901c2d0e0d10faa1d4789e8`
- UI 任务代码提交：`98222a0b2c685f7208b0ae6d96dbe1ba0e660589`
- UI 任务最终归档提交：`a84adc827e56c4d8d01d4f8b541a90c9f35a6523`
- CI #192：`https://github.com/lvlw/elevator-survival/actions/runs/42365059522`

## 正式依据

- [DEC-017：首版物品尺寸、旋转与堆叠规则](https://github.com/lvlw/elevator-survival/blob/a84adc827e56c4d8d01d4f8b541a90c9f35a6523/docs/05-design-decisions.md)
  - 拾取可堆叠物品时，先补充背包已有未满兼容堆叠，再为剩余数量创建新堆叠。
  - 空间或负重不足时，只拾取当前可容纳数量，剩余留在原节点。
  - 堆叠节省格位，不减少重量。
- [DEC-052 D03：任务搬运与受控来源](https://github.com/lvlw/elevator-survival/blob/a84adc827e56c4d8d01d4f8b541a90c9f35a6523/docs/05-design-decisions.md)
  - 任务物品由窄受控生产者处理，不通过普通 pickup 伪造任务实例。
- [DEC-052 D08：来源份额与严格输入](https://github.com/lvlw/elevator-survival/blob/a84adc827e56c4d8d01d4f8b541a90c9f35a6523/docs/05-design-decisions.md)
  - 拆分、合并、处分必须保持来源份额守恒。
- [UIR-015 当前有效约定](https://github.com/lvlw/elevator-survival/blob/a84adc827e56c4d8d01d4f8b541a90c9f35a6523/docs/09-ui-design-record.md)
  - 普通 revealed item pickup 使用 row-major first-fit；不自动整理或旋转已有物品；多数量仍明确选择。

## 本轮代码审查发现

当前 `src/core/residence-location/items.ts` 的普通 pickup 使用 `addItemToBackpack(... placement ...)`，而该函数只做完整实例放置校验；当前拾取命令没有在地面来源上先补充兼容堆叠，也没有部分拾取。显式 merge 只作用于已在背包内的两个实例。

这与 DEC-017 的普通可堆叠物品拾取语义不一致。DEC-052 D03 只约束任务物品搬运，不能自动解释为废止 DEC-017 对普通 stackable 物品的规则。

本任务仅实现现有 DEC，不增加新规则。若 Codex 读取到其他后续有效条款，应先报告冲突并停止相应实现。
