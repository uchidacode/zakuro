"""site/assets/ を zakuronoki-assets/（Wix原本アーカイブ）から再生成する。

- Webサイズへ縮小し、EXIF（撮影情報・位置情報）を除去、向きを補正する。
- スタッフ写真の番号はデザイン側の命名に合わせて振り直している。
- 以下のファイルはアーカイブ由来ではないため、このスクリプトでは触らない:
    hero.mp4 / still-03.jpg   … 院で撮影した実物素材（デザインプロジェクト由来）
    entrance-birth.jpg        … デザインプロジェクトからの取得物
    line-qr.png / zakuro-icon.png … 初回のみ生成（下の ICONS 参照）
"""
from pathlib import Path
from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / 'zakuronoki-assets'
OUT = ROOT / 'site' / 'assets'

JPG = [  # (出力名, 元ファイル, 長辺px)
    *[(f'facility-{i:02d}.jpg', SRC / '02-facility' / f'facility-{i:02d}.jpg', 1600)
      for i in range(1, 11)],
    *[(f'food-{i:02d}.jpg', SRC / '03-food' / f'food-{i:02d}.jpg', 1600)
      for i in range(1, 10)],
    ('director.jpg', SRC / '04-staff' / 'director.jpg', 900),
    ('staff-01-kimura.jpg', SRC / '04-staff' / 'staff-01-kimura.jpg', 900),
    ('staff-02-taya.jpg', SRC / '04-staff' / 'staff-02-taya.jpg', 900),
    ('staff-03-aoyagi.jpg', SRC / '04-staff' / 'staff-03-aoyagi.jpg', 900),
    ('staff-04-ogura.jpg', SRC / '04-staff' / 'staff-04-ogura.jpg', 900),
    ('staff-05-tanuma.jpg', SRC / '04-staff' / 'staff-05-tanuma.jpg', 900),
    ('staff-06-sugawara.jpg', SRC / '04-staff' / 'staff-06-sugawara.jpg', 900),
    ('staff-07-takahashi.jpg', SRC / '04-staff' / 'staff-07-takahashi.jpg', 900),
    ('staff-08-naganuma.jpg', SRC / '04-staff' / 'staff-08-naganuma.jpg', 900),
    ('staff-09-suzuki.jpg', SRC / '04-staff' / 'staff-09-suzuki.jpg', 900),
    ('staff-10-aoki.jpg', SRC / '04-staff' / 'staff-16-aoki.jpg', 900),
    ('staff-11-mizui.jpg', SRC / '04-staff' / 'staff-10-mizui.jpeg', 900),
    ('staff-12-kishimoto.jpg', SRC / '04-staff' / 'staff-11-kishimoto.jpg', 900),
    ('staff-13-nashimoto.jpg', SRC / '04-staff' / 'staff-12-nashimoto.jpg', 900),
    ('staff-14-saito.jpg', SRC / '04-staff' / 'staff-13-saito.jpeg', 900),
    ('staff-15-nakamura.jpg', SRC / '04-staff' / 'staff-14-nakamura.jpg', 900),
    ('staff-16-tanaka.jpg', SRC / '04-staff' / 'staff-15-tanaka.jpeg', 900),
]

ICONS = [  # 初回のみ。既存があれば上書きしない
    ('zakuro-icon.png', SRC / '01-logo' / 'zakuro-icon.png', 160),
]


def convert_jpg(dest: Path, source: Path, max_edge: int) -> str:
    im = Image.open(source)
    im = ImageOps.exif_transpose(im)
    if im.mode != 'RGB':
        im = im.convert('RGB')
    if max(im.size) > max_edge:
        scale = max_edge / max(im.size)
        im = im.resize((round(im.width * scale), round(im.height * scale)),
                       Image.LANCZOS)
    im.save(dest, 'JPEG', quality=82, optimize=True, progressive=True)
    return f'{im.width}x{im.height}'


def convert_icon(dest: Path, source: Path, height: int) -> str:
    im = Image.open(source)
    if im.height > height:
        scale = height / im.height
        im = im.resize((round(im.width * scale), height), Image.LANCZOS)
    im.save(dest, 'PNG', optimize=True)
    return f'{im.width}x{im.height}'


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    for name, src, edge in JPG:
        info = convert_jpg(OUT / name, src, edge)
        print(f'{name:26s} {info:>10s} {(OUT / name).stat().st_size // 1024:>5d}K')
    for name, src, height in ICONS:
        if (OUT / name).exists():
            print(f'{name:26s} {"skip (exists)":>10s}')
            continue
        print(f'{name:26s} {convert_icon(OUT / name, src, height):>10s}')


if __name__ == '__main__':
    main()
