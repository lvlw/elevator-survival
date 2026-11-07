import type { ClosureReceipt } from '../../../state/residence-session/narrative-closure/types'
export type CommittedClosure = Readonly<{ scope: object; ordinal: number; receipt: ClosureReceipt }>
export function createClosureIssuer() {
 const scope=Object.freeze({});let ordinal=0
 return (receipt:ClosureReceipt):CommittedClosure|undefined => ordinal<Number.MAX_SAFE_INTEGER?Object.freeze({scope,ordinal:++ordinal,receipt}):undefined
}
