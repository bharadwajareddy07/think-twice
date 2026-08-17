'use client'

import { useCallback, useEffect, useState } from 'react'
import { ArrowRight, Clock3, Crown, Radio, Sparkles, Users, Award, Trophy, CheckCircle, XCircle } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { HOUSE_SYMBOLS, OFFICIAL_HOUSES } from '@/lib/constants'
import { formatTime } from '@/lib/game'
import type { House, Player, Question, GameSession, Answer, Result } from '@/lib/types'

type Phase = 'register' | 'welcome' | 'question' | 'think_twice' | 'answer' | 'reveal' | 'results'

interface RpcAnswerResult {
  success: boolean
  is_correct: boolean
  correct_option: string
  explanation?: string | null
  points_earned: number
}

interface RpcFinalizeResult {
  success: boolean
  result_id: string
  score: number
  accuracy: number
}

export function StudentExperience() {
  const [supabase] = useState(() => typeof window === 'undefined' ? null : createClient())

  const [phase, setPhase] = useState<Phase>('register')
  const [player, setPlayer] = useState<Player | null>(null)
  const [playerToken, setPlayerToken] = useState<string>('')
  const [houses, setHouses] = useState<House[]>([])
  const [competitionId, setCompetitionId] = useState<string | null>(null)
  const [questions, setQuestions] = useState<Question[]>([])
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)

  // Registration Form
  const [name, setName] = useState('')
  const [college, setCollege] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [houseId, setHouseId] = useState('')
  const [regError, setRegError] = useState('')
  const [registering, setRegistering] = useState(false)

  // Answers State
  const [firstAnswer, setFirstAnswer] = useState<string | null>(null)
  const [finalAnswer, setFinalAnswer] = useState<string | null>(null)
  const [userAnswers, setUserAnswers] = useState<Answer[]>([])
  const [gameSession, setGameSession] = useState<GameSession | null>(null)
  const [finalResult, setFinalResult] = useState<Result | null>(null)
  const [revealInfo, setRevealInfo] = useState<{ isCorrect: boolean; correctOption: string; explanation?: string | null } | null>(null)

  // Timer State
  const [timeLeft, setTimeLeft] = useState(30)
  const [submitting, setSubmitting] = useState(false)

  const activeQuestion = questions[currentQuestionIndex] || null

  // 1. Initial Load & Identity Recovery
  useEffect(() => {
    let active = true
    async function init() {
      if (!supabase) return

      const { data: houseRows } = await supabase
        .from('houses')
        .select('id, name, color, description')
        .order('name')

      if (!active) return

      const loadedHouses = (houseRows || []).filter((h: { name: string }) =>
        ['AGNI', 'BHUMI', 'VAYU', 'JAL', 'AKASH'].includes(h.name)
      ) as House[]

      setHouses(loadedHouses.length > 0 ? loadedHouses : OFFICIAL_HOUSES.map((h, i) => ({ id: `h-${i}`, name: h.name, color: h.color, description: h.description })))

      // Identity recovery: read only the player ID from the (potentially HttpOnly) cookie
      // player_token is retrieved securely from the database and held in memory only
      const savedPlayerId = document.cookie.match(/(?:^|; )think_twice_player=([^;]+)/)?.[1]

      if (savedPlayerId) {
        const { data: pData } = await supabase
          .from('players')
          .select('id, player_code, player_token, name, college, house_id, status, house:houses(id, name, color)')
          .eq('id', decodeURIComponent(savedPlayerId))
          .maybeSingle()

        if (pData && pData.status !== 'disabled') {
          setPlayer(pData as Player)
          // Hold token in memory only — never written back to document.cookie
          setPlayerToken(pData.player_token || '')

          const { data: comps } = await supabase
            .from('competitions')
            .select('id')
            .eq('status', 'LIVE')
            .limit(1)

          const compId = comps?.[0]?.id || 'default-competition'
          setCompetitionId(compId)

          const { data: session } = await supabase
            .from('game_sessions')
            .select('*')
            .eq('player_id', pData.id)
            .eq('competition_id', compId)
            .maybeSingle()

          if (session) {
            setGameSession(session as GameSession)
            if (session.status === 'COMPLETED') {
              const { data: res } = await supabase
                .from('results')
                .select('*')
                .eq('game_session_id', session.id)
                .maybeSingle()

              if (res) setFinalResult(res as Result)
              setPhase('results')
            } else {
              setPhase('welcome')
            }
          } else {
            setPhase('welcome')
          }
        }
      }
    }

    void init()
    return () => { active = false }
  }, [supabase])

  // Submit Answer via RPC (Security Hardened)
  const submitAnswer = useCallback(async () => {
    if (!activeQuestion || !player || !firstAnswer || !finalAnswer || !supabase) return
    setSubmitting(true)

    const responseTime = Math.max(1, activeQuestion.time_limit - timeLeft)

    try {
      // 1. Invoke SECURE RPC Function on Database
      const { data: rpcData, error: rpcErr } = await supabase.rpc('submit_student_answer', {
        p_game_session_id: gameSession?.id,
        p_player_id: player.id,
        p_player_token: playerToken || player.player_token || '',
        p_question_id: activeQuestion.id,
        p_first_answer: firstAnswer,
        p_final_answer: finalAnswer,
        p_response_time: responseTime,
      })

      let isCorrect = finalAnswer === activeQuestion.correct_option
      let correctOpt = activeQuestion.correct_option || finalAnswer
      let expl = activeQuestion.explanation

      if (!rpcErr && rpcData) {
        const typedRpc = rpcData as RpcAnswerResult
        isCorrect = typedRpc.is_correct
        correctOpt = typedRpc.correct_option
        expl = typedRpc.explanation
      }

      setRevealInfo({
        isCorrect,
        correctOption: correctOpt,
        explanation: expl,
      })

      const didReconsider = true
      const changedAnswer = firstAnswer !== finalAnswer
      const isFirstCorrect = firstAnswer === correctOpt

      const newAnswerRecord: Answer = {
        id: `ans-${Date.now()}`,
        game_session_id: gameSession?.id || 'session-temp',
        player_id: player.id,
        question_id: activeQuestion.id,
        first_answer: firstAnswer,
        final_answer: finalAnswer,
        did_reconsider: didReconsider,
        changed_answer: changedAnswer,
        changed_to_correct: changedAnswer && !isFirstCorrect && isCorrect,
        changed_to_wrong: changedAnswer && isFirstCorrect && !isCorrect,
        is_correct: isCorrect,
        response_time: responseTime,
        submitted_at: new Date().toISOString(),
      }

      setUserAnswers((prev) => [...prev, newAnswerRecord])
    } catch (err: unknown) {
      console.error('Error submitting answer:', err)
      setRevealInfo({
        isCorrect: finalAnswer === activeQuestion.correct_option,
        correctOption: activeQuestion.correct_option || finalAnswer,
        explanation: activeQuestion.explanation,
      })
    } finally {
      setSubmitting(false)
      setPhase('reveal')
    }
  }, [activeQuestion, player, playerToken, firstAnswer, finalAnswer, gameSession, timeLeft, supabase])

  // 2. Timer Loop
  useEffect(() => {
    if (!['question', 'think_twice', 'answer'].includes(phase)) return
    const timer = window.setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          if (phase === 'question') {
            if (firstAnswer) {
              setPhase('think_twice')
              return 15
            } else {
              const defaultChoice = activeQuestion?.options[0] || ''
              setFirstAnswer(defaultChoice)
              setPhase('think_twice')
              return 15
            }
          } else if (phase === 'think_twice') {
            setFinalAnswer(firstAnswer)
            setPhase('answer')
            return 10
          } else if (phase === 'answer') {
            void submitAnswer()
            return 0
          }
        }
        return prev - 1
      })
    }, 1000)
    return () => window.clearInterval(timer)
  }, [phase, firstAnswer, activeQuestion, submitAnswer])

  // 3. Register Handler — uses /api/register to set HttpOnly + Secure cookies server-side
  async function handleRegister() {
    setRegError('')

    if (name.trim().length < 2 || !college.trim() || !houseId) {
      setRegError('Please enter your full name, college, and choose your house.')
      return
    }

    setRegistering(true)
    try {
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          college: college.trim(),
          phone: phone.trim() || null,
          email: email.trim() || null,
          house_id: houseId.startsWith('h-') ? null : houseId,
        }),
      })

      if (!res.ok) {
        const errBody = await res.json() as { error?: string }
        throw new Error(errBody.error || 'Registration could not be completed.')
      }

      // API route set HttpOnly cookies server-side. Now retrieve player from DB to populate state.
      const playerData = await res.json() as { id: string; player_code: string; name: string; college: string; house_id: string | null; status: string }

      // Fetch the player_token from DB into memory (never stored in readable cookie)
      if (!supabase) throw new Error('Supabase client unavailable.')
      const { data: freshPlayer } = await supabase
        .from('players')
        .select('id, player_code, player_token, name, college, house_id, status')
        .eq('id', playerData.id)
        .maybeSingle()

      if (!freshPlayer) throw new Error('Could not retrieve player profile after registration.')

      setPlayer(freshPlayer as Player)
      setPlayerToken(freshPlayer.player_token || '')
      setPhase('welcome')
    } catch (err: unknown) {
      setRegError(err instanceof Error ? err.message : 'Registration failed.')
    } finally {
      setRegistering(false)
    }
  }

  // 4. Begin Competition (SAFE FETCH: Exclude correct_option from student client payload)
  async function beginCompetition() {
    if (!supabase || !player) return
    setSubmitting(true)

    try {
      // 1. Fetch Questions WITHOUT correct_option
      const { data: dbQuestions } = await supabase
        .from('questions')
        .select('id, question_text, prompt, think_twice_prompt, options, time_limit, position')
        .order('position', { ascending: true })

      const loadedQuestions: Question[] = (dbQuestions && dbQuestions.length > 0)
        ? dbQuestions.map((q: Partial<Question>) => ({
            id: q.id || '',
            question_text: q.question_text || q.prompt || 'Question',
            prompt: q.prompt,
            think_twice_prompt: q.think_twice_prompt || 'Pause and reconsider your initial response. Are you certain?',
            options: Array.isArray(q.options) ? q.options : [],
            correct_option: '', // Secret: Excluded until reveal phase!
            time_limit: q.time_limit || 30,
            position: q.position || 1,
          }))
        : [
            {
              id: 'q1',
              question_text: 'Which planet in our solar system has the most moons?',
              prompt: 'Which planet in our solar system has the most moons?',
              think_twice_prompt: 'You might remember Jupiter, but recent astronomical discoveries updated Saturn\'s total count. Are you sure?',
              options: ['Jupiter', 'Saturn', 'Neptune', 'Uranus'],
              correct_option: '',
              time_limit: 30,
              position: 1,
            },
            {
              id: 'q2',
              question_text: 'What is the speed of light in vacuum approximately?',
              prompt: 'What is the speed of light in vacuum approximately?',
              think_twice_prompt: 'Consider whether the value is in km/s or m/s!',
              options: ['300,000 km/s', '150,000 km/s', '3,000,000 km/s', '30,000 km/s'],
              correct_option: '',
              time_limit: 25,
              position: 2,
            },
          ]

      setQuestions(loadedQuestions)

      const compId = competitionId || 'default-competition'
      let session = gameSession

      if (!session) {
        const { data: newSession } = await supabase
          .from('game_sessions')
          .insert({
            player_id: player.id,
            competition_id: compId,
            current_question: 1,
            status: 'IN_PROGRESS',
            started_at: new Date().toISOString(),
            question_started_at: new Date().toISOString(),
          })
          .select('*')
          .single()

        if (newSession) session = newSession as GameSession
      }

      setGameSession(session)
      setCurrentQuestionIndex(0)
      setFirstAnswer(null)
      setFinalAnswer(null)
      setTimeLeft(loadedQuestions[0]?.time_limit || 30)
      setPhase('question')
    } catch (err: unknown) {
      console.error('Error starting competition:', err)
    } finally {
      setSubmitting(false)
    }
  }

  // 5. Select First Answer
  function handleSelectFirstAnswer(option: string) {
    setFirstAnswer(option)
    setFinalAnswer(option)
    setTimeLeft(activeQuestion?.time_limit ? Math.round(activeQuestion.time_limit / 2) : 15)
    setPhase('think_twice')
  }

  // 7. Advance to Next Question or Final Results
  async function nextQuestion() {
    if (currentQuestionIndex + 1 < questions.length) {
      const nextIndex = currentQuestionIndex + 1
      setCurrentQuestionIndex(nextIndex)
      setFirstAnswer(null)
      setFinalAnswer(null)
      setRevealInfo(null)
      setTimeLeft(questions[nextIndex]?.time_limit || 30)
      setPhase('question')

      if (supabase && gameSession) {
        void supabase
          .from('game_sessions')
          .update({ current_question: nextIndex + 1, question_started_at: new Date().toISOString() })
          .eq('id', gameSession.id)
      }
    } else {
      // Finalize via SECURE RPC function
      if (supabase && gameSession && player) {
        try {
          const { data: rpcRes } = await supabase.rpc('finalize_game_session', {
            p_game_session_id: gameSession.id,
            p_player_id: player.id,
            p_player_token: playerToken || player.player_token || '',
          })

          if (rpcRes) {
            const typedFinal = rpcRes as RpcFinalizeResult
            setFinalResult({
              id: typedFinal.result_id || 'res-final',
              game_session_id: gameSession.id,
              player_id: player.id,
              competition_id: competitionId || 'comp-default',
              score: typedFinal.score || 0,
              accuracy: typedFinal.accuracy || 0,
              correct: userAnswers.filter((a) => a.is_correct).length,
              incorrect: userAnswers.filter((a) => !a.is_correct).length,
              unanswered: Math.max(0, questions.length - userAnswers.length),
              completion_time: userAnswers.reduce((acc, a) => acc + a.response_time, 0),
              first_answer_accuracy: 0,
              final_answer_accuracy: typedFinal.accuracy || 0,
              changed_to_correct: userAnswers.filter((a) => a.changed_to_correct).length,
              changed_to_wrong: userAnswers.filter((a) => a.changed_to_wrong).length,
            })
          }
        } catch (err: unknown) {
          console.error('Error finalizing game session:', err)
        }
      }

      setPhase('results')
    }
  }

  const currentHouse = houses.find((h) => h.id === player?.house_id || h.name === (player?.house as { name?: string })?.name)
  const houseSymbol = currentHouse ? HOUSE_SYMBOLS[currentHouse.name as keyof typeof HOUSE_SYMBOLS] || '✨' : '✨'

  return (
    <main className="min-h-screen bg-background text-foreground flex flex-col">
      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-5 py-5 sm:px-8">
        <header className="flex items-center justify-between border-b border-border pb-5">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <Sparkles className="size-4" />
            </div>
            <span className="font-mono text-sm font-bold tracking-tight">THINK TWICE</span>
          </Link>

          <div className="flex items-center gap-4 text-xs font-semibold">
            <Link href="/leaderboard" className="text-muted-foreground hover:text-foreground flex items-center gap-1.5">
              <Trophy className="size-3.5" /> Leaderboard
            </Link>
            <Link href="/admin/login" className="text-muted-foreground hover:text-foreground">
              Admin Portal
            </Link>
          </div>
        </header>

        {phase === 'register' && (
          <section className="grid flex-1 items-center gap-12 py-12 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="max-w-2xl">
              <div className="mb-6 flex items-center gap-2 text-xs font-mono font-bold text-primary uppercase">
                <Radio className="size-4 animate-pulse" /> Live Competition Arena
              </div>
              <h1 className="max-w-xl text-balance text-5xl font-black tracking-[-0.06em] sm:text-6xl">
                Your first answer is only the beginning.
              </h1>
              <p className="mt-6 max-w-lg text-pretty text-lg leading-8 text-muted-foreground">
                Register once, join your house, and take on live questions where careful reflection beats quick guesses.
              </p>
              <div className="mt-8 flex items-center gap-2 text-sm text-muted-foreground">
                <Users className="size-4 text-primary" /> Persistent player identity. No password required.
              </div>
            </div>

            <div className="rounded-3xl border border-border bg-card p-6 shadow-sm sm:p-8 space-y-4">
              <p className="font-mono text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">
                Player Registration
              </p>
              <h2 className="text-2xl font-bold">Join Think Twice</h2>

              <div className="flex flex-col gap-4">
                <label className="flex flex-col gap-1.5 text-xs font-semibold">
                  Full Name
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="h-12 rounded-xl border border-input bg-background px-4 text-base outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    placeholder="e.g. Rahul Sharma"
                  />
                </label>

                <label className="flex flex-col gap-1.5 text-xs font-semibold">
                  College / Institution
                  <input
                    value={college}
                    onChange={(e) => setCollege(e.target.value)}
                    className="h-12 rounded-xl border border-input bg-background px-4 text-base outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    placeholder="e.g. IIT Bombay"
                  />
                </label>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="flex flex-col gap-1.5 text-xs font-semibold">
                    Phone <span className="font-normal text-muted-foreground">(optional)</span>
                    <input
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="h-11 rounded-xl border border-input bg-background px-4 text-sm outline-none"
                    />
                  </label>
                  <label className="flex flex-col gap-1.5 text-xs font-semibold">
                    Email <span className="font-normal text-muted-foreground">(optional)</span>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="h-11 rounded-xl border border-input bg-background px-4 text-sm outline-none"
                    />
                  </label>
                </div>

                <div>
                  <p className="mb-2 text-xs font-semibold">Choose Your House (Strict 5 Houses)</p>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {houses.map((item) => (
                      <button
                        type="button"
                        key={item.id}
                        onClick={() => setHouseId(item.id)}
                        className={`rounded-xl border p-3 text-left text-xs font-semibold transition ${
                          houseId === item.id
                            ? 'border-primary bg-primary/10 font-bold text-foreground'
                            : 'border-border hover:bg-muted text-muted-foreground'
                        }`}
                      >
                        <span className="mr-1.5 text-base">{HOUSE_SYMBOLS[item.name as keyof typeof HOUSE_SYMBOLS] || '✨'}</span>
                        {item.name}
                      </button>
                    ))}
                  </div>
                </div>

                {regError && <p className="text-xs font-semibold text-destructive">{regError}</p>}

                <button
                  onClick={handleRegister}
                  disabled={registering}
                  className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary font-bold text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
                >
                  {registering ? 'Creating Profile...' : 'Register and Join Challenge'} <ArrowRight className="size-4" />
                </button>
              </div>
            </div>
          </section>
        )}

        {phase === 'welcome' && player && (
          <section className="flex flex-1 flex-col items-center justify-center py-16 text-center space-y-6">
            <div className="flex size-20 items-center justify-center rounded-3xl bg-accent text-accent-foreground shadow-sm">
              <Crown className="size-10 text-primary" />
            </div>
            <p className="font-mono text-xs font-bold uppercase tracking-[0.2em] text-primary">
              Welcome Back, {player.name}
            </p>
            <h1 className="max-w-xl text-balance text-5xl font-black tracking-[-0.05em]">
              Your player profile is active.
            </h1>

            <div className="rounded-2xl border border-border bg-card p-6 shadow-sm max-w-md w-full text-left space-y-2 font-mono text-xs">
              <p className="flex justify-between">
                <span className="text-muted-foreground">Player Code:</span>
                <strong className="text-foreground font-bold text-sm">{player.player_code}</strong>
              </p>
              <p className="flex justify-between">
                <span className="text-muted-foreground">College:</span>
                <strong className="text-foreground">{player.college}</strong>
              </p>
              <p className="flex justify-between">
                <span className="text-muted-foreground">Assigned House:</span>
                <strong className="text-foreground flex items-center gap-1">
                  <span>{houseSymbol}</span> {currentHouse?.name ?? 'AGNI'}
                </strong>
              </p>
            </div>

            <button
              onClick={beginCompetition}
              disabled={submitting}
              className="flex h-12 items-center gap-2 rounded-xl bg-primary px-8 font-bold text-primary-foreground hover:opacity-90 transition disabled:opacity-50"
            >
              {submitting ? 'Loading Arena...' : 'Enter Live Competition'} <ArrowRight className="size-4" />
            </button>
          </section>
        )}

        {activeQuestion && (phase === 'question' || phase === 'think_twice' || phase === 'answer') && (
          <section className="flex flex-1 flex-col py-8 space-y-8">
            <div className="flex items-center justify-between text-xs font-mono font-bold">
              <span className="text-muted-foreground">
                QUESTION {currentQuestionIndex + 1} OF {questions.length || 1}
              </span>
              <span className="flex items-center gap-1.5 text-primary text-base">
                <Clock3 className="size-4" /> {formatTime(timeLeft)}
              </span>
            </div>

            <div className="mx-auto w-full max-w-3xl flex-1 flex flex-col justify-center space-y-8">
              {phase === 'question' && (
                <div className="space-y-6">
                  <div>
                    <p className="font-mono text-xs font-bold uppercase tracking-[0.18em] text-primary">
                      Step 1: First Instinct Answer
                    </p>
                    <h1 className="mt-3 text-balance text-3xl font-black sm:text-5xl">
                      {activeQuestion.question_text}
                    </h1>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    {activeQuestion.options.map((option, index) => (
                      <button
                        key={option}
                        onClick={() => handleSelectFirstAnswer(option)}
                        className="group flex min-h-[4.5rem] items-center gap-4 rounded-2xl border border-border bg-card p-5 text-left transition hover:border-primary hover:shadow-md"
                      >
                        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-muted font-mono text-sm font-bold group-hover:bg-primary group-hover:text-primary-foreground transition">
                          {String.fromCharCode(65 + index)}
                        </span>
                        <span className="font-semibold text-base">{option}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {phase === 'think_twice' && (
                <div className="mx-auto max-w-xl text-center space-y-6">
                  <div className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <Sparkles className="size-8" />
                  </div>
                  <div>
                    <p className="font-mono text-xs font-bold uppercase tracking-[0.18em] text-primary">
                      Step 2: Think Twice
                    </p>
                    <h1 className="mt-3 text-3xl font-black">
                      {activeQuestion.think_twice_prompt}
                    </h1>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Your first instinct choice: <strong className="text-foreground font-bold">{firstAnswer}</strong>
                  </p>

                  <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
                    <button
                      onClick={() => {
                        setFinalAnswer(firstAnswer)
                        setPhase('answer')
                      }}
                      className="w-full sm:w-auto h-12 rounded-xl border border-border bg-card px-6 font-bold text-sm hover:bg-muted"
                    >
                      Keep Initial Answer ({firstAnswer})
                    </button>

                    <button
                      onClick={() => setPhase('answer')}
                      className="w-full sm:w-auto h-12 rounded-xl bg-primary px-6 font-bold text-primary-foreground text-sm hover:opacity-90"
                    >
                      Change My Answer <ArrowRight className="inline ml-1 size-4" />
                    </button>
                  </div>
                </div>
              )}

              {phase === 'answer' && (
                <div className="mx-auto max-w-xl text-center space-y-6">
                  <p className="font-mono text-xs font-bold uppercase tracking-[0.18em] text-primary">
                    Step 3: Final Answer Selection
                  </p>
                  <h1 className="text-3xl font-black">Select your final locked answer</h1>

                  <div className="grid gap-3 sm:grid-cols-2 text-left">
                    {activeQuestion.options.map((option, index) => (
                      <button
                        key={option}
                        onClick={() => setFinalAnswer(option)}
                        className={`flex min-h-[4rem] items-center gap-3 rounded-2xl border p-4 font-semibold text-sm transition ${
                          finalAnswer === option
                            ? 'border-primary bg-primary/10 font-bold text-foreground ring-2 ring-primary'
                            : 'border-border bg-card text-muted-foreground hover:bg-muted'
                        }`}
                      >
                        <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-muted font-mono text-xs font-bold">
                          {String.fromCharCode(65 + index)}
                        </span>
                        <span>{option}</span>
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={() => void submitAnswer()}
                    disabled={submitting || !finalAnswer}
                    className="mt-6 h-12 w-full rounded-xl bg-primary font-bold text-primary-foreground text-sm hover:opacity-90 disabled:opacity-50"
                  >
                    {submitting ? 'Locking Answer...' : 'Confirm & Lock Final Answer'}
                  </button>
                </div>
              )}
            </div>
          </section>
        )}

        {phase === 'reveal' && activeQuestion && (
          <section className="flex flex-1 flex-col items-center justify-center py-12 text-center space-y-6 max-w-xl mx-auto">
            {revealInfo?.isCorrect ? (
              <div className="flex size-20 items-center justify-center rounded-3xl bg-emerald-500/10 text-emerald-600">
                <CheckCircle className="size-10" />
              </div>
            ) : (
              <div className="flex size-20 items-center justify-center rounded-3xl bg-rose-500/10 text-rose-500">
                <XCircle className="size-10" />
              </div>
            )}

            <div>
              <p className="font-mono text-xs font-bold uppercase tracking-[0.18em] text-primary">Answer Reveal</p>
              <h1 className="mt-2 text-3xl font-black">
                {revealInfo?.isCorrect ? 'Correct Answer!' : 'Not Quite!'}
              </h1>
            </div>

            <div className="rounded-2xl border border-border bg-card p-6 w-full text-left space-y-3 text-sm">
              <p className="flex justify-between">
                <span className="text-muted-foreground">First Instinct:</span>
                <span className="font-mono font-bold">{firstAnswer}</span>
              </p>
              <p className="flex justify-between">
                <span className="text-muted-foreground">Final Answer:</span>
                <span className="font-mono font-bold">{finalAnswer}</span>
              </p>
              <p className="flex justify-between border-t border-border pt-2">
                <span className="text-muted-foreground">Correct Choice:</span>
                <span className="font-mono font-bold text-emerald-600">{revealInfo?.correctOption ?? 'Revealed'}</span>
              </p>
              {revealInfo?.explanation && (
                <div className="mt-3 rounded-xl bg-muted p-3 text-xs text-muted-foreground">
                  <strong className="text-foreground">Explanation:</strong> {revealInfo.explanation}
                </div>
              )}
            </div>

            <button
              onClick={() => void nextQuestion()}
              className="h-12 w-full rounded-xl bg-primary font-bold text-primary-foreground text-sm hover:opacity-90"
            >
              {currentQuestionIndex + 1 < questions.length ? 'Next Question →' : 'View Competition Results →'}
            </button>
          </section>
        )}

        {phase === 'results' && (
          <section className="flex flex-1 flex-col items-center justify-center py-12 space-y-8 max-w-2xl mx-auto text-center">
            <div className="flex size-20 items-center justify-center rounded-3xl bg-primary text-primary-foreground shadow-sm">
              <Award className="size-10" />
            </div>

            <div>
              <p className="font-mono text-xs font-bold uppercase tracking-[0.2em] text-primary">
                Competition Complete
              </p>
              <h1 className="mt-2 text-4xl font-black tracking-tight">
                Great Performance, {player?.name}!
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                House: <strong className="text-foreground">{houseSymbol} {currentHouse?.name ?? 'AGNI'}</strong>
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full">
              <div className="rounded-2xl border border-border bg-card p-4">
                <p className="text-[10px] font-mono font-bold uppercase text-muted-foreground">Total Score</p>
                <p className="mt-1 text-2xl font-black text-primary">{finalResult?.score ?? 0} pts</p>
              </div>
              <div className="rounded-2xl border border-border bg-card p-4">
                <p className="text-[10px] font-mono font-bold uppercase text-muted-foreground">Accuracy</p>
                <p className="mt-1 text-2xl font-black">{finalResult?.accuracy ?? 0}%</p>
              </div>
              <div className="rounded-2xl border border-border bg-card p-4">
                <p className="text-[10px] font-mono font-bold uppercase text-emerald-600">Switched Correct</p>
                <p className="mt-1 text-2xl font-black text-emerald-600">+{finalResult?.changed_to_correct ?? 0}</p>
              </div>
              <div className="rounded-2xl border border-border bg-card p-4">
                <p className="text-[10px] font-mono font-bold uppercase text-rose-500">Switched Wrong</p>
                <p className="mt-1 text-2xl font-black text-rose-500">-{finalResult?.changed_to_wrong ?? 0}</p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-4 w-full pt-4">
              <Link
                href="/leaderboard"
                className="h-12 w-full flex items-center justify-center gap-2 rounded-xl bg-primary font-bold text-primary-foreground text-sm hover:opacity-90"
              >
                <Trophy className="size-4" /> View Live Leaderboard
              </Link>
            </div>
          </section>
        )}

        <footer className="flex items-center justify-between border-t border-border py-5 text-xs text-muted-foreground">
          <span>Think Twice Challenge</span>
          <span>Five Houses: 🔥 AGNI • 🌍 BHUMI • 🌬️ VAYU • 💧 JAL • ✨ AKASH</span>
        </footer>
      </div>
    </main>
  )
}
