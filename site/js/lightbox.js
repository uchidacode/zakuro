// フォトライトボックス（施設・ごはん）
// 対象は data-lightbox-group を持つボタン。ラベルは data-lightbox-label、
// 無指定のグループは「助産院ごはん　n / N」を自動で付ける。
(() => {
  const triggers = Array.from(document.querySelectorAll('[data-lightbox-group]'))
  const box = document.querySelector('.lightbox')
  if (triggers.length === 0 || !box) return

  const labelEl = box.querySelector('.lightbox-label')
  const imgEl = box.querySelector('.lightbox-img')
  const dotsEl = box.querySelector('.lightbox-dots')
  const thumbsEl = box.querySelector('.lightbox-thumbs')
  const closeBtn = box.querySelector('.lightbox-close')
  const prevBtn = box.querySelector('.lightbox-prev')
  const nextBtn = box.querySelector('.lightbox-next')
  if (!labelEl || !imgEl || !dotsEl || !thumbsEl || !closeBtn || !prevBtn || !nextBtn) return

  const groups = {}
  triggers.forEach((trigger) => {
    const name = trigger.dataset.lightboxGroup
    const img = trigger.querySelector('img')
    if (!img) return
    const items = groups[name] || []
    trigger.dataset.lightboxIndex = String(items.length)
    groups[name] = [...items, { src: img.currentSrc || img.src, label: trigger.dataset.lightboxLabel || '' }]
  })

  let current = null
  let lastFocus = null

  const itemLabel = (item, index, total) =>
    item.label || `助産院ごはん　${index + 1} / ${total}`

  const render = () => {
    if (!current) return
    const items = groups[current.group]
    const item = items[current.index]
    labelEl.textContent = itemLabel(item, current.index, items.length)
    imgEl.src = item.src
    imgEl.alt = itemLabel(item, current.index, items.length)

    const dots = items.map((_, i) => {
      const dot = document.createElement('span')
      if (i === current.index) dot.classList.add('is-active')
      return dot
    })
    dotsEl.replaceChildren(...dots)

    const thumbs = items.map((entry, i) => {
      const thumb = document.createElement('button')
      thumb.type = 'button'
      thumb.className = 'lightbox-thumb'
      if (i === current.index) thumb.classList.add('is-active')
      thumb.setAttribute('aria-label', `${i + 1}枚目を表示`)
      const thumbImg = document.createElement('img')
      thumbImg.src = entry.src
      thumbImg.alt = ''
      thumb.append(thumbImg)
      thumb.addEventListener('click', () => {
        current = { ...current, index: i }
        render()
      })
      return thumb
    })
    thumbsEl.replaceChildren(...thumbs)

    const active = thumbs[current.index]
    if (active) {
      const left = active.offsetLeft - thumbsEl.clientWidth / 2 + active.offsetWidth / 2
      thumbsEl.scrollTo({ left: Math.max(0, left), behavior: 'smooth' })
    }
  }

  const open = (group, index) => {
    current = { group, index }
    lastFocus = document.activeElement
    box.hidden = false
    document.body.classList.add('lightbox-open')
    render()
    closeBtn.focus()
  }

  const close = () => {
    current = null
    box.hidden = true
    document.body.classList.remove('lightbox-open')
    if (lastFocus && lastFocus.focus) lastFocus.focus()
  }

  const step = (delta) => {
    if (!current) return
    const total = groups[current.group].length
    current = { ...current, index: (current.index + delta + total) % total }
    render()
  }

  triggers.forEach((trigger) => {
    if (trigger.dataset.lightboxIndex === undefined) return
    const name = trigger.dataset.lightboxGroup
    const index = Number(trigger.dataset.lightboxIndex)
    trigger.addEventListener('click', () => open(name, index))
  })

  closeBtn.addEventListener('click', close)
  prevBtn.addEventListener('click', () => step(-1))
  nextBtn.addEventListener('click', () => step(1))

  document.addEventListener('keydown', (event) => {
    if (!current) return
    if (event.key === 'Escape') close()
    if (event.key === 'ArrowLeft') step(-1)
    if (event.key === 'ArrowRight') step(1)
  })
})()
