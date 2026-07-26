// 空き状況カレンダー
// データは /api/availability(Vercel Function 経由で Google Calendar)から取得する。
// 院側の更新は Google カレンダー「空き状況」へ終日予定(×・△・休)を入れるだけでよい。
// 日付ロジックは calendar-dates.js(CalendarDates)に分離されている。
(() => {
  const ENDPOINT = '/api/availability'
  const LINE_URL = 'https://lin.ee/fa6u5WF'
  const FETCH_TIMEOUT_MS = 8000

  const MARKS = {
    o: { glyph: '○', className: 'mark-o' },
    few: { glyph: '△', className: 'mark-few' },
    x: { glyph: '×', className: 'mark-x' },
    rest: { glyph: '—', className: 'mark-rest' },
  }

  const dates = globalThis.CalendarDates
  const grid = document.querySelector('.calendar-days')
  const monthLabel = document.querySelector('.calendar-month')
  const prevBtn = document.querySelector('.calendar-nav-btn[data-nav="prev"]')
  const nextBtn = document.querySelector('.calendar-nav-btn[data-nav="next"]')
  const cta = document.querySelector('.calendar-cta')
  const ctaLabel = document.querySelector('.calendar-cta-label')
  if (!dates || !grid || !monthLabel || !prevBtn || !nextBtn || !cta || !ctaLabel) return

  let state = { months: [], today: '', index: 0, selectedDay: null }

  const currentMonth = () => state.months[state.index]

  const updateCta = () => {
    const month = currentMonth()
    if (state.selectedDay === null || !month) {
      cta.hidden = true
      return
    }
    ctaLabel.textContent = `${dates.dayLabel(month, state.selectedDay)}の空きをLINEで聞く`
    cta.hidden = false
  }

  const toggleDay = (day, cell) => {
    const previous = grid.querySelector('.calendar-day.is-selected')
    if (previous) previous.classList.remove('is-selected')
    state = { ...state, selectedDay: state.selectedDay === day ? null : day }
    if (state.selectedDay !== null) cell.classList.add('is-selected')
    updateCta()
  }

  const buildCell = (month, day) => {
    const rawCode = month.codes[day - 1]
    const code = Object.hasOwn(MARKS, rawCode) ? rawCode : 'rest'
    const mark = MARKS[code]
    const past = dates.isPastDay(month, day, state.today)
    const open = !past && (code === 'o' || code === 'few')

    const cell = document.createElement(open ? 'button' : 'div')
    if (open) {
      cell.type = 'button'
      cell.classList.add('is-open')
      cell.setAttribute('aria-label', `${dates.dayLabel(month, day)} ${mark.glyph}`)
      cell.addEventListener('click', () => toggleDay(day, cell))
    }
    cell.classList.add('calendar-day')
    if (past) cell.classList.add('is-past')

    const date = document.createElement('span')
    date.className = 'calendar-date'
    date.textContent = String(day)

    const glyph = document.createElement('span')
    glyph.className = `calendar-mark ${mark.className}`
    glyph.textContent = mark.glyph

    cell.append(date, glyph)
    return cell
  }

  const setNavState = () => {
    const configure = (button, disabled) => {
      button.disabled = disabled
      button.setAttribute('aria-disabled', String(disabled))
    }
    configure(prevBtn, state.index <= 0)
    configure(nextBtn, state.index >= state.months.length - 1)
  }

  const showLoading = () => {
    const status = document.createElement('div')
    status.className = 'calendar-status'
    status.setAttribute('role', 'status')
    status.textContent = '空き状況を読み込んでいます…'
    grid.replaceChildren(status)
    setNavState()
  }

  const showError = () => {
    const message = document.createElement('p')
    message.textContent = '空き状況を読み込めませんでした。'

    const link = document.createElement('a')
    link.className = 'link-underline'
    link.href = LINE_URL
    link.target = '_blank'
    link.rel = 'noopener'
    link.textContent = 'LINE'

    const guide = document.createElement('p')
    guide.append('最新の空きは', link, 'でお問い合わせください。')

    const status = document.createElement('div')
    status.className = 'calendar-status'
    status.setAttribute('role', 'status')
    status.append(message, guide)

    grid.replaceChildren(status)
    monthLabel.textContent = ''
    cta.hidden = true
    setNavState()
  }

  const render = () => {
    const month = currentMonth()
    monthLabel.textContent = `${month.year}年 ${month.month}月`

    const blanks = Array.from({ length: dates.firstWeekdayOf(month) }, () => {
      const blank = document.createElement('div')
      blank.className = 'calendar-day'
      return blank
    })
    const days = month.codes.map((_, index) => buildCell(month, index + 1))
    grid.replaceChildren(...blanks, ...days)

    setNavState()
    updateCta()
  }

  const moveMonth = (delta) => {
    const nextIndex = state.index + delta
    if (nextIndex < 0 || nextIndex >= state.months.length) return
    state = { ...state, index: nextIndex, selectedDay: null }
    render()
  }

  prevBtn.addEventListener('click', () => moveMonth(-1))
  nextBtn.addEventListener('click', () => moveMonth(1))

  const isValidMonth = (month) =>
    Boolean(month)
    && Number.isInteger(month.year)
    && Number.isInteger(month.month)
    && Array.isArray(month.codes)
    && month.codes.length > 0

  const load = async () => {
    showLoading()
    try {
      const response = await fetch(ENDPOINT, {
        headers: { accept: 'application/json' },
        signal: typeof AbortSignal.timeout === 'function' ? AbortSignal.timeout(FETCH_TIMEOUT_MS) : undefined,
      })
      if (!response.ok) throw new Error(`availability API ${response.status}`)
      const data = await response.json()
      const months = Array.isArray(data.months) ? data.months.filter(isValidMonth) : []
      if (months.length === 0) throw new Error('availability API returned no months')
      state = {
        months,
        today: typeof data.today === 'string' ? data.today : '',
        index: 0,
        selectedDay: null,
      }
      render()
    } catch (error) {
      console.error('空き状況の取得に失敗:', error)
      showError()
    }
  }

  // タブを開いたまま日付を跨いだら再取得(過去日表示と月窓を最新化)
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && state.today && state.today !== dates.jstTodayText()) load()
  })

  load()
})()
