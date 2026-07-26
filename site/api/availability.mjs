// GET /api/availability — Google Calendar「空き状況」を日別コードに正規化して返す Vercel Function
// 必要な環境変数: GOOGLE_CALENDAR_ID / GOOGLE_CALENDAR_API_KEY(Vercel のプロジェクト設定で定義)
import {
  buildPayload,
  countRecognized,
  jstToday,
  monthWindow,
  secondsUntilJstMidnight,
} from './_lib/availability-core.mjs'

const EVENTS_ENDPOINT = 'https://www.googleapis.com/calendar/v3/calendars'
const UPSTREAM_TIMEOUT_MS = 5000
// maxResults=2500 × 2ヶ月窓では通常1ページで足りる。超過は上流の異常とみなす
const MAX_PAGES = 5
// 失敗レスポンスも短時間 CDN キャッシュして、上流障害時のリクエスト増幅を防ぐ
const ERROR_CACHE_CONTROL = 'public, max-age=0, s-maxage=60'

const fetchAllEvents = async ({ calendarId, apiKey, timeMin, timeMax }) => {
  const baseParams = {
    key: apiKey,
    singleEvents: 'true',
    timeMin,
    timeMax,
    timeZone: 'Asia/Tokyo',
    maxResults: '2500',
    fields: 'items(summary,start,end),nextPageToken',
  }

  let items = []
  let pageToken
  let pages = 0
  do {
    const params = new URLSearchParams(
      pageToken ? { ...baseParams, pageToken } : baseParams,
    )
    const response = await fetch(
      `${EVENTS_ENDPOINT}/${encodeURIComponent(calendarId)}/events?${params}`,
      { signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS) },
    )
    if (!response.ok) {
      throw new Error(`Google Calendar API responded with ${response.status}`)
    }
    const data = await response.json()
    items = items.concat(data.items ?? [])
    pageToken = data.nextPageToken
    pages += 1
  } while (pageToken && pages < MAX_PAGES)

  if (pageToken) {
    // 途中で打ち切ると取りこぼした日が「○」になってしまうため、部分データでは返さない
    throw new Error(`Google Calendar API pagination exceeded ${MAX_PAGES} pages`)
  }
  return items
}

export default async function handler(req, res) {
  if (req.method && req.method !== 'GET' && req.method !== 'HEAD') {
    res.setHeader('Allow', 'GET, HEAD')
    res.status(405).json({ error: 'method_not_allowed' })
    return
  }

  const calendarId = process.env.GOOGLE_CALENDAR_ID
  const apiKey = process.env.GOOGLE_CALENDAR_API_KEY
  if (!calendarId || !apiKey) {
    console.error('availability: GOOGLE_CALENDAR_ID / GOOGLE_CALENDAR_API_KEY が未設定です')
    res.setHeader('Cache-Control', ERROR_CACHE_CONTROL)
    res.status(500).json({ error: 'server_not_configured' })
    return
  }

  try {
    const now = new Date()
    const { timeMin, timeMax } = monthWindow(jstToday(now))
    const events = await fetchAllEvents({ calendarId, apiKey, timeMin, timeMax })

    if (countRecognized(events) === 0) {
      // 予定ゼロは「全日空き」ではなく設定ミスの可能性が高い(日曜休診が常設のはず)。
      // 全日「○」の誤表示よりも LINE 誘導フォールバックに落とす方が安全
      console.error('availability: 認識できる予定が0件です(カレンダーID・公開設定・タイトル記号を確認)')
      res.setHeader('Cache-Control', ERROR_CACHE_CONTROL)
      res.status(502).json({ error: 'no_recognized_events' })
      return
    }

    // 「10分」と「JST深夜0時まで」の短い方。日跨ぎ直後に前日の today/months を配らない
    const sMaxAge = Math.min(600, secondsUntilJstMidnight(now))
    res.setHeader('Cache-Control', `public, max-age=0, s-maxage=${sMaxAge}, stale-while-revalidate=60`)
    res.status(200).json(buildPayload(events, now))
  } catch (error) {
    console.error('availability: 空き状況の取得に失敗しました', error)
    res.setHeader('Cache-Control', ERROR_CACHE_CONTROL)
    res.status(502).json({ error: 'calendar_unavailable' })
  }
}
