import type { Answer, Question } from './types'

export function validateAdminNextUrl(next: string | null): string {
  if (!next) return '/admin'
  try {
    const decoded = decodeURIComponent(next)
    if (decoded.startsWith('/admin') && !decoded.startsWith('/admin/login') && !decoded.includes('//')) {
      return decoded
    }
  } catch {
    // fallback
  }
  return '/admin'
}

export function formatTime(seconds: number): string {
  const mins = Math.floor(Math.max(0, seconds) / 60)
  const secs = Math.max(0, seconds) % 60
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
}

export interface ScoreBreakdown {
  score: number
  correct: number
  incorrect: number
  unanswered: number
  accuracy: number
  firstAnswerAccuracy: number
  finalAnswerAccuracy: number
  changedToCorrect: number
  changedToWrong: number
  completionTime: number
}

export function calculateScoreAndStats(
  answers: Answer[],
  questions: Question[],
  totalTimeSeconds: number = 0
): ScoreBreakdown {
  const totalQuestions = questions.length
  if (totalQuestions === 0) {
    return {
      score: 0,
      correct: 0,
      incorrect: 0,
      unanswered: 0,
      accuracy: 0,
      firstAnswerAccuracy: 0,
      finalAnswerAccuracy: 0,
      changedToCorrect: 0,
      changedToWrong: 0,
      completionTime: totalTimeSeconds,
    }
  }

  let totalScore = 0
  let correctCount = 0
  let incorrectCount = 0
  let firstCorrectCount = 0
  let finalCorrectCount = 0
  let changedToCorrectCount = 0
  let changedToWrongCount = 0

  const questionMap = new Map<string, Question>()
  questions.forEach((q) => questionMap.set(q.id, q))

  answers.forEach((ans) => {
    const question = questionMap.get(ans.question_id)
    if (!question) return

    const correctChoice = question.correct_option
    const isFirstCorrect = ans.first_answer === correctChoice
    const isFinalCorrect = ans.final_answer === correctChoice

    if (isFirstCorrect) firstCorrectCount++
    if (isFinalCorrect) {
      finalCorrectCount++
      correctCount++
      totalScore += 100
    } else {
      incorrectCount++
    }

    if (ans.changed_answer) {
      if (!isFirstCorrect && isFinalCorrect) {
        changedToCorrectCount++
        totalScore += 30
      } else if (isFirstCorrect && !isFinalCorrect) {
        changedToWrongCount++
        totalScore = Math.max(0, totalScore - 10)
      }
    } else if (isFirstCorrect && isFinalCorrect) {
      totalScore += 20
    }
  })

  const unansweredCount = Math.max(0, totalQuestions - answers.length)
  const accuracy = Math.round((correctCount / totalQuestions) * 100)
  const firstAnswerAccuracy = Math.round((firstCorrectCount / totalQuestions) * 100)
  const finalAnswerAccuracy = Math.round((finalCorrectCount / totalQuestions) * 100)

  return {
    score: totalScore,
    correct: correctCount,
    incorrect: incorrectCount,
    unanswered: unansweredCount,
    accuracy,
    firstAnswerAccuracy,
    finalAnswerAccuracy,
    changedToCorrect: changedToCorrectCount,
    changedToWrong: changedToWrongCount,
    completionTime: totalTimeSeconds,
  }
}
