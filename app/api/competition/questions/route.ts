import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const competitionId = searchParams.get('competition_id')

    if (!competitionId) {
      return NextResponse.json(
        { error: 'Missing competition_id parameter.' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // 1. Verify Competition Exists & Status is LIVE/active on DB
    const { data: competition, error: compErr } = await supabase
      .from('competitions')
      .select('id, name, status')
      .eq('id', competitionId)
      .maybeSingle()

    if (compErr || !competition) {
      return NextResponse.json(
        { error: 'Competition not found.' },
        { status: 404 }
      )
    }

    const statusUpper = (competition.status || '').toUpperCase()
    if (statusUpper !== 'LIVE' && statusUpper !== 'ACTIVE') {
      let statusMsg = 'Competition is not active.'
      if (['DRAFT', 'UPCOMING', 'PAUSED'].includes(statusUpper)) {
        statusMsg = 'Competition has not started yet. Please wait for the administrator.'
      } else if (['COMPLETED', 'CANCELLED'].includes(statusUpper)) {
        statusMsg = 'Competition has ended.'
      }
      return NextResponse.json(
        { error: `Access Denied: ${statusMsg}`, status: statusUpper },
        { status: 403 }
      )
    }

    // 2. Fetch Questions (Exclude correct_option & explanation from client payload for security)
    const { data: dbQuestions, error: qErr } = await supabase
      .from('questions')
      .select('id, question_text, prompt, think_twice_prompt, options, time_limit, position')
      .order('position', { ascending: true })

    if (qErr) {
      return NextResponse.json(
        { error: 'Failed to retrieve competition questions.' },
        { status: 500 }
      )
    }

    if (!dbQuestions || dbQuestions.length === 0) {
      return NextResponse.json(
        { error: 'No questions have been published for this competition yet.' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      competition_id: competition.id,
      questions: dbQuestions,
    })
  } catch (err: unknown) {
    console.error('Error in competition questions API:', err)
    return NextResponse.json(
      { error: 'Internal server error.' },
      { status: 500 }
    )
  }
}
