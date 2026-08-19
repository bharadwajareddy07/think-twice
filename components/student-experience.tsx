'use client'

import { useEffect, useState, useCallback } from 'react'
import { ArrowRight, Clock3, Crown, ShieldAlert, Sparkles, Trophy, CheckCircle2, AlertCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { Player, House, Question, GameSession, Result } from '@/lib/types'

const OFFICIAL_HOUSES = [
  { name: 'AGNI', color: '#ef4444', description: 'Fire — Passion, Drive, and Quick Action' },
  { name: 'BHUMI', color: '#10b981', description: 'Earth — Stability, Depth, and Resilience' },
  { name: 'VAYU', color: '#06b6d4', description: 'Wind — Agility, Innovation, and Clarity' },
  { name: 'JAL', color: '#3b82f6', description: 'Water — Flow, Adaptability, and Intuition' },
  { name: 'AKASH', color: '#8b5cf6', description: 'Ether — Vision, Wisdom, and Higher Insight' },
]

const HOUSE_SYMBOLS: Record<string, string> = {
  AGNI: '🔥',
  BHUMI: '🌍',
  VAYU: '🌬️',
  JAL: '💧',
  AKASH: '✨',
}

type Phase = 'register' | 'welcome' | 'question' | 'think_twice' | 'answer' | 'reveal' | 'results'

interface RpcAnswerResult {
  success: boolean
  answer_id: string
  is_correct: boolean
  correct_option: string
  explanation?: string | null
  points_earned: number
}

export function StudentExperience() {
  const [phase, setPhase] = useState<Phase>('register')
  const [player, setPlayer] = useState<Player | null>(null)
  const [playerToken, setPlayerToken] = useState<string>('')
  const [houses, setHouses] = useState<House[]>([])
  const [competitionId, setCompetitionId] = useState<string | null>(null)
  const [questions, setQuestions] = useState<Question[]>([])
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)

  // Competition Access Control State (Single Source of Truth)
  const [compStatus, setCompStatus] = useState<string>('LOADING')
  const [canEnter, setCanEnter] = useState<boolean>(false)
  const [compMessage, setCompMessage] = useState<string>('Checking competition status...')
  const [activeCompData, setActiveCompData] = useState<{ id: string; name: string; status: string } | null>(null)

  // Registration Form State
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
  const [gameSession, setGameSession] = useState<GameSession | null>(null)
  const [finalResult, setFinalResult] = useState<Result | null>(null)
  const [revealInfo, setRevealInfo] = useState<{ isCorrect: boolean; correctOption: string; explanation?: string | null } | null>(null)

  // Timer State
  const [timeLeft, setTimeLeft] = useState(30)
  const [submitting, setSubmitting] = useState(false)

  const supabase = createClient()
  const activeQuestion = questions[currentQuestionIndex] || null

  // 1. Single Source of Truth Competition Status Polling (Every 3 Seconds)
  const checkCompetitionStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/competition/status')
      if (!res.ok) return
      const data = await res.json() as {
        hasCompetition: boolean
        status: string
        canEnter: boolean
        message: string
        competition: { id: string; name: string; status: string } | null
      }

      setCompStatus(data.status || 'NO_COMPETITION')
      setCanEnter(Boolean(data.canEnter))
      setCompMessage(data.message || '')
      if (data.competition) {
        setActiveCompData(data.competition)
        setCompetitionId(data.competition.id)
      } else {
        setActiveCompData(null)
        setCompetitionId(null)
      }
    } catch (err: unknown) {
      console.error('Error checking competition status:', err)
    }
  }, [])

  useEffect(() => {
    let isMounted = true
    const poll = async () => {
      if (!isMounted) return
      await checkCompetitionStatus()
    }
    void poll()
    const interval = setInterval(() => {
      void poll()
    }, 3000)
    return () => {
      isMounted = false
      clearInterval(interval)
    }
  }, [checkCompetitionStatus])

  // 2. Initial Load & Player Identity Recovery
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

      setHouses(loadedHouses.length > 0 ? loadedHouses : OFFICIAL_HOUSES.map((h, i) => ({ id: `h-${i}`, name: h.name as House['name'], color: h.color, description: h.description })))

      const savedPlayerId = document.cookie.match(/(?:^|; )think_twice_player=([^;]+)/)?.[1]

      if (savedPlayerId) {
        const { data: pData } = await supabase
          .from('players')
          .select('id, player_code, player_token, name, college, house_id, status, house:houses(id, name, color)')
          .eq('id', decodeURIComponent(savedPlayerId))
          .maybeSingle()

        if (pData && pData.status !== 'disabled') {
          setPlayer(pData as Player)
          setPlayerToken(pData.player_token || '')

          if (pData.id && competitionId) {
            const { data: session } = await supabase
              .from('game_sessions')
              .select('*')
              .eq('player_id', pData.id)
              .eq('competition_id', competitionId)
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
          } else {
            setPhase('welcome')
          }
        }
      }
    }

    void init()
    return () => { active = false }
  }, [supabase, competitionId])

  // 3. Submit Answer via RPC (Security Hardened)
  const submitAnswer = useCallback(async () => {
    if (!activeQuestion || !player || !firstAnswer || !finalAnswer || !supabase) return
    setSubmitting(true)

    const responseTime = Math.max(1, activeQuestion.time_limit - timeLeft)

    try {
      const { data: rpcData, error: rpcErr } = await supabase.rpc('submit_student_answer', {
        p_game_session_id: gameSession?.id,
        p_player_id: player.id,
        p_player_token: playerToken || player.player_token || '',
        p_question_id: activeQuestion.id,
        p_first_answer: firstAnswer,
        p_final_answer: finalAnswer,
        p_response_time: responseTime,
      })

      let isCorrect = finalAnswer.trim().toLowerCase() === (activeQuestion.correct_option || '').trim().toLowerCase()
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

  // Timer Loop
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

  // 4. Register Handler — uses /api/register
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
          house_id: houseId,
        }),
      })

      if (!res.ok) {
        const errBody = await res.json() as { error?: string }
        throw new Error(errBody.error || 'Registration could not be completed.')
      }

      const playerData = await res.json() as { id: string; player_code: string; name: string; college: string; house_id: string | null; status: string }

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

  // 5. Begin Competition (Strict Backend Access Control Verification)
  async function beginCompetition() {
    if (!player) return
    setSubmitting(true)
    setRegError('')

    try {
      // 1. Backend Single Source of Truth Status Check
      const statusRes = await fetch('/api/competition/status')
      const statusData = await statusRes.json() as {
        hasCompetition: boolean
        status: string
        canEnter: boolean
        message: string
        competition: { id: string; name: string; status: string } | null
      }

      setCompStatus(statusData.status)
      setCanEnter(statusData.canEnter)
      setCompMessage(statusData.message)

      if (!statusData.canEnter || !statusData.competition) {
        setRegError(`Access Denied: ${statusData.message}`)
        return
      }

      const targetCompId = statusData.competition.id
      setCompetitionId(targetCompId)

      // 2. Fetch Questions via Protected API (Verifies LIVE status on server)
      const qRes = await fetch(`/api/competition/questions?competition_id=${targetCompId}`)
      if (!qRes.ok) {
        const errData = await qRes.json() as { error?: string }
        throw new Error(errData.error || 'Access Denied: Could not fetch competition questions.')
      }

      const qData = await qRes.json() as {
        success: boolean
        questions: Array<Partial<Question> & { options: unknown }>
      }

      const loadedQuestions: Question[] = (qData.questions || []).map((q) => {
        let opts: string[] = []
        if (Array.isArray(q.options)) {
          opts = q.options.map(String)
        } else if (typeof q.options === 'string') {
          try {
            opts = JSON.parse(q.options)
          } catch {
            opts = []
          }
        }
        return {
          id: q.id || '',
          question_text: q.question_text || q.prompt || 'Question',
          prompt: q.prompt,
          think_twice_prompt: q.think_twice_prompt || 'Pause and reconsider your initial response. Are you certain?',
          options: opts,
          correct_option: '',
          explanation: '',
          time_limit: q.time_limit || 30,
          position: q.position || 1,
        }
      })

      if (loadedQuestions.length === 0) {
        setRegError('No questions have been published for this competition yet.')
        return
      }

      setQuestions(loadedQuestions)

      // 3. Create or Fetch Game Session
      let session = gameSession
      if (!session && supabase) {
        const { data: existingSession } = await supabase
          .from('game_sessions')
          .select('*')
          .eq('player_id', player.id)
          .eq('competition_id', targetCompId)
          .maybeSingle()

        if (existingSession) {
          session = existingSession as GameSession
        } else {
          const { data: newSession, error: sessionErr } = await supabase
            .from('game_sessions')
            .insert({
              player_id: player.id,
              competition_id: targetCompId,
              current_question: 1,
              status: 'IN_PROGRESS',
              started_at: new Date().toISOString(),
              question_started_at: new Date().toISOString(),
            })
            .select('*')
            .single()

          if (sessionErr) console.error('Session creation warning:', sessionErr)
          if (newSession) session = newSession as GameSession
        }
      }

      setGameSession(session)
      setCurrentQuestionIndex(0)
      setFirstAnswer(null)
      setFinalAnswer(null)
      setTimeLeft(loadedQuestions[0]?.time_limit || 30)
      setPhase('question')
    } catch (err: unknown) {
      console.error('Error launching competition:', err)
      setRegError(err instanceof Error ? err.message : 'Access Denied: Could not enter live competition.')
    } finally {
      setSubmitting(false)
    }
  }

  // 6. Select First Answer
  function handleSelectFirstAnswer(option: string) {
    setFirstAnswer(option)
    setFinalAnswer(option)
    setTimeLeft(activeQuestion?.time_limit ? Math.round(activeQuestion.time_limit / 2) : 15)
    setPhase('think_twice')
  }

  // 7. Advance to Next Question or Final Results
  async function nextQuestion() {
    setRevealInfo(null)
    setFirstAnswer(null)
    setFinalAnswer(null)

    if (currentQuestionIndex + 1 < questions.length) {
      const nextIdx = currentQuestionIndex + 1
      setCurrentQuestionIndex(nextIdx)
      setTimeLeft(questions[nextIdx]?.time_limit || 30)
      setPhase('question')
    } else {
      setSubmitting(true)
      try {
        if (gameSession && player && supabase) {
          const { data: finalizeData, error: finalizeErr } = await supabase.rpc('finalize_game_session', {
            p_game_session_id: gameSession.id,
            p_player_id: player.id,
            p_player_token: playerToken || player.player_token || '',
          })

          if (!finalizeErr && finalizeData) {
            const { data: res } = await supabase
              .from('results')
              .select('*')
              .eq('game_session_id', gameSession.id)
              .maybeSingle()

            if (res) setFinalResult(res as Result)
          }
        }
      } catch (err: unknown) {
        console.error('Error finalizing session:', err)
      } finally {
        setSubmitting(false)
        setPhase('results')
      }
    }
  }

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60)
    const s = sec % 60
    return `${m}:${s < 10 ? '0' : ''}${s}`
  }

  const currentHouse = houses.find((h) => h.id === player?.house_id)
  const houseSymbol = HOUSE_SYMBOLS[currentHouse?.name as keyof typeof HOUSE_SYMBOLS] || '✨'

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-md sticky top-0 z-40">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground font-black tracking-tighter">
              TT
            </div>
            <div>
              <span className="font-black tracking-tight text-base">THINK TWICE</span>
              <span className="ml-2 rounded-md bg-muted px-2 py-0.5 font-mono text-[10px] font-bold text-muted-foreground uppercase">
                College Arena
              </span>
            </div>
          </div>

          {player && (
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex flex-col text-right font-mono text-xs">
                <span className="font-bold text-foreground">{player.name}</span>
                <span className="text-muted-foreground">{player.college}</span>
              </div>
              <div className="flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1 font-mono text-xs font-bold">
                <span>{houseSymbol}</span>
                <span>{currentHouse?.name ?? 'AGNI'}</span>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-4 py-6">

        {/* REGISTRATION PHASE */}
        {phase === 'register' && (
          <section className="flex flex-1 flex-col items-center justify-center py-12">
            <div className="w-full max-w-xl space-y-8 rounded-3xl border border-border bg-card p-8 shadow-xl">
              <div className="text-center space-y-2">
                <span className="inline-block rounded-full bg-primary/10 px-3 py-1 font-mono text-xs font-bold text-primary uppercase">
                  Student Portal
                </span>
                <h1 className="text-3xl sm:text-4xl font-black tracking-tight">Register for Competition</h1>
                <p className="text-xs text-muted-foreground">
                  Select your house and enter your credentials to join the live challenge.
                </p>
              </div>

              {/* Real-time Status Card during registration */}
              <div className={`rounded-2xl p-4 text-center border text-xs font-semibold space-y-1 ${
                compStatus === 'LIVE'
                  ? 'bg-rose-500/10 border-rose-500/30 text-rose-600'
                  : compStatus === 'NO_COMPETITION'
                  ? 'bg-muted/60 border-border text-muted-foreground'
                  : compStatus === 'COMPLETED' || compStatus === 'CANCELLED'
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600'
                  : 'bg-amber-500/10 border-amber-500/30 text-amber-600'
              }`}>
                <div className="font-mono font-bold uppercase tracking-wider flex items-center justify-center gap-1.5">
                  {compStatus === 'LIVE' ? <span className="size-2 rounded-full bg-rose-500 animate-ping" /> : <AlertCircle className="size-3.5" />}
                  Event Status: {compStatus}
                </div>
                <p className="text-muted-foreground">{compMessage}</p>
              </div>

              <div className="space-y-4">
                <label className="flex flex-col gap-1.5 text-xs font-semibold">
                  Full Name <span className="text-destructive">*</span>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Rahul Sharma"
                    className="h-11 rounded-xl border border-input bg-background px-4 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </label>

                <label className="flex flex-col gap-1.5 text-xs font-semibold">
                  College / Institution <span className="text-destructive">*</span>
                  <input
                    value={college}
                    onChange={(e) => setCollege(e.target.value)}
                    placeholder="e.g. National Institute of Technology"
                    className="h-11 rounded-xl border border-input bg-background px-4 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </label>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="flex flex-col gap-1.5 text-xs font-semibold">
                    Phone <span className="font-normal text-muted-foreground">(optional)</span>
                    <input
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+91 98765 43210"
                      className="h-11 rounded-xl border border-input bg-background px-4 text-sm outline-none"
                    />
                  </label>
                  <label className="flex flex-col gap-1.5 text-xs font-semibold">
                    Email <span className="font-normal text-muted-foreground">(optional)</span>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="rahul@example.com"
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
                            ? 'border-primary bg-primary/10 font-bold text-foreground ring-2 ring-primary/30'
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
                  {registering ? 'Creating Profile...' : 'Register Player Profile'} <ArrowRight className="size-4" />
                </button>
              </div>
            </div>
          </section>
        )}

        {/* WELCOME / WAITING PHASE (With Competition Access Control) */}
        {phase === 'welcome' && player && (
          <section className="flex flex-1 flex-col items-center justify-center py-12 text-center space-y-6">
            <div className="flex size-20 items-center justify-center rounded-3xl bg-accent text-accent-foreground shadow-sm">
              <Crown className="size-10 text-primary" />
            </div>
            <p className="font-mono text-xs font-bold uppercase tracking-[0.2em] text-primary">
              Welcome Back, {player.name}
            </p>
            <h1 className="max-w-xl text-balance text-4xl sm:text-5xl font-black tracking-[-0.05em]">
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

            {/* Competition Access Control Card */}
            <div className="rounded-2xl border border-border bg-card p-6 shadow-sm max-w-md w-full text-center space-y-3">
              <div className="flex items-center justify-center gap-2">
                <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-mono text-xs font-bold uppercase tracking-wider ${
                  compStatus === 'LIVE'
                    ? 'bg-rose-500/10 text-rose-600 border border-rose-500/30'
                    : compStatus === 'NO_COMPETITION'
                    ? 'bg-muted text-muted-foreground border border-border'
                    : compStatus === 'COMPLETED' || compStatus === 'CANCELLED'
                    ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/30'
                    : 'bg-amber-500/10 text-amber-600 border border-amber-500/30'
                }`}>
                  {compStatus === 'LIVE' ? <span className="size-2 rounded-full bg-rose-500 animate-ping" /> : <ShieldAlert className="size-3.5" />}
                  Event Status: {compStatus}
                </span>
              </div>

              <p className="text-xs text-muted-foreground font-semibold leading-relaxed">
                {compMessage}
              </p>

              {activeCompData && (
                <p className="font-mono text-[11px] text-primary font-bold">
                  Active Event: &quot;{activeCompData.name}&quot;
                </p>
              )}
            </div>

            {regError && <div className="rounded-xl bg-destructive/10 p-3 text-xs font-bold text-destructive max-w-md w-full">{regError}</div>}

            {/* CONDITIONAL ENTRY CONTROL */}
            {canEnter ? (
              <button
                onClick={beginCompetition}
                disabled={submitting}
                className="flex h-12 items-center gap-2 rounded-xl bg-primary px-8 font-bold text-primary-foreground hover:opacity-90 transition disabled:opacity-50 shadow-lg animate-pulse"
              >
                {submitting ? 'Verifying & Loading Arena...' : 'Enter Live Competition'} <ArrowRight className="size-4" />
              </button>
            ) : (
              <div className="text-xs font-mono font-bold text-muted-foreground bg-muted/60 px-6 py-3.5 rounded-2xl border border-border max-w-md w-full flex items-center justify-center gap-2">
                {compStatus === 'NO_COMPETITION' ? (
                  <>🔒 Competition Entry Disabled (Waiting for Admin to Create Event)</>
                ) : compStatus === 'COMPLETED' || compStatus === 'CANCELLED' ? (
                  <>🏁 Competition Ended (Entry Closed)</>
                ) : (
                  <>⏳ Entry Locked (Waiting for Admin to Start Event)</>
                )}
              </div>
            )}
          </section>
        )}

        {/* QUESTION / QUIZ ARENA */}
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

                  <div className="grid gap-3 sm:grid-cols-2">
                    {activeQuestion.options.map((option) => (
                      <button
                        key={option}
                        onClick={() => {
                          setFinalAnswer(option)
                          setPhase('answer')
                          setTimeLeft(10)
                        }}
                        className={`flex min-h-[4rem] items-center justify-between rounded-2xl border p-4 text-left font-semibold transition ${
                          finalAnswer === option
                            ? 'border-primary bg-primary/10 font-bold text-foreground'
                            : 'border-border hover:bg-muted text-muted-foreground'
                        }`}
                      >
                        <span>{option}</span>
                        {firstAnswer === option && (
                          <span className="rounded-md bg-muted px-2 py-0.5 font-mono text-[10px] font-bold uppercase text-muted-foreground">
                            Instinct
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {phase === 'answer' && (
                <div className="mx-auto max-w-md text-center space-y-6">
                  <div className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600">
                    <CheckCircle2 className="size-8" />
                  </div>
                  <h2 className="text-3xl font-black">Answer Locked In</h2>
                  <div className="rounded-2xl border border-border bg-card p-6 text-left space-y-3 text-sm">
                    <p className="flex justify-between">
                      <span className="text-muted-foreground">First Choice:</span>
                      <strong className="text-foreground">{firstAnswer}</strong>
                    </p>
                    <p className="flex justify-between">
                      <span className="text-muted-foreground">Final Choice:</span>
                      <strong className="text-foreground">{finalAnswer}</strong>
                    </p>
                  </div>
                  <button
                    onClick={submitAnswer}
                    disabled={submitting}
                    className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary font-bold text-primary-foreground hover:opacity-90 disabled:opacity-50"
                  >
                    {submitting ? 'Submitting to Database...' : 'Confirm Submission'}
                  </button>
                </div>
              )}
            </div>
          </section>
        )}

        {/* REVEAL PHASE */}
        {phase === 'reveal' && revealInfo && (
          <section className="flex flex-1 flex-col items-center justify-center py-12 text-center space-y-6">
            <div className={`mx-auto flex size-20 items-center justify-center rounded-3xl ${revealInfo.isCorrect ? 'bg-emerald-500/10 text-emerald-600' : 'bg-rose-500/10 text-rose-600'}`}>
              {revealInfo.isCorrect ? <CheckCircle2 className="size-10" /> : <AlertCircle className="size-10" />}
            </div>

            <h1 className="text-4xl font-black">{revealInfo.isCorrect ? 'Correct!' : 'Incorrect'}</h1>

            <div className="rounded-2xl border border-border bg-card p-6 max-w-md w-full text-left space-y-3 text-sm">
              <p className="flex justify-between">
                <span className="text-muted-foreground">Correct Answer:</span>
                <strong className="text-emerald-600 font-bold">{revealInfo.correctOption}</strong>
              </p>
              {revealInfo.explanation && (
                <div className="pt-2 border-t border-border text-xs text-muted-foreground">
                  <strong className="text-foreground font-bold">Explanation:</strong> {revealInfo.explanation}
                </div>
              )}
            </div>

            <button
              onClick={nextQuestion}
              disabled={submitting}
              className="flex h-12 items-center gap-2 rounded-xl bg-primary px-8 font-bold text-primary-foreground hover:opacity-90 disabled:opacity-50"
            >
              {currentQuestionIndex + 1 < questions.length ? 'Next Question' : 'View Final Results'} <ArrowRight className="size-4" />
            </button>
          </section>
        )}

        {/* RESULTS PHASE */}
        {phase === 'results' && (
          <section className="flex flex-1 flex-col items-center justify-center py-12 text-center space-y-6">
            <div className="flex size-20 items-center justify-center rounded-3xl bg-amber-500/10 text-amber-600 shadow-sm">
              <Trophy className="size-10" />
            </div>
            <h1 className="text-5xl font-black">Competition Complete!</h1>
            <p className="text-muted-foreground text-sm max-w-md">
              Thank you for participating in Think Twice! Your score and instinct analytics have been recorded for your house.
            </p>

            {finalResult && (
              <div className="rounded-2xl border border-border bg-card p-6 max-w-md w-full text-left space-y-3 font-mono text-xs shadow-sm">
                <p className="flex justify-between">
                  <span className="text-muted-foreground">Final Score:</span>
                  <strong className="text-foreground font-bold text-base">{finalResult.score} pts</strong>
                </p>
                <p className="flex justify-between">
                  <span className="text-muted-foreground">Accuracy:</span>
                  <strong className="text-emerald-600 font-bold">{finalResult.accuracy}%</strong>
                </p>
                <p className="flex justify-between">
                  <span className="text-muted-foreground">Correct Answers:</span>
                  <strong className="text-foreground">{finalResult.correct}</strong>
                </p>
                <p className="flex justify-between">
                  <span className="text-muted-foreground">Incorrect Answers:</span>
                  <strong className="text-foreground">{finalResult.incorrect}</strong>
                </p>
              </div>
            )}

            <div className="flex items-center gap-4">
              <a
                href="/leaderboard"
                className="flex h-12 items-center gap-2 rounded-xl bg-primary px-6 font-bold text-primary-foreground hover:opacity-90 transition"
              >
                View Leaderboard <ArrowRight className="size-4" />
              </a>
            </div>
          </section>
        )}
      </main>
    </div>
  )
}
