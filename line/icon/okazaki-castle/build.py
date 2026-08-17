"""公式LINE プロフィールアイコン（岡崎城）を組む。

    python official_line/line/icon/okazaki-castle/build.py

LINEのアイコンは円形に切り抜かれる。写真をそのまま正方形にすると四隅が落ちるので、
**円の中に収まる構図**で切り抜くこと前提に CROP を決めてある。

CROP は原本 `docs/18_画像素材/岡崎城_天守.jpg`（1560×1050）の座標。
天守の全体が入り、上に空、下に緑がわずかに残る位置。
候補（520/590/640/700/760px）を円形マスクで見比べて 700px を採った。
"""

import os

from PIL import Image, ImageDraw, ImageEnhance

SRC = 'docs/18_画像素材/岡崎城_天守.jpg'
CANVAS = 640
CROP = (420, 250, 1120, 950)  # 中心(770,600) / 一辺700px
CONTRAST = 1.06  # 小さく表示したときに輪郭を保つための微調整
SATURATION = 1.04
PREVIEW_SIZES = [40, 60, 96, 140]


def circular(image: Image.Image) -> Image.Image:
    """円形に切り抜く（LINEでの見え方の確認用）"""
    size = image.size[0]
    mask = Image.new('L', (size, size), 0)
    ImageDraw.Draw(mask).ellipse((0, 0, size - 1, size - 1), fill=255)
    out = image.convert('RGBA')
    out.putalpha(mask)
    return out


def main() -> None:
    out_dir = os.path.dirname(os.path.abspath(__file__))
    src = Image.open(SRC).convert('RGB')

    icon = src.crop(CROP).resize((CANVAS, CANVAS), Image.LANCZOS)
    icon = ImageEnhance.Contrast(icon).enhance(CONTRAST)
    icon = ImageEnhance.Color(icon).enhance(SATURATION)

    icon.save(os.path.join(out_dir, 'icon.png'))
    icon.save(os.path.join(out_dir, 'icon.jpg'), quality=92, optimize=True)
    circular(icon).save(os.path.join(out_dir, 'icon_circle.png'))

    print(f'元画像 : {SRC} {src.size}')
    print(f'切り抜き: {CROP} → {CANVAS}x{CANVAS}')

    pad = 16
    width = pad + sum(s + pad for s in PREVIEW_SIZES)
    height = max(PREVIEW_SIZES) + pad * 2
    sheet = Image.new('RGB', (width, height), (0xE9, 0xEA, 0xED))
    x = pad
    for s in PREVIEW_SIZES:
        thumb = circular(icon.resize((s, s), Image.LANCZOS))
        sheet.paste(thumb, (x, pad + (max(PREVIEW_SIZES) - s) // 2), thumb)
        x += s + pad
    sheet.save(os.path.join(out_dir, '_preview_sizes.png'))

    for f in sorted(os.listdir(out_dir)):
        if f.endswith(('.png', '.jpg')):
            kb = os.path.getsize(os.path.join(out_dir, f)) / 1024
            print(f'  {f:<24} {kb:7.1f} KB')


if __name__ == '__main__':
    main()
