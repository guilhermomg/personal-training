'use client'

import type { LoggedSession } from '../types/training'
import { formatDurationSecs, formatPaceSecs } from '../lib/training-format'

// ─── Riegel formula ───────────────────────────────────────────────────────────
// T2 = T1 × (D2 / D1) ^ 1.06
// Predicts a race time (T2) for distance D2 given a known time T1 at D1.
// The 1.06 exponent accounts for physiological fatigue over longer distances.
const RIEGEL_EXPONENT = 1.06

function riegelPredict(knownDistKm: number, knownTimeSecs: number, targetDistKm: number): number {
  return knownTimeSecs * Math.pow(targetDistKm / knownDistKm, RIEGEL_EXPONENT)
}

// ─── Race distances ───────────────────────────────────────────────────────────
const DISTANCES = [
  { label: '5 km',           km: 5 },
  { label: '10 km',          km: 10 },
  { label: 'Half Marathon',  km: 21.0975 },
  { label: '30 km',          km: 30 },
  { label: 'Full Marathon',  km: 42.195 },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────
function weightedMean(values: number[], weights: number[]): number {
  const totalW = weights.reduce((a, b) => a + b, 0)
  return values.reduce((acc, v, i) => acc + v * weights[i], 0) / totalW
}

type Estimate = {
  label: string
  km: number
  timeSecs: number
  paceSecs: number
}

function computeEstimates(sessions: LoggedSession[]): Estimate[] | null {
  // Only use sessions with both actual pace and distance
  const usable = sessions.filter(
    (s) =>
      s.status !== 'skipped' &&
      s.actual_pace_secs != null &&
      s.actual_distance_km != null &&
      Number(s.actual_distance_km) >= 1 // ignore very short warm-up entries
  )

  if (usable.length === 0) return null

  // Sort by date ascending so we can apply recency weights
  const sorted = [...usable].sort(
    (a, b) => new Date(a.session_date).getTime() - new Date(b.session_date).getTime()
  )

  return DISTANCES.map(({ label, km }) => {
    // For each usable session, predict the target time via Riegel, then
    // take a distance-weighted + recency-weighted average across all sessions.
    const predictions: number[] = []
    const weights: number[] = []

    sorted.forEach((s, idx) => {
      const d = Number(s.actual_distance_km!)
      const t = d * Number(s.actual_pace_secs!)            // total time in seconds
      const predicted = riegelPredict(d, t, km)
      predictions.push(predicted)
      // More weight to: larger distances (more reliable) + more recent sessions
      const distanceWeight = d
      const recencyWeight = (idx + 1) / sorted.length     // 0..1, newest = 1
      weights.push(distanceWeight * recencyWeight)
    })

    const timeSecs = Math.round(weightedMean(predictions, weights))
    const paceSecs = Math.round(timeSecs / km)

    return { label, km, timeSecs, paceSecs }
  })
}

// ─── Colours ──────────────────────────────────────────────────────────────────
const T = {
  border:  '#e2e8f0',
  border2: '#f1f5f9',
  text:    '#1e293b',
  muted:   '#64748b',
  accent:  '#0ea5e9',
  navy:    '#0f172a',
  surface: '#f8fafc',
}

// ─── Component ────────────────────────────────────────────────────────────────
export function PaceEstimator({ loggedSessions }: { loggedSessions: LoggedSession[] }) {
  const usable = loggedSessions.filter(
    (s) =>
      s.status !== 'skipped' &&
      s.actual_pace_secs != null &&
      s.actual_distance_km != null &&
      Number(s.actual_distance_km) >= 1
  )

  const estimates = computeEstimates(loggedSessions)

  // Average pace across usable sessions (distance-weighted)
  const avgPaceSecs =
    usable.length > 0
      ? Math.round(
          usable.reduce((acc, s) => acc + Number(s.actual_pace_secs!), 0) / usable.length
        )
      : null

  return (
    <div
      style={{
        background: T.surface,
        border: `1px solid ${T.border}`,
        borderRadius: 8,
        padding: 24,
        marginTop: 20,
      }}
    >
      {/* Header */}
      <div style={{ marginBottom: 16 }}>
        <div
          style={{
            fontSize: 11,
            letterSpacing: 2,
            textTransform: 'uppercase',
            color: T.muted,
            marginBottom: 6,
          }}
        >
          Race Time Estimates
        </div>
        <div style={{ fontSize: 13, color: T.muted }}>
          {usable.length === 0
            ? 'Log at least one run with distance and pace to see estimates.'
            : `Based on ${usable.length} session${usable.length > 1 ? 's' : ''}${
                avgPaceSecs ? ` · avg training pace ${formatPaceSecs(avgPaceSecs)}/km` : ''
              } · Riegel formula`}
        </div>
      </div>

      {/* No data */}
      {!estimates && (
        <div style={{ fontSize: 13, color: T.muted, textAlign: 'center', padding: '24px 0' }}>
          No pace data available yet.
        </div>
      )}

      {/* Estimates table */}
      {estimates && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          {/* Column headers */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 120px 100px',
              padding: '6px 12px',
              fontSize: 10,
              letterSpacing: 1,
              textTransform: 'uppercase',
              color: T.muted,
              borderBottom: `1px solid ${T.border}`,
            }}
          >
            <span>Distance</span>
            <span style={{ textAlign: 'right' }}>Finish Time</span>
            <span style={{ textAlign: 'right' }}>Pace / km</span>
          </div>

          {estimates.map(({ label, km, timeSecs, paceSecs }, i) => {
            const isHalf = km === 21.0975
            const isFull = km === 42.195
            const highlight = isHalf || isFull

            return (
              <div
                key={label}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 120px 100px',
                  alignItems: 'center',
                  padding: '12px 12px',
                  background: highlight ? '#ecf8ff' : i % 2 === 0 ? '#fff' : T.surface,
                  borderBottom: i < estimates.length - 1 ? `1px solid ${T.border2}` : 'none',
                  borderRadius:
                    i === 0
                      ? '6px 6px 0 0'
                      : i === estimates.length - 1
                      ? '0 0 6px 6px'
                      : undefined,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: highlight ? 600 : 500,
                      color: highlight ? T.accent : T.text,
                    }}
                  >
                    {label}
                  </span>
                  <span style={{ fontSize: 11, color: T.muted }}>{km < 21 ? `${km} km` : `${km.toFixed(1)} km`}</span>
                </div>
                <div
                  style={{
                    textAlign: 'right',
                    fontSize: 15,
                    fontWeight: 600,
                    color: highlight ? T.accent : T.navy,
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {formatDurationSecs(timeSecs)}
                </div>
                <div
                  style={{
                    textAlign: 'right',
                    fontSize: 12,
                    color: T.muted,
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {formatPaceSecs(paceSecs)}/km
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Footer note */}
      {estimates && (
        <div style={{ marginTop: 14, fontSize: 11, color: T.muted, lineHeight: 1.5 }}>
          Estimates use Peter Riegel&apos;s formula applied across your completed runs, weighted
          by distance and recency. They reflect current fitness, not race-day performance.
        </div>
      )}
    </div>
  )
}
