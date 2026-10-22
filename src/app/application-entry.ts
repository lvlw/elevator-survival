export type ApplicationEntryKind = 'production' | 'development-preview' | 'infected-world-playtest'

export function selectApplicationEntry(input: Readonly<{
  isDevelopment: boolean
  search: string
}>): ApplicationEntryKind {
  if (!input.isDevelopment) return 'production'
  const query = new URLSearchParams(input.search)
  return query.get('dev-ui-preview') === '1'
    ? 'development-preview'
    : query.get('dev-infected-world') === '1' ? 'infected-world-playtest' : 'production'
}
