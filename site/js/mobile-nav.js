// モバイルナビゲーション：ドロワーメニュー・ホームの固定ヘッダー・追従LINE CTA
// 対象要素はモバイル幅(css/mobile.css)でのみ表示されるため、PCでは実質何もしない
(() => {
  const MOBILE_QUERY = '(max-width: 900px)' // css/mobile*.css のブレークポイントと一致させる
  const FOCUSABLE = 'a[href], button:not([disabled])'

  const drawer = document.querySelector('.drawer')
  const toggles = Array.from(document.querySelectorAll('[data-drawer-open]'))
  const closers = drawer ? Array.from(drawer.querySelectorAll('[data-drawer-close]')) : []
  const drawerLinks = drawer ? Array.from(drawer.querySelectorAll('a')) : []

  let lastFocus = null

  const setExpanded = (opened) => {
    toggles.forEach((toggle) => toggle.setAttribute('aria-expanded', String(opened)))
  }

  const openDrawer = () => {
    if (!drawer) return
    lastFocus = document.activeElement
    drawer.hidden = false
    document.body.classList.add('drawer-open')
    setExpanded(true)
    const closeBtn = drawer.querySelector('.drawer-close')
    if (closeBtn) closeBtn.focus()
  }

  const closeDrawer = () => {
    if (!drawer || drawer.hidden) return
    drawer.hidden = true
    document.body.classList.remove('drawer-open')
    setExpanded(false)
    if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true })
  }

  toggles.forEach((toggle) => toggle.addEventListener('click', openDrawer))
  closers.forEach((closer) => closer.addEventListener('click', closeDrawer))
  drawerLinks.forEach((link) => link.addEventListener('click', closeDrawer))

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeDrawer()
  })

  // ダイアログ内でフォーカスを循環させる
  if (drawer) {
    drawer.addEventListener('keydown', (event) => {
      if (event.key !== 'Tab') return
      const items = Array.from(drawer.querySelectorAll(FOCUSABLE))
      if (items.length === 0) return
      const first = items[0]
      const last = items[items.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    })
  }

  // PC幅に広がったら開きっぱなしのドロワーを畳む
  const mobileQuery = window.matchMedia(MOBILE_QUERY)
  if (mobileQuery.addEventListener) {
    mobileQuery.addEventListener('change', (event) => {
      if (!event.matches) closeDrawer()
    })
  }

  // 現在ページへのドロワーリンクに aria-current を付ける
  const currentPage = location.pathname.split('/').pop() || 'index.html'
  drawerLinks.forEach((link) => {
    if (link.getAttribute('href') === currentPage) link.setAttribute('aria-current', 'page')
  })

  // スクロール連動：ヒーローを過ぎたら固定ヘッダー、下スクロールでCTAを退避
  const header = document.body.classList.contains('page-home')
    ? document.querySelector('.site-header')
    : null
  const cta = document.querySelector('.mobile-cta')
  const STICKY_AT = 320 // ヒーロー写真(高さ366px)をほぼ抜けた位置。mobile-home.css と連動
  const CTA_FREE_ZONE = 160
  const DELTA_MIN = 4

  let lastY = window.scrollY
  // アンカーへのスムーススクロール(プログラムによる下スクロール)では CTA を隠さない。
  // 隠すのはユーザー操作(ポインタ・ホイール・キー)後のスクロールに限る
  let userScrolled = !location.hash

  window.addEventListener('hashchange', () => {
    userScrolled = false
    if (cta) cta.classList.remove('is-hidden')
  })

  const markUserScroll = () => {
    userScrolled = true
  }
  ;['pointerdown', 'wheel', 'keydown'].forEach((type) => {
    window.addEventListener(type, markUserScroll, { passive: true })
  })

  // 途中位置での読み込み(アンカー着地・bfcache復元)でも表示状態を合わせる
  const syncScrollState = () => {
    lastY = window.scrollY
    if (header) header.classList.toggle('is-stuck', lastY > STICKY_AT)
    if (cta && lastY <= CTA_FREE_ZONE) cta.classList.remove('is-hidden')
  }

  window.addEventListener(
    'scroll',
    () => {
      const y = window.scrollY
      const delta = y - lastY
      lastY = y

      if (header) header.classList.toggle('is-stuck', y > STICKY_AT)

      if (!cta) return
      if (delta > DELTA_MIN && y > CTA_FREE_ZONE) {
        if (userScrolled) cta.classList.add('is-hidden')
      } else if (delta < -DELTA_MIN || y <= CTA_FREE_ZONE) {
        cta.classList.remove('is-hidden')
      }
    },
    { passive: true }
  )

  window.addEventListener('pageshow', syncScrollState)
  syncScrollState()
})()
