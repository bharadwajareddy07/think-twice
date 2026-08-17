export type HouseName = 'AGNI' | 'BHUMI' | 'VAYU' | 'JAL' | 'AKASH'

export interface House {
  id: string
  name: HouseName
  color: string
  description?: string | null
  created_at?: string
}

export interface Player {
  id: string
  player_code: string
  player_token?: string
  name: string
  college: string
  phone?: string | null
  email?: string | null
  house_id: string | null
  status: 'active' | 'disabled'
  created_at?: string
  house?: House | null
}

export type CompetitionStatus = 'DRAFT' | 'UPCOMING' | 'LIVE' | 'PAUSED' | 'COMPLETED' | 'CANCELLED'

export interface Competition {
  id: string
  name: string
  description?: string | null
  start_time?: string | null
  end_time?: string | null
  duration: number // in seconds
  difficulty: string
  category: string
  question_count: number
  participant_limit?: number | null
  status: CompetitionStatus
  created_at?: string
}

export interface Question {
  id: string
  question_text: string
  prompt?: string | null
  think_twice_prompt?: string | null
  options: string[]
  correct_option?: string
  explanation?: string | null
  difficulty?: string
  category?: string
  time_limit: number // in seconds
  position: number
  created_at?: string
}

export interface CompetitionQuestion {
  id: string
  competition_id: string
  question_id: string
  position: number
  created_at?: string
  question?: Question
}

export type GameSessionStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'ABANDONED'

export interface GameSession {
  id: string
  player_id: string
  competition_id: string
  current_question: number
  started_at: string
  question_started_at?: string
  completed_at?: string | null
  status: GameSessionStatus
  score: number
  created_at?: string
}

export interface Answer {
  id: string
  game_session_id: string
  player_id: string
  question_id: string
  first_answer: string
  final_answer: string
  did_reconsider: boolean
  changed_answer: boolean
  changed_to_correct: boolean
  changed_to_wrong: boolean
  is_correct: boolean
  response_time: number
  submitted_at: string
}

export interface Result {
  id: string
  game_session_id: string
  player_id: string
  competition_id: string
  score: number
  accuracy: number
  correct: number
  incorrect: number
  unanswered: number
  completion_time: number
  first_answer_accuracy: number
  final_answer_accuracy: number
  changed_to_correct: number
  changed_to_wrong: number
  player_rank?: number | null
  house_rank?: number | null
  created_at?: string
  player?: Player
  competition?: Competition
}

export interface AdminRole {
  id: string
  user_id: string
  role: 'admin' | 'operator'
  created_at?: string
}
