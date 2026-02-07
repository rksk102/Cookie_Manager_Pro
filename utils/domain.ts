export const cleanDomain = (domain: string): string => {
  return domain.replace(/^\./, '')
}

export const buildOrigins = (domains: Set<string>): string[] => {
  const origins: string[] = []
  domains.forEach(d => {
    origins.push(`http://${d}`, `https://${d}`)
  })
  return origins
}
