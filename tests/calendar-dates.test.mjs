// site/js/calendar-dates.js(ブラウザ用・グローバル公開)のテスト
// IIFE のまま vm で評価して globalThis.CalendarDates を取り出す
// 実行: node --test tests/*.test.mjs
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import vm from 'node:vm'

const source = await readFile(new URL('../site/js/calendar-dates.js', import.meta.url), 'utf8')
const context = vm.createContext({})
vm.runInContext(source, context)
const { WEEKDAYS, firstWeekdayOf, dayLabel, isPastDay, jstTodayText } = context.CalendarDates

test('firstWeekdayOf: 月初の曜日(0=日)', () => {
  assert.equal(firstWeekdayOf({ year: 2026, month: 7 }), 3)
  assert.equal(firstWeekdayOf({ year: 2026, month: 8 }), 6)
  assert.equal(firstWeekdayOf({ year: 2026, month: 11 }), 0)
})

test('dayLabel: 「M月D日（曜）」形式', () => {
  assert.equal(dayLabel({ year: 2026, month: 7 }, 1), '7月1日（水）')
  assert.equal(dayLabel({ year: 2026, month: 7 }, 28), '7月28日（火）')
  assert.equal(dayLabel({ year: 2026, month: 8 }, 20), '8月20日（木）')
})

test('isPastDay: APIのtoday(JST)基準で過去日を判定する', () => {
  const july = { year: 2026, month: 7 }
  assert.equal(isPastDay(july, 24, '2026-07-25'), true)
  assert.equal(isPastDay(july, 25, '2026-07-25'), false)
  assert.equal(isPastDay(july, 26, '2026-07-25'), false)
  assert.equal(isPastDay({ year: 2026, month: 6 }, 30, '2026-07-25'), true)
  assert.equal(isPastDay({ year: 2026, month: 8 }, 1, '2026-07-25'), false)
  assert.equal(isPastDay({ year: 2026, month: 12 }, 31, '2027-01-01'), true)
})

test('isPastDay: today が不正なら過去扱いにしない', () => {
  const july = { year: 2026, month: 7 }
  assert.equal(isPastDay(july, 1, ''), false)
  assert.equal(isPastDay(july, 1, 'garbage'), false)
  assert.equal(isPastDay(july, 1, undefined), false)
})

test('jstTodayText: YYYY-MM-DD 形式のJST日付を返す', () => {
  assert.match(jstTodayText(), /^\d{4}-\d{2}-\d{2}$/)
})

test('WEEKDAYS: 日曜始まりの7曜', () => {
  // vm の別 realm 由来の配列はプロトタイプが異なるためスプレッドしてから比較する
  assert.deepEqual([...WEEKDAYS], ['日', '月', '火', '水', '木', '金', '土'])
})
