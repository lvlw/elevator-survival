/** Public briefing copy. Current facts and targets are supplied by the safe view. */
export const missionCopy = {
  title: '未完成的转运',
  goals: {
    power: { title: '恢复供电', purpose: '让医院转运支路恢复供电。' },
    transfer: { title: '恢复转运', purpose: '供电恢复后，装好转运装置。' },
    sample: { title: '携回样本', purpose: '取得指定样本，带回医院·电梯前室交付。' },
  },
  outcomes: {
    success: '委托完成',
    'voluntary-failure': '已止损返回',
    'deadline-failure': '期限已结束',
    death: '玩家死亡',
  },
  chapterEnd: '本测试章节已结束',
} as const
