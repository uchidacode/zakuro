// ヒーロー動画：再生終了・読み込み失敗時に静止画へフェードする
(() => {
  const video = document.querySelector('.hero-video')
  const still = document.querySelector('.hero-still')
  if (!video || !still) return

  const showStill = () => {
    still.classList.add('is-visible')
    video.classList.add('is-hidden')
  }

  video.addEventListener('ended', showStill)
  video.addEventListener('error', showStill)

  const source = video.querySelector('source')
  if (source) {
    source.addEventListener('error', showStill)
  }

  // 動画が用意されていない環境では、読み込み失敗がスクリプト実行前に
  // 確定していることがあるため、現在の状態も確認する
  if (video.error || video.networkState === HTMLMediaElement.NETWORK_NO_SOURCE) {
    showStill()
  }

  video.addEventListener(
    'canplay',
    () => {
      try {
        const playing = video.play()
        if (playing && playing.catch) {
          playing.catch(showStill)
        }
      } catch {
        showStill()
      }
    },
    { once: true }
  )
})()
