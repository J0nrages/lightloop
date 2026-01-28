export type CandidateStatus = 'new' | 'interviewing' | 'offered' | 'rejected'

export type Candidate = {
  id: string
  name: string
  role: string
  score: number
  status: CandidateStatus
}

export const fallbackCandidates: Candidate[] = [
  { id: '1', name: 'Alex Rivera', role: 'Senior Frontend', score: 9.2, status: 'interviewing' },
  { id: '2', name: 'Jordan Smith', role: 'Frontend Engineer', score: 8.5, status: 'new' },
  { id: '3', name: 'Sam Chen', role: 'Senior Frontend', score: 9.8, status: 'offered' },
]

export const fallbackQuiz = {
  question: 'Which aspect should we configure next?',
  options: ['Models', 'Data sources', 'Guardrails', 'UI theme'],
}
