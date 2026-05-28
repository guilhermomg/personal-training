'use client'

import { useState } from 'react'
import type { TrainingData, PlannedSession } from '../types/training'
import { formatPaceRange, formatPaceSecs, formatDurationSecs, formatDate } from '../lib/training-format'
import { SessionModal } from './SessionModal'
import { PaceEstimator } from './PaceEstimator'

type Tab = 'plan' | 'log' | 'overview'

const T = {
  card: 'white',
  border: '#e2e8f0',
  border2: '#f1f5f9',
  text: '#1e293b',
  muted: '#64748b',
  accent: '#0ea5e9',
  green: '#16a34a',
  navy: '#0f172a',
  surface2: '#f8fafc',
}

const STATUS_STYLE: Record<string, React.CSSProperties> = {
  completed: { background: '#ecfdf5', color: '#065f46' },
  modified:  { background: '#fef3c7', color: '#92400e' },
  skipped:   { background: '#fee2e2', color: '#991b1b' },
}

const SESSION_TYPE_COLOR: Record<string, string> = {
  easy:     '#0ea5e9',
  tempo:    '#f59e0b',
  long_run: '#6366f1',
  fartlek:  '#8b5cf6',
  interval: '#ef4444',
  race:     '#ef4444',
  recovery: '#10b981',
  other:    '#94a3b8',
}

function card(extra?: React.CSSProperties): React.CSSProperties {
  return { background: T.card, border: `1px solid ${T.border}`, borderRadius: 8, padding: 24, ...extra }
}

function sessionPaceSummary(session: PlannedSession): string | null {
  const mainStep = session.steps.find(
    (s) => !s.parent_step_id && (s.step_type === 'effort' || s.step_type === 'repeat')
  )
  if (!mainStep) return null
  const pace = formatPaceRange(mainStep.objective_pace_min_secs, mainStep.objective_pace_max_secs)
  const zone = mainStep.objective_hr_zone
  return [pace, zone].filter(Boolean).join(' · ') || null
}

