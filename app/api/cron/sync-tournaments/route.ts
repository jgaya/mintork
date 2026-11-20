import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { syncPlayingEventsInternal } from '@/app/actions/tournament-sync'

async function handleSync(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret) {
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null
    const session = await getSession()

    if (token !== cronSecret && !session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }
  } else {
    // Sin CRON_SECRET configurado, permitir llamadas locales (localhost/127.0.0.1) o sesión autenticada
    const host = request.headers.get('host') ?? ''
    const isLocalhost = host.startsWith('localhost') || host.startsWith('127.0.0.1')
    const session = await getSession()
    if (!isLocalhost && !session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }
  }

  try {
    const result = await syncPlayingEventsInternal({ respectAutoFlag: true })
    return NextResponse.json({
      success: true,
      autoCreatedCount: result.autoCreatedCount,
      schemasChecked: result.schemas.length,
      eventsEvaluated: result.events.length,
    })
  } catch (err) {
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : 'Error sincronizando torneos',
      },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  return handleSync(request)
}

export async function POST(request: NextRequest) {
  return handleSync(request)
}
