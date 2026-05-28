import { getTrainingData } from '../lib/supabase/training'
import { TrainingClient } from '../components/TrainingClient'

export default async function TrainingPage() {
  const data = await getTrainingData()

  if (!data) {
    return (
      <div className="card" style={{ textAlign: 'center', color: 'var(--muted)', padding: 60 }}>
        No training plan found.
      </div>
    )
  }

  return <TrainingClient data={data} />
}
