export function formatPaceSecs(secs: number): string {
  const m = Math.floor(secs / 60)
  const s = secs % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

export function formatPaceRange(min: number | null, max: number | null): string | null {
  if (!min && !max) return null
  if (min && max && min !== max) return `${formatPaceSecs(min)}–${formatPaceSecs(max)}/km`
  if (min) return `${formatPaceSecs(min)}/km`
  return null
}

export function formatDistanceM(meters: number): string {
  const km = meters / 1000
  return km % 1 === 0 ? `${km}` : `${km.toFixed(1)}`
}

export function formatDurationSecs(secs: number): string {
  const h = Math.floor(secs / 3600)
  const m = Math.floor((secs % 3600) / 60)
  const s = secs % 60
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  return `${m}:${s.toString().padStart(2, '0')}`
}

export function formatDurationMins(secs: number): string {
  const m = Math.floor(secs / 60)
  const s = secs % 60
  return s === 0 ? `${m} min` : `${m}:${s.toString().padStart(2, '0')} min`
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  })
}
