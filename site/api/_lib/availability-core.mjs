// 空き状況カレンダーの中核ロジック(純粋関数のみ)
// Google Calendar のイベントを日別コード(o=空きあり / few=残りわずか / x=予約不可 / rest=休診)へ変換する。
// 日付計算はすべて Asia/Tokyo 基準(UTC+9・DSTなしのため固定オフセットで安全)。
// このディレクトリ(_lib)はアンダースコア始まりのため Vercel の API エンドポイントにはならない。

const JST_OFFSET_MS = 9 * 60 * 60 * 1000
const DAY_MS = 24 * 60 * 60 * 1000

// 同日に複数の予定がある場合は添字が大きい方(制限が強い方)を採用する
const RANK_CODES = ['o', 'few', 'x', 'rest']
const CODE_RANKS = Object.fromEntries(RANK_CODES.map((code, rank) => [code, rank]))
const DEFAULT_RANK = CODE_RANKS.o

const pad2 = (value) => String(value).padStart(2, '0')

const jstParts = (instant) => {
  const shifted = new Date(instant.getTime() + JST_OFFSET_MS)
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
  }
}

export const jstToday = (now) => jstParts(now)

const nextMonth = ({ year, month }) =>
  month === 12 ? { year: year + 1, month: 1 } : { year, month: month + 1 }

const rfc3339MonthStart = ({ year, month }) => `${year}-${pad2(month)}-01T00:00:00+09:00`

// 表示対象(当月+翌月)と Google Calendar API の取得期間を返す
export const monthWindow = (today) => {
  const current = { year: today.year, month: today.month }
  const following = nextMonth(current)
  return {
    months: [current, following],
    timeMin: rfc3339MonthStart(current),
    timeMax: rfc3339MonthStart(nextMonth(following)),
  }
}

const daysInMonth = (year, month) => new Date(Date.UTC(year, month, 0)).getUTCDate()

// 予定タイトルの先頭記号でコードを判定する。対象外は null(無視)
// 院側の表記ゆれ(異体字・各種ダッシュ・「定休」「お休み」)をなるべく吸収する
export const codeForSummary = (summary) => {
  if (typeof summary !== 'string') return null
  const trimmed = summary.trim()
  if (trimmed === '') return null
  if (/^(rest|定休|お休み)/i.test(trimmed)) return 'rest'
  const first = trimmed[0]
  if ('×✕✖╳xX'.includes(first)) return 'x'
  if ('△▲'.includes(first)) return 'few'
  if ('休−—―ー‐-–'.includes(first)) return 'rest'
  if ('○〇◯oO'.includes(first)) return 'o'
  return null
}

const dateOnlyMs = (dateText) => {
  const [year, month, day] = String(dateText).split('-').map(Number)
  return Date.UTC(year, month - 1, day)
}

const jstDateMs = (instant) => {
  const { year, month, day } = jstParts(instant)
  return Date.UTC(year, month - 1, day)
}

// 予定が占める日付範囲を [startMs, endMs)(UTC正午基準ではなく日付のみのUTC ms)で返す
const eventDayRange = (event) => {
  const start = event?.start
  const end = event?.end
  if (start?.date) {
    const startMs = dateOnlyMs(start.date)
    if (Number.isNaN(startMs)) return null
    const endMs = end?.date ? dateOnlyMs(end.date) : startMs + DAY_MS
    return Number.isNaN(endMs) ? null : { startMs, endMs }
  }
  if (start?.dateTime) {
    const startInstant = new Date(start.dateTime)
    if (Number.isNaN(startInstant.getTime())) return null
    // end は排他扱い: JST 0:00 ちょうどに終わる予定を前日までに収めるため 1ms 戻す
    const endInstant = end?.dateTime ? new Date(new Date(end.dateTime).getTime() - 1) : startInstant
    if (Number.isNaN(endInstant.getTime())) return null
    return {
      startMs: jstDateMs(startInstant),
      endMs: jstDateMs(endInstant) + DAY_MS,
    }
  }
  return null
}

// イベント配列を指定月の日別コード配列(1日始まり)へ変換する。引数は変更しない
export const eventsToCodes = (events, year, month) => {
  const total = daysInMonth(year, month)
  const monthStartMs = Date.UTC(year, month - 1, 1)
  const monthEndMs = monthStartMs + total * DAY_MS

  const ranks = (events ?? []).reduce((accumulator, event) => {
    const code = codeForSummary(event?.summary)
    if (code === null) return accumulator
    const range = eventDayRange(event)
    if (range === null) return accumulator

    const from = Math.max(range.startMs, monthStartMs)
    const to = Math.min(range.endMs, monthEndMs)
    const updates = new Map(accumulator)
    for (let ms = from; ms < to; ms += DAY_MS) {
      const day = Math.floor((ms - monthStartMs) / DAY_MS) + 1
      const rank = Math.max(CODE_RANKS[code], updates.get(day) ?? DEFAULT_RANK)
      updates.set(day, rank)
    }
    return updates
  }, new Map())

  return Array.from({ length: total }, (_, index) => RANK_CODES[ranks.get(index + 1) ?? DEFAULT_RANK])
}

// 日付があり記号を認識できる予定の件数。0件はカレンダーID間違い・公開解除・
// 運用停止のシグナルとみなし、呼び出し側でフェイルクローズ(エラー扱い)する
export const countRecognized = (events) =>
  (events ?? []).reduce(
    (count, event) =>
      codeForSummary(event?.summary) !== null && eventDayRange(event) !== null
        ? count + 1
        : count,
    0,
  )

// JST深夜0時までの残り秒数。日跨ぎで前日のキャッシュが残らないよう s-maxage の上限に使う
export const secondsUntilJstMidnight = (now) => {
  const sinceMidnight = (now.getTime() + JST_OFFSET_MS) % DAY_MS
  return Math.ceil((DAY_MS - sinceMidnight) / 1000)
}

// API レスポンス本体を組み立てる
export const buildPayload = (events, now) => {
  const today = jstToday(now)
  const { months } = monthWindow(today)
  return {
    today: `${today.year}-${pad2(today.month)}-${pad2(today.day)}`,
    months: months.map(({ year, month }) => ({
      year,
      month,
      codes: eventsToCodes(events, year, month),
    })),
  }
}
