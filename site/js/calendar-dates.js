// 空き状況カレンダーの日付ユーティリティ
// calendar.js より先に読み込み、globalThis.CalendarDates として公開する
// (ブラウザ非依存のロジックのみ。tests/calendar-dates.test.mjs から vm 経由でテストされる)
;(() => {
  const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土']

  // 月初の曜日(0=日)。暦日の曜日はタイムゾーンに依存しない
  const firstWeekdayOf = ({ year, month }) => new Date(year, month - 1, 1).getDay()

  const dayLabel = (month, day) => {
    const weekday = WEEKDAYS[(firstWeekdayOf(month) + day - 1) % 7]
    return `${month.month}月${day}日（${weekday}）`
  }

  // todayText は API が返す JST 基準の YYYY-MM-DD。閲覧者のタイムゾーンに依存しない
  const isPastDay = (month, day, todayText) => {
    const [year, monthNumber, dayNumber] = String(todayText ?? '').split('-').map(Number)
    if (!year || !monthNumber || !dayNumber) return false
    const target = month.year * 10000 + month.month * 100 + day
    return target < year * 10000 + monthNumber * 100 + dayNumber
  }

  // 長時間開いたタブで日付が変わったことを検知するための現在日(JST)
  const jstTodayText = () =>
    new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Tokyo' })

  globalThis.CalendarDates = { WEEKDAYS, firstWeekdayOf, dayLabel, isPastDay, jstTodayText }
})()
