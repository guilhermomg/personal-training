'use client'

import { useState } from 'react'
import type { PlannedSession, SessionStep, StepType } from '../types/training'
import {
  formatPaceSecs,
  formatDurationMins,
  formatDurationSecs,
  formatDate,
} from '../lib/training-format'

type Unit = 'metric' | 'imperial'

const STEP_COLORS: Record<StepType, string> = {
  warmup:   '#6366f1',
  effort:   '#0ea5e9',
  recovery: '#10b981',
  cooldown: '#94a3b8',
  repeat:   '#8b5cf6',
}

const STEP_LABELS: Record<StepType, string> = {
  warmup:   'Warm-up',
  effort:   'Effort',
  recovery: 'Recovery',
  cooldown: 'Cool-down',
  repeat:   'Repeat',
}

const T = {
  text: '#1e293b',
  muted: '#64748b',
  border: '#e2e8f0',
  border2: '#f1f5f9',
  surface2: '#f8fafc',
  accent: '#0ea5e9',
}

function fmtDist(meters: number, unit: Unit): string {
  if (unit === 'imperial') {
    const miles = meters / 1609.34
    return miles % 1 === 0 ? `${miles} mi` : `${miles.toFixed(1)} mi`
  }
  const km = meters / 1000
  return km % 1 === 0 ? `${km} km` : `${km.toFixed(1)} km`
}

function fmtPaceSingle(secsPerKm: number, unit: Unit): string {
  const secs = unit === 'imperial' ? Math.round(secsPerKm * 1.60934) : secsPerKm
  return formatPaceSecs(secs)
}

function fmtPaceRange(min: number | null, max: number | null, unit: Unit): string | null {
  if (!min && !max) return null
  const label = unit === 'imperial' ? '/mi' : '/km'
  if (min && max && min !== max) return `${fmtPaceSingle(min, unit)}–${fmtPaceSingle(max, unit)}${label}`
  if (min) return `${fmtPaceSingle(min, unit)}${label}`
  return null
}

function fmtActualPace(secsPerKm: number, unit: Unit): string {
  const secs = unit === 'imperial' ? Math.round(secsPerKm * 1.60934) : secsPerKm
  const label = unit === 'imperial' ? '/mi' : '/km'
  return `${formatPaceSecs(secs)}${label}`
}

function fmtActualDist(km: number, unit: Unit): string {
  if (unit === 'imperial') return `${(km * 0.621371).toFixed(2)} mi`
  return `${Number(km).toFixed(2)} km`
}

function secsToSpeed(secsPerKm: number, unit: Unit): number {
  const kmh = 3600 / secsPerKm
  return unit === 'imperial' ? kmh * 0.621371 : kmh
}

function speedLabel(unit: Unit): string {
  return unit === 'imperial' ? 'mph' : 'km/h'
}

function fmtSpeedRange(min: number | null, max: number | null, unit: Unit): string | null {
  if (!min) return null
  const lbl = speedLabel(unit)
  if (max && max !== min) {
    // min pace secs = fastest = highest speed; max pace secs = slowest = lowest speed
    const lo = secsToSpeed(max, unit).toFixed(1)
    const hi = secsToSpeed(min, unit).toFixed(1)
    return `${lo}–${hi} ${lbl}`
  }
  return `${secsToSpeed(min, unit).toFixed(1)} ${lbl}`
}

function fmtActualSpeed(secsPerKm: number, unit: Unit): string {
  return `${secsToSpeed(secsPerKm, unit).toFixed(1)} ${speedLabel(unit)}`
}

function stepSpeedLabel(step: SessionStep, unit: Unit): string | null {
  if (step.objective_type === 'open') return null
  return fmtSpeedRange(step.objective_pace_min_secs, step.objective_pace_max_secs, unit)
}

function stepObjectiveLabel(step: SessionStep, unit: Unit): string {
  if (step.objective_type === 'open') return step.objective_hr_zone ?? ''
  if (step.objective_type === 'distance' && step.objective_distance_m) {
    const dist = fmtDist(step.objective_distance_m, unit)
    const pace = fmtPaceRange(step.objective_pace_min_secs, step.objective_pace_max_secs, unit)
    const zone = step.objective_hr_zone
    return [dist, pace, zone].filter(Boolean).join(' · ')
  }
  if (step.objective_type === 'duration' && step.objective_duration_secs) {
    const dur = formatDurationMins(step.objective_duration_secs)
    const pace = fmtPaceRange(step.objective_pace_min_secs, step.objective_pace_max_secs, unit)
    const zone = step.objective_hr_zone
    return [dur, pace, zone].filter(Boolean).join(' · ')
  }
  return ''
}

