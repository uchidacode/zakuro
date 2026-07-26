// availability-core の変換ロジックのテスト
// 実行: node --test tests/*.test.mjs (ディレクトリ指定は Node 24 では不可)
import test from 'node:test'
import assert from 'node:assert/strict'

import {
  buildPayload,
  codeForSummary,
  countRecognized,
  eventsToCodes,
  jstToday,
  monthWindow,
  secondsUntilJstMidnight,
} from '../site/api/_lib/availability-core.mjs'

const allDay = (summary, startDate, endDate) => ({
  summary,
  start: { date: startDate },
  ...(endDate ? { end: { date: endDate } } : {}),
})

test('jstToday: UTC深夜はJSTの翌日になる', () => {
  assert.deepEqual(jstToday(new Date('2026-07-24T20:00:00Z')), { year: 2026, month: 7, day: 25 })
})

test('jstToday: JSTの日付境界(15:00Z)で日が変わる', () => {
  assert.deepEqual(jstToday(new Date('2026-07-24T14:59:59Z')), { year: 2026, month: 7, day: 24 })
  assert.deepEqual(jstToday(new Date('2026-07-24T15:00:00Z')), { year: 2026, month: 7, day: 25 })
})

test('jstToday: 年跨ぎ', () => {
  assert.deepEqual(jstToday(new Date('2026-12-31T15:00:00Z')), { year: 2027, month: 1, day: 1 })
})

test('monthWindow: 当月+翌月と取得期間(+09:00固定)を返す', () => {
  const window = monthWindow({ year: 2026, month: 7, day: 24 })
  assert.deepEqual(window.months, [
    { year: 2026, month: 7 },
    { year: 2026, month: 8 },
  ])
  assert.equal(window.timeMin, '2026-07-01T00:00:00+09:00')
  assert.equal(window.timeMax, '2026-09-01T00:00:00+09:00')
})

test('monthWindow: 12月は年を跨いで翌1月を含む', () => {
  const window = monthWindow({ year: 2026, month: 12, day: 1 })
  assert.deepEqual(window.months, [
    { year: 2026, month: 12 },
    { year: 2027, month: 1 },
  ])
  assert.equal(window.timeMax, '2027-02-01T00:00:00+09:00')
})

test('codeForSummary: 記号と接頭辞で判定する', () => {
  assert.equal(codeForSummary('×'), 'x')
  assert.equal(codeForSummary('✕予約不可'), 'x')
  assert.equal(codeForSummary(' △ 残りわずか'), 'few')
  assert.equal(codeForSummary('▲'), 'few')
  assert.equal(codeForSummary('休'), 'rest')
  assert.equal(codeForSummary('休診日'), 'rest')
  assert.equal(codeForSummary('rest'), 'rest')
  assert.equal(codeForSummary('○'), 'o')
  assert.equal(codeForSummary('〇 空きあり'), 'o')
})

test('codeForSummary: 表記ゆれ(異体字・ダッシュ類・語頭)も判定する', () => {
  assert.equal(codeForSummary('✖'), 'x')
  assert.equal(codeForSummary('╳'), 'x')
  assert.equal(codeForSummary('ー'), 'rest')
  assert.equal(codeForSummary('―'), 'rest')
  assert.equal(codeForSummary('-'), 'rest')
  assert.equal(codeForSummary('–'), 'rest')
  assert.equal(codeForSummary('定休日'), 'rest')
  assert.equal(codeForSummary('お休み'), 'rest')
})

test('countRecognized: 日付があり記号を認識できる予定だけを数える', () => {
  assert.equal(countRecognized([]), 0)
  assert.equal(countRecognized(null), 0)
  assert.equal(countRecognized([allDay('スタッフ会議', '2026-07-10')]), 0)
  assert.equal(countRecognized([{ summary: '×' }]), 0)
  assert.equal(countRecognized([allDay('×', '2026-07-10'), allDay('休', '2026-07-12')]), 2)
})

test('secondsUntilJstMidnight: JST深夜0時までの残り秒数', () => {
  assert.equal(secondsUntilJstMidnight(new Date('2026-07-24T14:59:00Z')), 60)
  assert.equal(secondsUntilJstMidnight(new Date('2026-07-24T15:00:00Z')), 86400)
  assert.equal(secondsUntilJstMidnight(new Date('2026-07-24T14:59:59.500Z')), 1)
})

test('codeForSummary: 対象外タイトルは null', () => {
  assert.equal(codeForSummary('スタッフ会議'), null)
  assert.equal(codeForSummary(''), null)
  assert.equal(codeForSummary('   '), null)
  assert.equal(codeForSummary(undefined), null)
  assert.equal(codeForSummary(null), null)
})

test('eventsToCodes: 予定なしは全日「o」', () => {
  const codes = eventsToCodes([], 2026, 7)
  assert.equal(codes.length, 31)
  assert.ok(codes.every((code) => code === 'o'))
})

