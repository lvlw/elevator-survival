/** BFCache is not permission to continue the old executable context. */
export function bindBrowserLifecycle(target: EventTarget, suspend: () => void) {
  const hide = () => suspend()
  const show = (event: Event) => { if ('persisted' in event && event.persisted) suspend() }
  target.addEventListener('pagehide', hide); target.addEventListener('pageshow', show)
  return () => { target.removeEventListener('pagehide', hide); target.removeEventListener('pageshow', show) }
}