function hrLabel(step: SessionStep): string | null {
  if (step.objective_hr_min_bpm && step.objective_hr_max_bpm)
    return `${step.objective_hr_min_bpm}–${step.objective_hr_max_bpm} bpm`
  return null
}

type Props = { session: PlannedSession; onClose: () => void }

export function SessionModal({ session, onClose }: Props) {
  const [unit, setUnit] = useState<Unit>('metric')

  const topLevel = session.steps
    .filter((s) => !s.parent_step_id)
    .sort((a, b) => a.sort_order - b.sort_order)

  const childrenOf = (parentId: number) =>
    session.steps
      .filter((s) => s.parent_step_id === parentId)
      .sort((a, b) => a.sort_order - b.sort_order)

  const mainEffort = topLevel.find((s) => s.step_type === 'effort' || s.step_type === 'repeat')
  const paceDisplay = mainEffort
    ? fmtPaceRange(mainEffort.objective_pace_min_secs, mainEffort.objective_pace_max_secs, unit)
    : null
  const zoneDisplay = mainEffort?.objective_hr_zone ?? null
  const hrDisplay = mainEffort ? hrLabel(mainEffort) : null
  const { logged } = session
  let stepCounter = 0

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
        zIndex: 1000, display: 'flex', alignItems: 'center',
        justifyContent: 'center', padding: 20, overflowY: 'auto',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'white', border: `1px solid ${T.border}`,
          borderRadius: 12, padding: 32, maxWidth: 700, width: '100%',
          position: 'relative', maxHeight: '90vh', overflowY: 'auto',
          fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
          color: T.text,
        }}
      >
        {/* Unit toggle */}
        <div style={{
          position: 'absolute', top: 20, right: 62,
          display: 'flex', background: '#f1f5f9',
          borderRadius: 20, overflow: 'hidden', border: `1px solid ${T.border}`,
        }}>
          {(['metric', 'imperial'] as Unit[]).map((u) => (
            <button
              key={u}
              onClick={() => setUnit(u)}
              style={{
                padding: '5px 10px', fontSize: 11, fontWeight: 600,
                border: 'none', cursor: 'pointer',
                background: unit === u ? '#0f172a' : 'transparent',
                color: unit === u ? 'white' : T.muted,
                letterSpacing: 0.5,
              }}
            >
              {u === 'metric' ? 'km' : 'mi'}
            </button>
          ))}
        </div>

        {/* Close */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute', top: 20, right: 20,
            background: '#f1f5f9', border: 'none',
            borderRadius: '50%', width: 32, height: 32, cursor: 'pointer',
            color: T.muted, fontSize: 20, display: 'flex',
            alignItems: 'center', justifyContent: 'center',
          }}
        >×</button>

        {/* Header */}
        <div style={{ fontSize: 12, letterSpacing: 2, textTransform: 'uppercase', color: T.muted, marginBottom: 8 }}>
          Week {session.week_number} · {session.day_of_week}
        </div>
        <div style={{ fontSize: 28, fontWeight: 500, color: T.text, marginBottom: 16 }}>
          {session.name}
        </div>

        {/* Summary grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24, paddingBottom: 24, borderBottom: `1px solid ${T.border2}` }}>
          {paceDisplay && (
            <div>
              <div style={{ fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', color: T.muted, marginBottom: 4 }}>Target Pace</div>
              <div style={{ fontSize: 18, fontWeight: 600, color: T.text }}>{paceDisplay}</div>
              {mainEffort && fmtSpeedRange(mainEffort.objective_pace_min_secs, mainEffort.objective_pace_max_secs, unit) && (
                <div style={{ fontSize: 12, color: T.muted, marginTop: 2 }}>
                  {fmtSpeedRange(mainEffort.objective_pace_min_secs, mainEffort.objective_pace_max_secs, unit)}
                </div>
              )}
            </div>
          )}
          {hrDisplay && (
            <div>
              <div style={{ fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', color: T.muted, marginBottom: 4 }}>HR Target</div>
              <div style={{ fontSize: 18, fontWeight: 600, color: T.text }}>{hrDisplay}</div>
            </div>
          )}
          {zoneDisplay && (
            <div>
              <div style={{ fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', color: T.muted, marginBottom: 4 }}>Zone</div>
              <div style={{ fontSize: 18, fontWeight: 600, color: T.text }}>{zoneDisplay}</div>
            </div>
          )}
          {logged && (
            <div>
              <div style={{ fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', color: T.muted, marginBottom: 4 }}>Actual Pace</div>
              <div style={{ fontSize: 18, fontWeight: 600, color: T.accent }}>
                {logged.actual_pace_secs ? fmtActualPace(logged.actual_pace_secs, unit) : '—'}
              </div>
              {logged.actual_pace_secs && (
                <div style={{ fontSize: 12, color: T.muted, marginTop: 2 }}>
                  {fmtActualSpeed(logged.actual_pace_secs, unit)}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Logged actual metrics */}
        {logged && (
          <div style={{ background: '#f0f9ff', border: `1px solid #bae6fd`, borderRadius: 8, padding: 16, marginBottom: 20 }}>
            <div style={{ fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase', color: T.accent, marginBottom: 12 }}>
              Logged · {formatDate(logged.session_date)}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: 12 }}>
              {logged.actual_distance_km != null && (
                <div>
                  <div style={{ fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', color: T.muted, marginBottom: 3 }}>Distance</div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: T.text }}>{fmtActualDist(logged.actual_distance_km, unit)}</div>
                </div>
              )}
              {logged.actual_duration_secs != null && (
                <div>
                  <div style={{ fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', color: T.muted, marginBottom: 3 }}>Time</div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: T.text }}>{formatDurationSecs(logged.actual_duration_secs)}</div>
                </div>
              )}
              {logged.actual_hr_avg != null && (
                <div>
                  <div style={{ fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', color: T.muted, marginBottom: 3 }}>Avg HR</div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: T.text }}>{logged.actual_hr_avg} bpm</div>
                </div>
              )}
              {logged.cadence_avg != null && (
                <div>
                  <div style={{ fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', color: T.muted, marginBottom: 3 }}>Cadence</div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: T.text }}>{logged.cadence_avg} spm</div>
                </div>
              )}
              {logged.effort_rpe != null && (
                <div>
                  <div style={{ fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', color: T.muted, marginBottom: 3 }}>RPE</div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: T.text }}>{logged.effort_rpe}/10</div>
                </div>
              )}
            </div>
            {logged.notes && (
              <div style={{ marginTop: 12, fontSize: 12, color: T.muted, lineHeight: 1.6, borderTop: `1px solid ${T.border}`, paddingTop: 12 }}>
                {logged.notes}
              </div>
            )}
          </div>
        )}

        {/* Steps */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {topLevel.map((step) => {
            if (step.step_type !== 'repeat') {
              stepCounter++
              const color = STEP_COLORS[step.step_type]
              return (
                <div
                  key={step.id}
                  style={{ background: T.surface2, borderLeft: `3px solid ${color}`, borderRadius: 4, padding: 16 }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <span style={{
                      background: color, color: 'white', width: 28, height: 28, borderRadius: '50%',
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 12, fontWeight: 600, flexShrink: 0,
                    }}>{stepCounter}</span>
                    <span style={{ fontSize: 14, fontWeight: 600, color: T.text }}>
                      {STEP_LABELS[step.step_type]}
                    </span>
                  </div>
                  <div style={{ marginTop: 12, paddingLeft: 36 }}>
                    {stepObjectiveLabel(step, unit) && (
                      <div style={{ fontSize: 13, color: T.muted }}>{stepObjectiveLabel(step, unit)}</div>
                    )}
                    {stepSpeedLabel(step, unit) && (
                      <div style={{ fontSize: 11, color: T.muted, marginTop: 3, opacity: 0.75 }}>{stepSpeedLabel(step, unit)}</div>
                    )}
                  </div>
                </div>
              )
            }

            stepCounter++
            const children = childrenOf(step.id)
            return (
              <div key={step.id} style={{ border: `1px solid #ede9fe`, borderRadius: 8, overflow: 'hidden' }}>
                <div style={{ background: '#f5f3ff', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{
                    background: STEP_COLORS.repeat, color: 'white', width: 28, height: 28, borderRadius: '50%',
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 12, fontWeight: 600, flexShrink: 0,
                  }}>{stepCounter}</span>
                  <span style={{ fontSize: 14, fontWeight: 600, color: T.text }}>
                    Repeat × {step.repeat_count}
                  </span>
                </div>
                <div style={{ background: 'white', padding: '8px 16px 12px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {children.map((child) => {
                    const childColor = STEP_COLORS[child.step_type]
                    return (
                      <div key={child.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, paddingLeft: 8, borderLeft: `2px solid ${childColor}` }}>
                        <div>
                          <div style={{ fontSize: 12, fontWeight: 600, color: T.text }}>{STEP_LABELS[child.step_type]}</div>
                          <div style={{ fontSize: 11, color: T.muted, marginTop: 2 }}>{stepObjectiveLabel(child, unit)}</div>
                          {stepSpeedLabel(child, unit) && (
                            <div style={{ fontSize: 10, color: T.muted, marginTop: 2, opacity: 0.75 }}>{stepSpeedLabel(child, unit)}</div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
