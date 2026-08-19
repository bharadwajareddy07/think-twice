import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()

    // 1. Check for a LIVE (active) competition first
    const { data: liveComp } = await supabase
      .from('competitions')
      .select('id, name, code, description, status, start_time, end_time, duration, question_count')
      .in('status', ['LIVE', 'active'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (liveComp) {
      return NextResponse.json({
        hasCompetition: true,
        status: 'LIVE',
        canEnter: true,
        competition: liveComp,
        message: 'Competition is LIVE! You may enter the arena.',
      })
    }

    // 2. Check for UPCOMING, DRAFT, or PAUSED competition
    const { data: pendingComp } = await supabase
      .from('competitions')
      .select('id, name, code, description, status, start_time, end_time, duration, question_count')
      .in('status', ['DRAFT', 'UPCOMING', 'PAUSED', 'draft', 'upcoming', 'paused'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (pendingComp) {
      const normalizedStatus = (pendingComp.status || 'DRAFT').toUpperCase()
      let msg = 'Competition has not started yet. Please wait for the administrator.'
      if (normalizedStatus === 'PAUSED') {
        msg = 'Competition is currently paused by the administrator. Please wait.'
      }

      return NextResponse.json({
        hasCompetition: true,
        status: normalizedStatus,
        canEnter: false,
        competition: pendingComp,
        message: msg,
      })
    }

    // 3. Check for COMPLETED or CANCELLED competition
    const { data: endedComp } = await supabase
      .from('competitions')
      .select('id, name, code, description, status, start_time, end_time, duration, question_count')
      .in('status', ['COMPLETED', 'CANCELLED', 'completed', 'cancelled'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (endedComp) {
      return NextResponse.json({
        hasCompetition: true,
        status: (endedComp.status || 'COMPLETED').toUpperCase(),
        canEnter: false,
        competition: endedComp,
        message: 'Competition has ended. Re-entry is not permitted.',
      })
    }

    // 4. No competition exists in database at all
    return NextResponse.json({
      hasCompetition: false,
      status: 'NO_COMPETITION',
      canEnter: false,
      competition: null,
      message: 'No competition has been created yet. Please wait for the administrator.',
    })
  } catch (err: unknown) {
    console.error('Error in competition status API:', err)
    return NextResponse.json(
      {
        hasCompetition: false,
        status: 'ERROR',
        canEnter: false,
        competition: null,
        message: 'Could not determine competition status. Please try again.',
      },
      { status: 500 }
    )
  }
}
