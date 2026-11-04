import { infectedResidenceConfig } from '../../infected-residence-core-v0.1/config'
import { infectedTerminalCoreConfig } from '../../infected-terminal-core-v0.1/config'
import type { NarrativeKnowledge, StoryKey, ExplorationReceipt } from '../../../state/residence-session/narrative-entry/types'

export const entryBrief = Object.freeze({ days: infectedResidenceConfig.config.limits.days,
  reward: infectedTerminalCoreConfig.config.success_reward, penalty: infectedTerminalCoreConfig.config.failure_penalty })
export const diary = Object.freeze([
  '本子封面没有名字。字迹很重：“如果你也不知道自己怎么来的，先别急着进门。看清任务。”\n“屏幕会告诉你要做成什么，不会告诉你路怎么走。”',
  '“第一次，我一直盯着要带回来的东西。东西拿到了，才想起来还得走回去。”\n“包里剩多少地方，身上剩多少力气，往前走的时候就得算。”',
  '“第二次，门外全是雪。”\n“那件没舍得扔的外套，我又穿了一路。”\n后面的纸皱在一起，已经辨不清字。',
])
export const storyTitles: Readonly<Record<StoryKey, string>> = Object.freeze({ P01: '断掉的声音', P02: '没有楼层的显示屏', P03: '长椅上的本子', P04: '准备期结束', P05: '首次委托', P06: '准备出发',
  H01: '门开之后', H02: '仍在循环的广播', H03: '亲手搜索', H04: '收进背包', H05: '隔离防火门', H06: '没有回答', H07: '停用工单' })

/** Finite first-entry text. Unknown facts cannot be supplied by a reading mark. */
export function storyText(key: StoryKey, knowledge: NarrativeKnowledge, receipt?: ExplorationReceipt): string | null {
  if (!knowledge.known.includes(key) && !(key === 'H04' && receipt?.kind === 'pickup')) return null
  switch (key) {
    case 'P01': return '“回来再说。”\n你记得，自己答应了。后面的声音突然断了。'
    case 'P02': return '地面很冷。这里没有窗，电梯的显示屏上也没有楼层。\n中枢接入完成。返还原世界：需取得资格。首次任务将在准备结束后分配。'
    case 'P03': return diary.join('\n\n')
    case 'P04': return '你一直没等到窗外亮起来。这里没有窗。\n再次睁眼时，电梯上方多了一行字：准备期结束。首次任务已分配。'
    case 'P05': return `恢复当地急救转运；取得指定密封病原样本，携回医院电梯前室交付。\n驻留期限 ${knowledge.brief.days} 个任务日。完整履约奖励 ${knowledge.brief.reward} 积分；失败收入为 0，最多扣除现有积分中的 ${knowledge.brief.penalty} 积分，不负债。成功或失败正式结束后，本委托均不可重接。`
    case 'P06': return '金属管、外套和绷带已经放在柜内。工具与专长由你明确选择。准备确认后，仍由你决定何时进入医院。'
    case 'H01': return '你扶着门边，电梯已经停了，耳边的轰鸣却迟了一会儿才散。\n“转运、样本……最后回到这里。”'
    case 'H02': return '“请等待转运的人员留在指定区域。接驳安排将另行通知。”\n相同的杂音之后，这句话又重复了一遍。\n“还在播，可转运已经停了。先看看附近有什么。”'
    case 'H03': return receipt ? (receipt.method === 'lit' ? '光束扫过台面，你避开碎玻璃。' : '你摸索着台面和柜格。') + '\n' +
      (receipt.revealed ? '找到的东西留在现场，是否带走由你决定。' : '这里没有找到还能带走的东西。') : '搜索已经完成。物品和消耗以当次行动记录及当前现场为准；回看不会重新搜索。'
    case 'H04': return '你把东西收进包，重新扣好。'
    case 'H05': return '门沿轨道退开。你没有立刻走进去。' + (knowledge.doorParts ? '\n这次工具箱作业产生了一份电子材料；携带状态以实际物品栏为准。' : '')
    case 'H06': return '制服上还留着医院的标记。他的手抓住门边。\n“能听见我吗？”\n没有回答。'
    case 'H07': return knowledge.workorder ? '旧转运计划上压着一张日期更晚、字迹更急的纸。\n“暂停接驳。先隔离污染侧，再恢复医院服务支路。”\n执行人：周衡。\n' +
      (knowledge.powerSurvey ? '“供电柜上的隔离，就是这份停用令。”' : '“有人主动停了它。是想把什么隔在外面？”') : null
  }
}
