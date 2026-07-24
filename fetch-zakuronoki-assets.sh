#!/usr/bin/env bash
#
# ざくろの木助産院 サイト素材 一括取得
#
#   bash fetch-zakuronoki-assets.sh
#
# Wix の URL から /v1/... 以降の変換パラメータを外し、アップロード時の
# 原本サイズを取得します。用途別のフォルダに振り分け、MANIFEST.md を生成します。

set -uo pipefail

BASE="https://static.wixstatic.com/media"
ROOT="${1:-zakuronoki-assets}"
OK=0
NG=0

dl() { # dl <subdir> <filename> <media-id>
  local dir="$ROOT/$1" name="$2" id="$3"
  mkdir -p "$dir"
  if curl -sfL --retry 2 --max-time 60 -o "$dir/$name" "$BASE/$id"; then
    printf '  ok    %-28s %s\n' "$1/" "$name"
    OK=$((OK + 1))
  else
    printf '  FAIL  %-28s %s  (%s)\n' "$1/" "$name" "$id" >&2
    rm -f "$dir/$name"
    NG=$((NG + 1))
  fi
}

echo "==> $ROOT に取得します"

# ---------------------------------------------------------------- ロゴ
dl 01-logo zakuro-icon.png \
  "af253c_b38f4a0ced134e12bba5f57560afc90b~mv2.png"
dl 01-logo zakuro-mark.png \
  "1ad2f8_7d9b46c76c1d41878885c6a71a9ce0fa~mv2.png"

# -------------------------------------------------- 古民家（ヒーロー候補）
i=1
for id in \
  "af253c_4390d15941ba4369b095bf0c1b17757c~mv2.jpg" \
  "af253c_47010294f2f34df5bda9aadcf603d0d6~mv2.jpg" \
  "af253c_baeb0a52892e4e5d90a37fe52d37f9ae~mv2.jpg" \
  "af253c_7d5575b12ca646249f92154de3718709~mv2.jpg" \
  "af253c_d4c998df6ec9462292d72749d82eb05d~mv2.jpg" \
  "af253c_a64a7705764a4876bf96b576612c1487~mv2.jpg" \
  "af253c_f78075503665440594571eafa53b5387~mv2.jpg" \
  "af253c_083ea54e98d045a086fb6560167e8cf2~mv2.jpg" \
  "af253c_271bbf79111d4731a512266a6568ea5c~mv2.jpg" \
  "af253c_e26965801ecb4e4a8f727ab9e51cccdc~mv2.jpg" \
  "af253c_3f7137482ab745f0ae4caf9f09a3c0bb~mv2.jpg" \
  "af253c_8b54145894584eca9d8273ff32e6091d~mv2.jpg" \
  "af253c_3af32846f2ac4be98fe93693774274eb~mv2.jpg"; do
  dl 02-facility "$(printf 'facility-%02d.jpg' "$i")" "$id"
  i=$((i + 1))
done

# ------------------------------------------------------------ 助産院ごはん
i=1
for id in \
  "af253c_9c1705d7e96844928601d0b190bfaf6d~mv2.jpg" \
  "af253c_a7853c6dbda340b29e76438109e18c4b~mv2.jpg" \
  "af253c_8a0a7cf46b674e36b91c2672fdd29c4d~mv2.jpg" \
  "af253c_ecab2672a3cf45f380a61dc79c2b30af~mv2.jpg" \
  "af253c_b359dfea0dba4ce3b1ddae81773177dbf003.jpg" \
  "af253c_62f4987b4c8e4b22b24b64c972d4852f~mv2.jpg" \
  "af253c_d08daad8bdad49c1a21805b6fb65f8d9f003.jpg" \
  "af253c_598af692d3394b049257fe7f81e254a1~mv2.jpg" \
  "af253c_4a5f0546735a4ba8a2acbf4d7bbad14e~mv2.jpg"; do
  dl 03-food "$(printf 'food-%02d.jpg' "$i")" "$id"
  i=$((i + 1))
done

# ------------------------------------------------------------------ 人物
dl 04-staff director.jpg \
  "1ad2f8_0988963d17c346eeafc09047d4c4b31e~mv2.jpg"

while IFS='|' read -r name id; do
  [ -z "$name" ] && continue
  dl 04-staff "$name" "$id"
