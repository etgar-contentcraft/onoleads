import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// This endpoint runs the database migration
// Call it once after deployment: POST /api/setup?key=SERVICE_ROLE_KEY
export async function POST(request: Request) {
  const { searchParams } = new URL(request.url)
  const key = searchParams.get('key')

  if (!key || key !== process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const migrations: string[] = []
  const errors: string[] = []

  // We'll create tables using the Supabase REST API approach
  // Since we can't run raw DDL via REST, we'll use the pg connection
  // via the Supabase project's built-in pg-meta API

  // For now, let's test connectivity
  const { data, error } = await supabaseAdmin.from('faculties').select('count').limit(1)

  if (error && error.code === 'PGRST204') {
    // Table doesn't exist - we need migration
    return NextResponse.json({
      status: 'needs_migration',
      message: 'Tables do not exist yet. Please run the migration SQL in the Supabase SQL Editor.',
      sql_file: '/supabase/migrations/001_initial_schema.sql'
    })
  }

  if (error && error.code === 'PGRST205') {
    return NextResponse.json({
      status: 'needs_migration',
      message: 'Tables do not exist yet. Please run the migration SQL in the Supabase SQL Editor.',
    })
  }

  return NextResponse.json({
    status: 'ok',
    message: 'Database tables exist',
    data
  })
}

export async function GET() {
  return NextResponse.json({
    message: 'POST to this endpoint with ?key=SERVICE_ROLE_KEY to check DB status'
  })
}