test('eventsToCodes: 月の長さ(30日・平年2月・閏年2月)', () => {
  assert.equal(eventsToCodes([], 2026, 6).length, 30)
  assert.equal(eventsToCodes([], 2026, 2).length, 28)
  assert.equal(eventsToCodes([], 2028, 2).length, 29)
})

test('eventsToCodes: 終日予定1件がその日だけに反映される', () => {
  const codes = eventsToCodes([allDay('×', '2026-07-05', '2026-07-06')], 2026, 7)
  assert.equal(codes[4], 'x')
  assert.equal(codes.filter((code) => code === 'x').length, 1)
})

test('eventsToCodes: end.date 省略時は開始日1日分とみなす', () => {
  const codes = eventsToCodes([allDay('休', '2026-07-05')], 2026, 7)
  assert.equal(codes[4], 'rest')
  assert.equal(codes[5], 'o')
})

test('eventsToCodes: 複数日の終日予定は末日排他で展開される', () => {
  const julyCodes = eventsToCodes([allDay('休', '2026-07-30', '2026-08-02')], 2026, 7)
  assert.equal(julyCodes[29], 'rest')
  assert.equal(julyCodes[30], 'rest')

  const augustCodes = eventsToCodes([allDay('休', '2026-07-30', '2026-08-02')], 2026, 8)
  assert.equal(augustCodes[0], 'rest')
  assert.equal(augustCodes[1], 'o')
})

test('eventsToCodes: 繰り返し展開済みの休診(毎週日曜)が各日に落ちる', () => {
  const sundays = ['2026-07-05', '2026-07-12', '2026-07-19', '2026-07-26']
  const events = sundays.map((date) => allDay('休', date))
  const codes = eventsToCodes(events, 2026, 7)
  assert.deepEqual(
    codes.flatMap((code, index) => (code === 'rest' ? [index + 1] : [])),
    [5, 12, 19, 26],
  )
})

test('eventsToCodes: 時刻付き予定はJSTの日付で判定する(UTC跨ぎ)', () => {
  const events = [{
    summary: '×',
    start: { dateTime: '2026-07-04T16:00:00Z' },
    end: { dateTime: '2026-07-04T17:00:00Z' },
  }]
  const codes = eventsToCodes(events, 2026, 7)
  assert.equal(codes[3], 'o')
  assert.equal(codes[4], 'x')
})

test('eventsToCodes: JST深夜0時ちょうどに終わる予定は前日のみ', () => {
  const events = [{
    summary: '×',
    start: { dateTime: '2026-07-08T22:00:00+09:00' },
    end: { dateTime: '2026-07-09T00:00:00+09:00' },
  }]
  const codes = eventsToCodes(events, 2026, 7)
  assert.equal(codes[7], 'x')
  assert.equal(codes[8], 'o')
})

test('eventsToCodes: 同日に複数の予定は制限が強い方が勝つ(rest > x > few > o)', () => {
  const day = (summary) => allDay(summary, '2026-07-10', '2026-07-11')
  assert.equal(eventsToCodes([day('○'), day('×')], 2026, 7)[9], 'x')
  assert.equal(eventsToCodes([day('×'), day('休')], 2026, 7)[9], 'rest')
  assert.equal(eventsToCodes([day('△'), day('○')], 2026, 7)[9], 'few')
})

test('eventsToCodes: 対象外タイトル・月外・不正な予定は無視される', () => {
  const events = [
    allDay('スタッフ会議', '2026-07-10', '2026-07-11'),
    allDay('×', '2026-06-30', '2026-07-01'),
    { summary: '×' },
    { summary: '×', start: { dateTime: 'not-a-date' } },
  ]
  const codes = eventsToCodes(events, 2026, 7)
  assert.ok(codes.every((code) => code === 'o'))
})

test('eventsToCodes: 引数の events を変更しない', () => {
  const events = [allDay('×', '2026-07-05', '2026-07-06')]
  const snapshot = JSON.stringify(events)
  eventsToCodes(events, 2026, 7)
  assert.equal(JSON.stringify(events), snapshot)
})

test('buildPayload: today と当月+翌月の codes を返す', () => {
  const now = new Date('2026-07-23T18:00:00Z')
  const payload = buildPayload([allDay('×', '2026-08-15', '2026-08-16')], now)
  assert.equal(payload.today, '2026-07-24')
  assert.equal(payload.months.length, 2)
  assert.deepEqual(
    payload.months.map(({ year, month }) => ({ year, month })),
    [{ year: 2026, month: 7 }, { year: 2026, month: 8 }],
  )
  assert.equal(payload.months[0].codes.length, 31)
  assert.ok(payload.months[0].codes.every((code) => code === 'o'))
  assert.equal(payload.months[1].codes[14], 'x')
})