done <<'STAFF'
staff-01-kimura.jpg|af253c_6ce7f8e58a5044ec8447a26949d8dbda~mv2.jpg
staff-02-taya.jpg|af253c_3932aeb43fcf49428f9cd1a45a6e689c~mv2.jpg
staff-03-aoyagi.jpg|af253c_03695bc120354bcfaaac0dec67ff197d~mv2.jpg
staff-04-ogura.jpg|af253c_5a0ae0e47b334689896f8f70c56599a8~mv2.jpg
staff-05-tanuma.jpg|af253c_28f6506a0af543d8bec1349a73268e69~mv2.jpg
staff-06-sugawara.jpg|af253c_501e4a0acda94ed5b8c7caf8dc1e185b~mv2.jpg
staff-07-takahashi.jpg|af253c_71c586af7dc64a8497cec9808b521a97~mv2.jpg
staff-08-naganuma.jpg|af253c_082084f62a234e0cbdb8a054652f0b11~mv2.jpg
staff-09-suzuki.jpg|af253c_b916885ea522444689868e4546b7c64f~mv2.jpg
staff-10-mizui.jpeg|af253c_e3369e227e4748d7abf598c97f37afd0~mv2.jpeg
staff-11-kishimoto.jpg|af253c_2ab09167fc464754b0d6591de779d0c9~mv2.jpg
staff-12-nashimoto.jpg|af253c_7e3a4a7a85f440bf8327af4dded8a926~mv2.jpg
staff-13-saito.jpeg|af253c_b1f47ef976534ccbb5072eb9f2fea16f~mv2.jpeg
staff-14-nakamura.jpg|af253c_0b4522217bb94825aa1a0c4a84921f60~mv2.jpg
staff-15-tanaka.jpeg|af253c_9f16527d606a4cfb8bc7c7b982cd8e69~mv2.jpeg
staff-16-aoki.jpg|af253c_421ae0e7903244ba966015ebd118ffe3~mv2.jpg
STAFF

# ------------------------------------------------------------ ユーファイ
dl 05-yuffai yuffai-class.jpg \
  "af253c_0d824c52707d4cd1a39a9da1dcbcb743~mv2.jpg"

# ---------------------------------------------------------------- LINE
dl 06-line line-qr.png \
  "af253c_a55252bd07714a57a95abf5772997253~mv2.png"

# ----------------------------------------- 参照用（素材ではなく読み取り元）
dl 90-reference pricing-postpartum-care.jpeg \
  "af253c_a40b72482f7b4148bb3e55ae2d0d4f03~mv2.jpeg"
dl 90-reference availability-current-01.jpg \
  "af253c_453a0ffdfa6c427caab3f8da629a587b~mv2.jpg"
dl 90-reference availability-current-02.jpg \
  "af253c_202afaa03a4449d98c4ad50791fbc18e~mv2.jpg"

# -------------------------------------------- 用途不明（Wix標準素材の疑い）
dl 99-misc misc-01.jpg "1ad2f8_c6c93c0b26624d86b1241bab304297cf~mv2.jpg"
dl 99-misc misc-02.jpg "1ad2f8_6999b97f208e4e9eb25ccc3993e75c47~mv2.jpg"
dl 99-misc misc-03-stock.jpg "11062b_32b2d4a0ad2e4293bbcf17bb9d2c366c~mv2.jpg"

# ------------------------------------------------------------ MANIFEST
cat > "$ROOT/MANIFEST.md" <<'EOF'
# ざくろの木助産院 サイト素材

既存サイト（Wix）から取得。変換パラメータを外しているため、アップロード時の原本サイズ。

| フォルダ | 中身 | 新サイトでの用途 |
|---|---|---|
| `01-logo/` | ロゴ・ざくろマーク | ヘッダー、ファビコン |
| `02-facility/` | 古民家の内外観 13枚 | **ヒーロー最有力**、施設紹介ギャラリー |
| `03-food/` | 助産院ごはん 9枚 | 助産院について、産後ケア |
| `04-staff/` | 院長 + スタッフ 16名 | スタッフ紹介グリッド |
| `05-yuffai/` | ユーファイ教室 | ユーファイ教室ページ |
| `06-line/` | 公式LINE QR | フッター（**URLリンクも併設が必須**） |
| `90-reference/` | 料金表・空き状況 | 素材ではなく**読み取り元**。テキストに起こす |
| `99-misc/` | 用途不明 3枚 | Wix標準素材の可能性。要確認 |

## 注意

- `90-reference/pricing-postpartum-care.jpeg` は産後ケア料金表のスクリーンショット。
  新サイトではテキスト化するので、画像としては使わない。
- `06-line/line-qr.png` はQR画像。スマホで見ている人は画面上のQRを読めないため、
  `lin.ee` のURLリンクを必ず併設すること。
- `04-staff/` は肖像。掲載可否を本人に確認済みか、姉に一度確認する。
- ヒーローに使う1枚だけは、解像度が足りなければ撮り直しを検討する価値がある。

## 解像度の確認

```sh
command -v identify >/dev/null && identify -format '%f  %wx%h  %b\n' */*.{jpg,jpeg,png} 2>/dev/null | sort
```
EOF

echo
echo "==> 完了: 成功 $OK / 失敗 $NG"
echo "==> $ROOT/MANIFEST.md を確認してください"
echo
if command -v identify >/dev/null 2>&1; then
  echo "--- 解像度 ---"
  (cd "$ROOT" && identify -format '%f  %wx%h  %b\n' ./*/*.jpg ./*/*.jpeg ./*/*.png 2>/dev/null | sort)
else
  echo "(ImageMagick があれば解像度も出ます: brew install imagemagick)"
  du -sh "$ROOT"/*/
fi
