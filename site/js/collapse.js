// 自宅分娩の内訳ドロワー
(() => {
  const toggle = document.querySelector('.breakdown-toggle')
  const panel = document.getElementById('home-birth-breakdown')
  const label = toggle ? toggle.querySelector('.breakdown-toggle-label') : null
  if (!toggle || !panel || !label) return

  toggle.addEventListener('click', () => {
    const opened = panel.hidden
    panel.hidden = !opened
    toggle.classList.toggle('is-open', opened)
    toggle.setAttribute('aria-expanded', String(opened))
    label.textContent = opened ? '内訳を閉じる' : '内訳を見る'
  })
})()
