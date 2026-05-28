export type StepType = 'warmup' | 'effort' | 'recovery' | 'cooldown' | 'repeat'
export type ObjectiveType = 'open' | 'distance' | 'duration' | 'pace' | 'heart_rate' | 'calories'
export type SessionStatus = 'completed' | 'modified' | 'skipped'

export type SessionStep = {
  id: number
  session_id: number
  parent_step_id: number | null
  step_type: StepType
  repeat_count: number | null
  objective_type: ObjectiveType
  objective_distance_m: number | null
  objective_duration_secs: number | null
  objective_pace_min_secs: number | null
  objective_pace_max_secs: number | null
  objective_hr_zone: string | null
  objective_hr_min_bpm: number | null
  objective_hr_max_bpm: number | null
  objective_calories: number | null
  sort_order: number
}

export type PlannedSession = {
  id: number
  plan_id: number
  phase_id: number | null
  week_number: number
  day_of_week: string
  session_type: string
  name: string
  sort_order: number
  steps: SessionStep[]
  logged?: LoggedSession
}

export type LoggedSession = {
  id: number
  session_id: number | null
  plan_id: number | null
  user_id: string
  session_date: string
  status: SessionStatus
  actual_distance_km: number | null
  actual_duration_secs: number | null
  actual_pace_secs: number | null
  actual_hr_avg: number | null
  actual_hr_max: number | null
  cadence_avg: number | null
  effort_rpe: number | null
  notes: string | null
  created_at: string
}

export type Phase = {
  id: number
  plan_id: number
  name: string
  week_start: number
  week_end: number
  sort_order: number
}

export type TrainingPlan = {
  id: number
  user_id: string
  name: string
  goal: string | null
  total_weeks: number
  sessions_per_week: number
  start_date: string | null
  race_date: string | null
  created_at: string
}

export type WeekData = {
  weekNumber: number
  phase: Phase | null
  sessions: PlannedSession[]
}

export type TrainingData = {
  plan: TrainingPlan
  phases: Phase[]
  weeks: WeekData[]
  loggedSessions: LoggedSession[]
}