export function TrainingClient({ data }: { data: TrainingData }) {
  const [tab, setTab] = useState<Tab>('plan')
  const [selected, setSelected] = useState<PlannedSession | null>(null)

  const { plan, weeks, loggedSessions } = data
  const totalSessions = weeks.reduce((s, w) => s + w.sessions.length, 0)
  const totalLogged = loggedSessions.length

  return (
    <>
      {/* Plan header */}
      <div style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%)', borderRadius: 12, padding: 28, marginBottom: 24 }}>
        <div style={{ fontSize: 12, letterSpacing: 2, textTransform: 'uppercase', color: 'rgba(255,255,255,0.7)', marginBottom: 8 }}>
          Half Marathon Training
        </div>
        <div style={{ fontSize: 32, fontWeight: 500, color: '#fff', marginBottom: 8 }}>
          {plan.name}
        </div>
        <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.8)' }}>
          {plan.total_weeks} weeks · {plan.sessions_per_week} runs/week
          {plan.race_date ? ` · Race ${formatDate(plan.race_date)}` : ''}
        </div>
        {plan.goal && (
          <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.2)', fontSize: 11, color: 'rgba(255,255,255,0.6)' }}>
            {plan.goal}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: `2px solid ${T.border}`, marginBottom: 24, background: T.card, borderRadius: '8px 8px 0 0' }}>
        {(['plan', 'log', 'overview'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              padding: '14px 20px', background: 'none', border: 'none',
              borderBottom: `3px solid ${tab === t ? T.navy : 'transparent'}`,
              marginBottom: -2,
              color: tab === t ? T.navy : T.muted,
              fontSize: 14, fontWeight: 500, cursor: 'pointer', textTransform: 'capitalize',
            }}
          >{t}</button>
        ))}
      </div>

      {/* Plan tab */}
      {tab === 'plan' && (
        <div>
          {weeks.map((week) => {
            const weekLogged = week.sessions.filter((s) => s.logged).length
            return (
              <div key={week.weekNumber} style={{ ...card(), marginBottom: 24 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, paddingBottom: 16, borderBottom: `1px solid ${T.border2}` }}>
                  <div>
                    {week.phase && (
                      <div style={{ fontSize: 12, letterSpacing: 2, textTransform: 'uppercase', color: T.muted, marginBottom: 4 }}>
                        {week.phase.name}
                      </div>
                    )}
                    <div style={{ fontSize: 20, fontWeight: 500, color: T.text }}>Week {week.weekNumber}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 12, letterSpacing: 2, textTransform: 'uppercase', color: T.muted }}>Logged</div>
                    <div style={{ fontSize: 24, fontWeight: 500, color: T.text, marginTop: 4 }}>
                      {weekLogged}<span style={{ fontSize: 13, color: T.muted, fontWeight: 400 }}>/{week.sessions.length}</span>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {week.sessions.map((session) => {
                    const typeColor = SESSION_TYPE_COLOR[session.session_type] ?? T.muted
                    const pace = sessionPaceSummary(session)
                    const isLogged = !!session.logged
                    return (
                      <button
                        key={session.id}
                        onClick={() => setSelected(session)}
                        style={{
                          width: '100%', textAlign: 'left', cursor: 'pointer',
                          background: isLogged ? '#ecf8ff' : T.card,
                          border: `${isLogged ? 2 : 1}px solid ${isLogged ? T.accent : T.border}`,
                          borderRadius: 8, padding: 16, transition: 'all 0.2s',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <span style={{ fontSize: 11, background: '#f1f5f9', padding: '4px 8px', borderRadius: 4, color: T.muted, fontWeight: 600 }}>
                              {session.day_of_week}
                            </span>
                            <span style={{ fontSize: 15, fontWeight: 500, color: T.text }}>{session.name}</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            {isLogged && (
                              <span style={{ ...STATUS_STYLE[session.logged!.status], fontSize: 11, fontWeight: 600, padding: '4px 8px', borderRadius: 4, textTransform: 'uppercase' }}>
                                {session.logged!.status}
                              </span>
                            )}
                            <span style={{ width: 8, height: 8, borderRadius: '50%', background: typeColor, flexShrink: 0 }} />
                          </div>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: T.muted }}>
                          <span>{pace ?? session.session_type.replace('_', ' ')}</span>
                          {isLogged && session.logged!.actual_distance_km && (
                            <span style={{ color: T.accent }}>
                              {Number(session.logged!.actual_distance_km).toFixed(2)} km
                              {session.logged!.actual_pace_secs ? ` · ${formatPaceSecs(session.logged!.actual_pace_secs)}/km` : ''}
                              {session.logged!.actual_hr_avg ? ` · ${session.logged!.actual_hr_avg} bpm` : ''}
                            </span>
                          )}
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Log tab */}
      {tab === 'log' && (
        <div>
          {loggedSessions.length === 0 ? (
            <div style={{ ...card(), textAlign: 'center', color: T.muted, padding: 40 }}>
              No sessions logged yet.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {loggedSessions.map((log) => {
                const linkedSession = weeks.flatMap((w) => w.sessions).find((s) => s.id === log.session_id)
                return (
                  <div
                    key={log.id}
                    style={{ ...card(), cursor: linkedSession ? 'pointer' : 'default' }}
                    onClick={() => linkedSession && setSelected(linkedSession)}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        {linkedSession && (
                          <span style={{ fontSize: 11, background: '#f1f5f9', padding: '3px 8px', borderRadius: 4, color: T.muted, fontWeight: 600 }}>
                            {linkedSession.day_of_week}
                          </span>
                        )}
                        <span style={{ fontSize: 14, fontWeight: 500, color: T.text }}>{linkedSession?.name ?? 'Free Run'}</span>
                      </div>
                      <span style={{ ...STATUS_STYLE[log.status], fontSize: 11, fontWeight: 600, padding: '4px 8px', borderRadius: 4, textTransform: 'uppercase' }}>
                        {log.status}
                      </span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(90px, 1fr))', gap: 12 }}>
                      <div>
                        <div style={{ fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', color: T.muted, marginBottom: 3 }}>Date</div>
                        <div style={{ fontSize: 12, color: T.text }}>{formatDate(log.session_date)}</div>
                      </div>
                      {log.actual_distance_km != null && (
                        <div>
                          <div style={{ fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', color: T.muted, marginBottom: 3 }}>Distance</div>
                          <div style={{ fontSize: 12, fontWeight: 600, color: T.text }}>{Number(log.actual_distance_km).toFixed(2)} km</div>
                        </div>
                      )}
                      {log.actual_pace_secs != null && (
                        <div>
                          <div style={{ fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', color: T.muted, marginBottom: 3 }}>Pace</div>
                          <div style={{ fontSize: 12, fontWeight: 600, color: T.text }}>{formatPaceSecs(log.actual_pace_secs)}/km</div>
                        </div>
                      )}
                      {log.actual_hr_avg != null && (
                        <div>
                          <div style={{ fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', color: T.muted, marginBottom: 3 }}>Avg HR</div>
                          <div style={{ fontSize: 12, fontWeight: 600, color: T.text }}>{log.actual_hr_avg} bpm</div>
                        </div>
                      )}
                      {log.actual_duration_secs != null && (
                        <div>
                          <div style={{ fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', color: T.muted, marginBottom: 3 }}>Time</div>
                          <div style={{ fontSize: 12, fontWeight: 600, color: T.text }}>{formatDurationSecs(log.actual_duration_secs)}</div>
                        </div>
                      )}
                      {log.effort_rpe != null && (
                        <div>
                          <div style={{ fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', color: T.muted, marginBottom: 3 }}>RPE</div>
                          <div style={{ fontSize: 12, fontWeight: 600, color: T.text }}>{log.effort_rpe}/10</div>
                        </div>
                      )}
                    </div>
                    {log.notes && (
                      <div style={{ marginTop: 12, fontSize: 11, color: T.muted, lineHeight: 1.6, borderTop: `1px solid ${T.border}`, paddingTop: 10 }}>
                        {log.notes}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {(() => {
            const pending = weeks.flatMap((w) => w.sessions).filter((s) => !s.logged)
            if (pending.length === 0) return null
            return (
              <div style={{ ...card(), marginTop: 16 }}>
                <div style={{ fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', color: T.muted, marginBottom: 14 }}>
                  Pending · {pending.length} sessions
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {pending.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => setSelected(s)}
                      style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        background: T.surface2, border: `1px solid ${T.border}`,
                        borderRadius: 8, padding: '10px 14px', cursor: 'pointer', textAlign: 'left',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontSize: 10, color: T.muted, fontWeight: 600 }}>W{s.week_number} {s.day_of_week}</span>
                        <span style={{ fontSize: 13, color: T.text }}>{s.name}</span>
                      </div>
                      <span style={{ fontSize: 11, color: T.muted }}>{sessionPaceSummary(s) ?? s.session_type}</span>
                    </button>
                  ))}
                </div>
              </div>
            )
          })()}
        </div>
      )}

      {/* Overview tab */}
      {tab === 'overview' && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
            <div style={card({ padding: 20 })}>
              <div style={{ fontSize: 12, letterSpacing: 2, textTransform: 'uppercase', color: T.muted, marginBottom: 12 }}>Completed</div>
              <div style={{ fontSize: 28, fontWeight: 600, color: T.text }}>
                {totalLogged}<span style={{ fontSize: 14, color: T.muted, fontWeight: 400 }}>/{totalSessions}</span>
              </div>
              <div style={{ fontSize: 12, color: T.muted, marginTop: 4 }}>sessions</div>
            </div>
            <div style={card({ padding: 20 })}>
              <div style={{ fontSize: 12, letterSpacing: 2, textTransform: 'uppercase', color: T.muted, marginBottom: 12 }}>Distance Logged</div>
              <div style={{ fontSize: 28, fontWeight: 600, color: T.text }}>
                {loggedSessions.reduce((s, l) => s + Number(l.actual_distance_km ?? 0), 0).toFixed(1)}
              </div>
              <div style={{ fontSize: 12, color: T.muted, marginTop: 4 }}>km total</div>
            </div>
          </div>

          {weeks.map((week) => {
            const weekLogged = week.sessions.filter((s) => s.logged)
            const pct = Math.round((weekLogged.length / week.sessions.length) * 100)
            const distLogged = weekLogged.reduce((s, sess) => s + Number(sess.logged!.actual_distance_km ?? 0), 0)
            return (
              <div key={week.weekNumber} style={{ ...card({ padding: 20 }), marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: T.text }}>Week {week.weekNumber}</div>
                  <div style={{ fontSize: 12, color: T.muted }}>{weekLogged.length}/{week.sessions.length} sessions · {distLogged.toFixed(1)} km</div>
                </div>
                <div style={{ width: '100%', height: 8, background: T.border, borderRadius: 4, overflow: 'hidden', marginBottom: 8 }}>
                  <div style={{ width: `${pct}%`, height: '100%', background: T.green, borderRadius: 4 }} />
                </div>
                <div style={{ fontSize: 13, color: T.muted }}>{pct}% complete</div>
              </div>
            )
          })}

          <div style={{ ...card({ padding: 20 }), marginTop: 4 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
              <div style={{ fontSize: 12, letterSpacing: 2, textTransform: 'uppercase', color: T.muted }}>Overall Progress</div>
              <div style={{ fontSize: 12, color: T.muted }}>
                {totalLogged}/{totalSessions} sessions · {Math.round((totalLogged / totalSessions) * 100)}%
              </div>
            </div>
            <div style={{ width: '100%', height: 8, background: T.border, borderRadius: 4, overflow: 'hidden', marginBottom: 8 }}>
              <div style={{ width: `${Math.round((totalLogged / totalSessions) * 100)}%`, height: '100%', background: T.green, borderRadius: 4 }} />
            </div>
            <div style={{ fontSize: 13, color: T.muted, marginTop: 8 }}>
              {plan.total_weeks} week plan · {plan.sessions_per_week} sessions/week
            </div>
          </div>

          <PaceEstimator loggedSessions={loggedSessions} />
        </div>
      )}

      {selected && <SessionModal session={selected} onClose={() => setSelected(null)} />}
    </>
  )
}
