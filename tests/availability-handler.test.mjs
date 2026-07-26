// /api/availability ハンドラのテスト(Google API は fetch スタブで代替)
// 実行: node --test tests/*.test.mjs
import test from 'node:test'
import assert from 'node:assert/strict'

import handler from '../site/api/availability.mjs'
import { jstToday, monthWindow } from '../site/api/_lib/availability-core.mjs'

const ENV_KEYS = ['GOOGLE_CALENDAR_ID', 'GOOGLE_CALENDAR_API_KEY']

const createRes = () => {
  const record = { statusCode: null, body: null, headers: {} }
  return {
    record,
    setHeader(name, value) {
      record.headers[name.toLowerCase()] = value
    },
    status(code) {
      record.statusCode = code
      return this
    },
    json(body) {
      record.body = body
      return this
    },
  }
}

const jsonResponse = (body, status = 200) => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => body,
})

// 環境変数と fetch を差し替えてハンドラを実行し、後始末まで行う
const runHandler = async ({ env = {}, fetchImpl, method = 'GET' }) => {
  const original = Object.fromEntries(ENV_KEYS.map((key) => [key, process.env[key]]))
  const originalFetch = globalThis.fetch
  const calls = []
  try {
    for (const key of ENV_KEYS) delete process.env[key]
    Object.assign(process.env, env)
    globalThis.fetch = async (url) => {
      calls.push(String(url))
      return fetchImpl(String(url), calls.length)
    }
    const res = createRes()
    await handler({ method }, res)
    return { res: res.record, calls }
  } finally {
    globalThis.fetch = originalFetch
    for (const key of ENV_KEYS) {
      if (original[key] === undefined) delete process.env[key]
      else process.env[key] = original[key]
    }
  }
}

const VALID_ENV = {
  GOOGLE_CALENDAR_ID: 'zakuro-test@group.calendar.google.com',
  GOOGLE_CALENDAR_API_KEY: 'test-api-key',
}

test('GET 以外は 405 を返す', async (t) => {
  t.mock.method(console, 'error', () => {})
  const { res, calls } = await runHandler({
    env: VALID_ENV,
    method: 'POST',
    fetchImpl: () => jsonResponse({ items: [] }),
  })
  assert.equal(res.statusCode, 405)
  assert.equal(res.headers.allow, 'GET, HEAD')
  assert.deepEqual(res.body, { error: 'method_not_allowed' })
  assert.equal(calls.length, 0)
})

test('認識できる予定が1件もなければ 502(全日○の誤表示を防ぐ)', async (t) => {
  t.mock.method(console, 'error', () => {})
  const { res } = await runHandler({
    env: VALID_ENV,
    fetchImpl: () =>
      jsonResponse({ items: [{ summary: 'スタッフ会議', start: { date: '2026-07-10' } }] }),
  })
  assert.equal(res.statusCode, 502)
  assert.deepEqual(res.body, { error: 'no_recognized_events' })
})

test('ページネーションが上限を超えたら 502(無限ループ防止)', async (t) => {
  t.mock.method(console, 'error', () => {})
  const { res, calls } = await runHandler({
    env: VALID_ENV,
    fetchImpl: () =>
      jsonResponse({ items: [{ summary: '×', start: { date: '2026-07-10' } }], nextPageToken: 'again' }),
  })
  assert.equal(res.statusCode, 502)
  assert.equal(calls.length, 5)
})

test('環境変数が未設定なら 500(Google へは問い合わせない)', async (t) => {
  t.mock.method(console, 'error', () => {})
  const { res, calls } = await runHandler({
    env: {},
    fetchImpl: () => jsonResponse({ items: [] }),
  })
  assert.equal(res.statusCode, 500)
  assert.deepEqual(res.body, { error: 'server_not_configured' })
  assert.equal(calls.length, 0)
})

test('正常系: 変換済みペイロードとキャッシュヘッダを返す', async () => {
  const today = jstToday(new Date())
  const firstOfMonth = `${today.year}-${String(today.month).padStart(2, '0')}-01`
  const { res, calls } = await runHandler({
    env: VALID_ENV,
    fetchImpl: () =>
      jsonResponse({ items: [{ summary: '×', start: { date: firstOfMonth } }] }),
  })

  assert.equal(res.statusCode, 200)
  assert.equal(res.body.today, `${firstOfMonth.slice(0, 8)}${String(today.day).padStart(2, '0')}`)
  assert.equal(res.body.months.length, 2)
  assert.deepEqual(
    res.body.months.map(({ year, month }) => ({ year, month })),
    monthWindow(today).months,
  )
  assert.equal(res.body.months[0].codes[0], 'x')
  assert.ok(res.body.months[1].codes.every((code) => code === 'o'))
  // s-maxage は「10分」と「JST深夜0時まで」の小さい方(日跨ぎで前日のキャッシュが残らないように)
  const cacheControl = res.headers['cache-control']
  const sMaxAge = Number(/s-maxage=(\d+)/.exec(cacheControl)?.[1])
  assert.match(cacheControl, /^public, max-age=0, s-maxage=\d+, stale-while-revalidate=60$/)
  assert.ok(sMaxAge >= 1 && sMaxAge <= 600)

  assert.equal(calls.length, 1)
  const url = new URL(calls[0])
  assert.ok(url.pathname.includes(encodeURIComponent(VALID_ENV.GOOGLE_CALENDAR_ID)))
  assert.equal(url.searchParams.get('key'), VALID_ENV.GOOGLE_CALENDAR_API_KEY)
  assert.equal(url.searchParams.get('singleEvents'), 'true')
  assert.equal(url.searchParams.get('timeMin'), monthWindow(today).timeMin)
  assert.equal(url.searchParams.get('timeMax'), monthWindow(today).timeMax)
})

test('正常系: nextPageToken があれば追加取得して結合する', async () => {
  const today = jstToday(new Date())
  const pad = (value) => String(value).padStart(2, '0')
  const day1 = `${today.year}-${pad(today.month)}-01`
  const day2 = `${today.year}-${pad(today.month)}-02`
  const { res, calls } = await runHandler({
    env: VALID_ENV,
    fetchImpl: (url, callCount) =>
      callCount === 1
        ? jsonResponse({ items: [{ summary: '×', start: { date: day1 } }], nextPageToken: 'page-2' })
        : jsonResponse({ items: [{ summary: '休', start: { date: day2 } }] }),
  })

  assert.equal(res.statusCode, 200)
  assert.equal(calls.length, 2)
  assert.ok(new URL(calls[1]).searchParams.get('pageToken') === 'page-2')
  assert.equal(res.body.months[0].codes[0], 'x')
  assert.equal(res.body.months[0].codes[1], 'rest')
})

test('Google API がエラーを返したら 502', async (t) => {
  t.mock.method(console, 'error', () => {})
  const { res } = await runHandler({
    env: VALID_ENV,
    fetchImpl: () => jsonResponse({ error: 'forbidden' }, 403),
  })
  assert.equal(res.statusCode, 502)
  assert.deepEqual(res.body, { error: 'calendar_unavailable' })
})

test('fetch 自体が失敗しても 502', async (t) => {
  t.mock.method(console, 'error', () => {})
  const { res } = await runHandler({
    env: VALID_ENV,
    fetchImpl: () => {
      throw new Error('network down')
    },
  })
  assert.equal(res.statusCode, 502)
  assert.deepEqual(res.body, { error: 'calendar_unavailable' })
})
