import type { PlayerReadyView } from '../../../state/residence-session/player-types'
import { missionCopy } from '../../../content/infected-world-v0.1/mission-guidance-copy'
import { areaRoomName, travelDestination, uniqueTarget, type MapTarget } from '../map/projection'

type GoalId = keyof typeof missionCopy.goals
type Step = Readonly<{ text: string; target?: MapTarget }>
type Goal = Readonly<{ id: GoalId; title: string; purpose: string; status: string; complete: boolean; next: Step }>

const sampleStatus: Record<PlayerReadyView['tasks']['sample'], string> = {
  'not-acquired': '未取得', carried: '已携带，待交付', 'left-in-world': '留在现场', delivered: '已交付', unavailable: '当前不可取得',
}

/** Every suggested place or locator comes from this view's public map. */
export function missionGuide(view: PlayerReadyView, installShortage: readonly string[] = []) {
  const { map, location } = view
  const power = view.tasks.publicObjectives.some(goal => goal.label === '恢复供电' && goal.state === 'completed')
  const transfer = view.tasks.publicObjectives.some(goal => goal.label === '急救转运' && goal.state === 'completed')
  const sample = view.tasks.sample
  const ended = view.phase === 'dead' || view.phase === 'living-hub'
  const outcome = view.terminal.result?.outcome
  const resultTitle = outcome ? missionCopy.outcomes[outcome] : view.phase === 'dead' ? '玩家死亡' : '委托已结束'
  if (ended) return { power, transfer, sample, ended, resultTitle, goals: [] as readonly Goal[] }

  const here = (target: Required<MapTarget>) => location?.place === target.place && location.name === target.name
  const stepAt = (place: string, name: string, action: string, localAction = action): Step | undefined => {
    const target = { place, name }
    const matching = map.nodes.filter(node => node.place === place && node.name === name)
    if (!matching.length) return undefined
    if (!uniqueTarget(map, target)) return { text: `已知${areaRoomName(target)}有同名地点，先核对路线。` }
    return { text: here(target) ? localAction : `到${areaRoomName(target)}${action}`, target }
  }
  const workorder = !view.narrative?.workorder
    ? stepAt('医院', '后勤控制间', '调查停用工单。', '调查停用工单，查明停运线索。') : undefined
  const explore = (): Step => {
    if (view.phase === 'first-hub') return { text: '准备好后，从中枢进入封锁区。' }
    const source = view.sources.find(source => !source.completed && source.choices.length)
    if (source && location && uniqueTarget(map, location)) {
      return { text: `尚无线索。先查看${areaRoomName(location)}的「${source.label}」。`, target: location }
    }
    const choices = view.move.options.flatMap(action => {
      const target = travelDestination(map, action.label)
      return target ? [target] : []
    })
    const next = choices.find(node => !node.visited) ?? choices[0]
    if (next) return { text: `尚无线索。可先到${areaRoomName(next)}查看现场。`, target: { place: next.place, name: next.name } }
    return { text: '尚无线索。查看当前现场和已知出口。' }
  }
  const powerStep = (): Step => {
    if (power) return { text: '支路已通电，可以着手装接转运装置。' }
    const action = view.narrative?.powerSurvey ? '恢复供电' : '调查供电'
    return stepAt('供电所', '转运支路柜', action + '。') ??
      stepAt('供电所', '配线廊', '查看已知出口，寻找供电设备。') ?? workorder ?? explore()
  }
  const transferStep = (): Step => {
    if (transfer) return { text: '装接已完成，留意样本目标的返程提示。' }
    if (installShortage.length) return { text: '装接还缺' + installShortage.join('、') + '。' }
    const visible = view.tasks.choices.find(action => ['修复转运组件', '取得转运组件', '取得通信模块'].includes(action.label))
    if (visible && location) {
      return { text: `查看「${visible.label}」所需条件。`, ...(uniqueTarget(map, location) ? { target: location } : {}) }
    }
    const install = stepAt('医院', '转运平台', '查看「安装转运装置」所需材料。')
    if (power && install) return install
    if (workorder) return workorder
    const method = !view.closure?.method && !view.closure?.componentCarried
      ? stepAt('物流', '周衡休息室', '找周衡核对处理办法（可选）。', '可以找周衡核对处理办法。') : undefined
    return method ??
      stepAt('物流', '装卸场', '查看转运组件的作业要求。') ??
      stepAt('通信', '机房', '查看通信模块的取得条件。') ??
      stepAt('物流', '岗亭', '从已知出口找装接线索。') ?? install ?? explore()
  }
  const sampleStep = (): Step => {
    if (sample === 'delivered') return { text: '指定样本已交付。' }
    if (sample === 'carried') {
      if (view.terminal.eligibility.deliver) return { text: '在电梯前室选择「交付返回」。' }
      if (power && transfer) return stepAt('医院', '电梯前室', '交付样本。') ?? { text: '把样本带回医院·电梯前室交付。' }
      return { text: power ? '样本在身上。装好转运装置后携回交付。' : '样本在身上。完成供电与装接后携回交付。' }
    }
    if (sample === 'left-in-world') return { text: '返程前取回留置的样本。地图未标注物品位置。' }
    if (sample === 'unavailable') return { text: '目前无法取得样本，查看已公开的现场记录。' }
    return stepAt('医院', '冷藏室', '查看「提取样本」的要求。', '查看「提取样本」，为样本箱留出位置。') ?? explore()
  }
  const goal = (id: GoalId, status: string, complete: boolean, step: Step): Goal => ({
    id, ...missionCopy.goals[id], status, complete,
    next: view.combat && !complete ? { ...step, text: '遭遇结束后：' + step.text } : step,
  })
  const goals = [
    goal('power', power ? '已恢复' : view.narrative?.powerSurvey ? '待恢复' : '未核查', power, powerStep()),
    goal('transfer', transfer ? '已装接' : '未装接', transfer, transferStep()),
    goal('sample', sampleStatus[sample], sample === 'delivered', sampleStep()),
  ]
  return { power, transfer, sample, ended, resultTitle, goals }
}
