// 今月の空き状況カレンダー
// 月替わりの更新は CALENDAR の year / month / codes を書き換える。
// codes: 1日から順に o=空きあり / few=残りわずか / x=予約不可 / rest=休診
(() => {
  const CALENDAR = {
    year: 2026,
    month: 7,
    codes: [
      'x', 'x', 'few', 'o', 'rest', 'x', 'x',
      'few', 'o', 'o', 'few', 'rest', 'x', 'few',
      'o', 'o', 'o', 'few', 'rest', 'o', 'o',
      'o', 'few', 'o', 'o', 'rest', 'o', 'o',
      'o', 'o', 'o',
    ],
  }

  const MARKS = {
    o: { glyph: '○', className: 'mark-o' },
    few: { glyph: '△', className: 'mark-few' },
    x: { glyph: '×', className: 'mark-x' },
    rest: { glyph: '—', className: 'mark-rest' },
  }

  const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土']

  const grid = document.querySelector('.calendar-days')
  const cta = document.querySelector('.calendar-cta')
  const ctaLabel = document.querySelector('.calendar-cta-label')
  if (!grid || !cta || !ctaLabel) return

  const firstWeekday = new Date(CALENDAR.year, CALENDAR.month - 1, 1).getDay()
  let selectedDay = null

  const dayLabel = (day) => {
    const weekday = WEEKDAYS[(firstWeekday + day - 1) % 7]
    return `${CALENDAR.month}月${day}日（${weekday}）`
  }

  const updateCta = () => {
    if (selectedDay === null) {
      cta.hidden = true
      return
    }
    ctaLabel.textContent = `${dayLabel(selectedDay)}の空きをLINEで聞く`
    cta.hidden = false
  }

  const toggleDay = (day, cell) => {
    const previous = grid.querySelector('.calendar-day.is-selected')
    if (previous) previous.classList.remove('is-selected')
    selectedDay = selectedDay === day ? null : day
    if (selectedDay !== null) cell.classList.add('is-selected')
    updateCta()
  }

  const buildCell = (day) => {
    const code = CALENDAR.codes[day - 1] || 'rest'
    const mark = MARKS[code]
    const open = code === 'o' || code === 'few'
    const cell = document.createElement(open ? 'button' : 'div')
    if (open) {
      cell.type = 'button'
      cell.classList.add('is-open')
      cell.setAttribute('aria-label', `${dayLabel(day)} ${mark.glyph}`)
      cell.addEventListener('click', () => toggleDay(day, cell))
    }
    cell.classList.add('calendar-day')

    const date = document.createElement('span')
    date.className = 'calendar-date'
    date.textContent = String(day)

    const glyph = document.createElement('span')
    glyph.className = `calendar-mark ${mark.className}`
    glyph.textContent = mark.glyph

    cell.append(date, glyph)
    return cell
  }

  const blanks = Array.from({ length: firstWeekday }, () => {
    const blank = document.createElement('div')
    blank.className = 'calendar-day'
    return blank
  })
  const days = CALENDAR.codes.map((_, index) => buildCell(index + 1))
  grid.replaceChildren(...blanks, ...days)
})()
