import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      name: string
      college: string
      phone?: string | null
      email?: string | null
      house_id?: string | null
    }

    const { name, college, phone, email, house_id } = body

    if (!name?.trim() || name.trim().length < 2) {
      return NextResponse.json({ error: 'Name must be at least 2 characters.' }, { status: 400 })
    }
    if (!college?.trim()) {
      return NextResponse.json({ error: 'College is required.' }, { status: 400 })
    }

    const supabase = await createClient()

    // 1. Resolve real House UUID from database
    let targetHouseId: string | null = null

    if (house_id && typeof house_id === 'string' && house_id.trim()) {
      const cleanHouse = house_id.trim()
      // Try matching by UUID or house name (AGNI, BHUMI, VAYU, JAL, AKASH)
      const { data: matchedHouse } = await supabase
        .from('houses')
        .select('id')
        .or(`id.eq.${cleanHouse},name.eq.${cleanHouse.toUpperCase()}`)
        .maybeSingle()

      if (matchedHouse) {
        targetHouseId = matchedHouse.id
      }
    }

    // Fallback: If no house ID matched, pick the first house (AGNI) or auto-assign
    if (!targetHouseId) {
      const { data: defaultHouse } = await supabase
        .from('houses')
        .select('id')
        .order('name')
        .limit(1)
        .maybeSingle()

      if (defaultHouse) {
        targetHouseId = defaultHouse.id
      }
    }

    // 2. Insert Player into DB with guaranteed house_id and status
    const { data, error: insertError } = await supabase
      .from('players')
      .insert({
        name: name.trim(),
        college: college.trim(),
        phone: phone?.trim() || null,
        email: email?.trim() || null,
        house_id: targetHouseId,
        status: 'active',
      })
      .select('id, player_code, player_token, name, college, house_id, status')
      .single()

    if (insertError || !data) {
      console.error('Player insert error:', insertError)
      return NextResponse.json({ error: insertError?.message || 'Registration failed.' }, { status: 500 })
    }

    // 3. Build response with HttpOnly, Secure, SameSite=Lax cookies
    const response = NextResponse.json({
      id: data.id,
      player_code: data.player_code,
      name: data.name,
      college: data.college,
      house_id: data.house_id,
      status: data.status,
    })

    const isProduction = process.env.NODE_ENV === 'production'
    const cookieOpts = {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax' as const,
      maxAge: 60 * 60 * 24 * 365,
      path: '/',
    }

    response.cookies.set('think_twice_player', data.id, cookieOpts)
    response.cookies.set('think_twice_player_token', data.player_token || '', cookieOpts)

    return response
  } catch (err: unknown) {
    console.error('Registration API error:', err)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}
