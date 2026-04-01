/**
 * Database setup check endpoint.
 * Verifies that required tables exist in Supabase.
 * Auth via Authorization header (not query string — query strings are logged by CDNs).
 * POST /api/setup  (Authorization: Bearer <SERVICE_ROLE_KEY>)
 */
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  /* Read key from Authorization header — never from query string */
  const authHeader = request.headers.get('authorization') || ''
  const key = authHeader.replace(/^Bearer\s+/i, '').trim()

  if (!key || key !== process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data, error } = await supabaseAdmin.from('pages').select('id').limit(1)

  if (error && (error.code === 'PGRST204' || error.code === 'PGRST205')) {
    return NextResponse.json({
      status: 'needs_migration',
      message: 'Tables do not exist yet. Run the migration SQL in the Supabase SQL Editor.',
    })
  }

  return NextResponse.json({
    status: 'ok',
    message: 'Database tables exist',
  })
}
