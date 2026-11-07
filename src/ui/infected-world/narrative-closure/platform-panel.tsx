import type { PlayerReadyView } from '../../../state/residence-session/player-types'
import { closureCopy, sampleReminder } from '../../../content/infected-world-v0.1/narrative-closure/content'
export function PlatformPanel({view}:{view:PlayerReadyView}) {
 if(!view.closure?.platform)return null
 const restored=view.closure.transfer
 return <section className="iw-platform-panel" aria-label="转运平台控制面板" data-restored={restored}>
 <svg viewBox="0 0 160 36" width="160" height="36" aria-hidden="true"><path d="M 16 18 H 144" stroke="#a18e61" fill="none"/>{[24,80,136].map(x=><circle key={x} cx={x} cy="18" r="8"/>)}</svg>
 <div><strong>{restored?'医院端 · 接驳已恢复':'医院端 · 等待安装'}</strong><p>{restored?closureCopy.HC18.variants['transfer-complete'][0][0].text:closureCopy.HC18.variants.unknown[0][0].text}</p>{restored&&<p className="iw-platform-reminder">{sampleReminder(view)}</p>}</div>
 </section>
}
