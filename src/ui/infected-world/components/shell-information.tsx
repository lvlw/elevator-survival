import type { PlayerReadyView } from '../../../state/residence-session/player-types'

export function BodyDetails({ view }: { view: PlayerReadyView }) {
  return <div className="iw-body-details"><h3>当前身体</h3><dl>
    <dt>生命</dt><dd>{view.body.hp.current} / {view.body.hp.maximum}</dd><dt>精力</dt><dd>{view.body.energy.current} / {view.body.energy.maximum}</dd><dt>饱食</dt><dd>{view.body.satiety.current} / {view.body.satiety.maximum}</dd>
    <dt>当前病程</dt><dd>{view.body.infectionWarning.label}</dd><dt>流血</dt><dd>{view.body.bleeding ? '是' : '否'}</dd><dt>轻度挫伤</dt><dd>{view.body.minorContusions}</dd><dt>镇痛</dt><dd>{view.body.painkillerActive ? '生效中' : '未生效'}</dd>
  </dl><p>{view.body.infectionWarning.mechanism}</p><h3>当前公开伤口</h3>{view.body.wounds.length ? <ul>{view.body.wounds.map(wound => <li key={wound.ordinal}>伤口 {wound.ordinal} · {wound.kind === 'scratch' ? '抓伤' : wound.kind === 'bite' ? '咬伤' : '开放伤口'} · {wound.treatment === 'treated' ? '已处理' : '未处理'}</li>)}</ul> : <p>没有当前公开伤口。</p>}</div>
}
export function HelpDetails() {
  return <div className="iw-help"><h3>观察与行动</h3><p>地图只显示已知地点与路线。前往当前现场列出的相邻方向，才会执行移动。</p><p>查看身体、任务、地图与物品详情只改变显示；需要数量、材料、位置或目标的行动，在参数齐备后执行。</p><h3>真实携带</h3><p>背包为 6×4 格，使用物品实际尺寸、朝向和数量。背包与快捷物品用右键、菜单键或 Shift+F10 打开操作。装备和快捷位不计入背包重量。</p><h3>战斗与保存</h3><p>战斗反馈可以跳过，也可进一步减少动态。反馈结束不决定行动是否生效；保存失败时行动已经生效，重试仅保存。</p><p>敌人只公开五个生命阶段；“失去能力”不等于实际死亡。未知医疗效果仍由正式预览说明。</p></div>
}
