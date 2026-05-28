import { createClient } from './server'
import type { TrainingData, TrainingPlan, Phase, PlannedSession, LoggedSession, SessionStep } from '../../types/training'

async function trainingDb() {
  const supabase = await createClient()
  return supabase.schema('training') as any
}

export async function getTrainingData(): Promise<TrainingData | null> {
  const db = await trainingDb()

  const { data: plan } = await db
    .from('plans')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1)
    .single() as { data: TrainingPlan | null }

  if (!plan) return null

  const [
    { data: phasesRaw },
    { data: sessionsRaw },
    { data: loggedRaw },
  ] = await Promise.all([
    db.from('phases').select('*').eq('plan_id', plan.id).order('sort_order'),
    db.from('sessions').select('*').eq('plan_id', plan.id).order('week_number').order('sort_order'),
    db.from('logged_sessions').select('*').eq('plan_id', plan.id).order('session_date', { ascending: false }),
  ])

  const phases = (phasesRaw ?? []) as Phase[]
  const sessions = (sessionsRaw ?? []) as any[]
  const logged = (loggedRaw ?? []) as LoggedSession[]

  const sessionIds: number[] = sessions.map((s) => s.id)

  const { data: stepsRaw } = sessionIds.length
    ? await db.from('session_steps').select('*').in('session_id', sessionIds).order('sort_order')
    : { data: [] }

  const steps = (stepsRaw ?? []) as SessionStep[]

  const enriched: PlannedSession[] = sessions.map((s) => ({
    ...s,
    steps: steps.filter((st) => st.session_id === s.id),
    logged: logged.find((l) => l.session_id === s.id),
  }))

  const weekMap = new Map<number, PlannedSession[]>()
  for (const session of enriched) {
    if (!weekMap.has(session.week_number)) weekMap.set(session.week_number, [])
    weekMap.get(session.week_number)!.push(session)
  }

  const weeks = Array.from(weekMap.entries())
    .sort(([a], [b]) => a - b)
    .map(([weekNumber, weekSessions]) => ({
      weekNumber,
      phase: phases.find((p) => weekNumber >= p.week_start && weekNumber <= p.week_end) ?? null,
      sessions: weekSessions,
    }))

  return { plan, phases, weeks, loggedSessions: logged }
}
