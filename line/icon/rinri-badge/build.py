"""公式LINE プロフィールアイコンを組む。

    python official_line/line/icon/build.py [元画像]

LINEのアイコンは円形に切り抜かれる。倫理研究所の社章は白い三角形の頂点が
花弁の円より外へ出ているため、全面に置くと3か所が削られる。
そこで「中心から最も遠い不透明画素」を実測し、それが円の SAFE 割合に
収まる倍率へ縮めてから中央に置く。元画像が差し替わっても同じ理屈で効く。
"""

import math
import os
import sys

from PIL import Image, ImageDraw

CANVAS = 640
SAFE = 0.85  # 紋章の最大半径 / 円の半径
DEFAULT_SRC = 'docs/18_画像素材/倫理研究所_社章.png'

BACKGROUNDS = {
    '01_kinari': (0xFA, 0xF7, 0xF1),  # 生成り（サイト基調）
    '02_ai': (0x1B, 0x2A, 0x4A),  # 藍（推奨）
    '03_white': (0xFF, 0xFF, 0xFF),
}
PREVIEW_SIZES = [40, 60, 96, 140]


def max_radius(image: Image.Image) -> float:
    """中心から最も遠い不透明画素までの距離"""
    w, h = image.size
    alpha = image.split()[3].load()
    cx, cy = w / 2, h / 2
    return max(
        math.hypot(x - cx, y - cy)
        for y in range(h)
        for x in range(w)
        if alpha[x, y] > 8
    )


def circular(image: Image.Image) -> Image.Image:
    """円形に切り抜く（LINEでの見え方の確認用）"""
    size = image.size[0]
    mask = Image.new('L', (size, size), 0)
    ImageDraw.Draw(mask).ellipse((0, 0, size - 1, size - 1), fill=255)
    out = image.copy()
    out.putalpha(mask)
    return out


def main() -> None:
    src_path = sys.argv[1] if len(sys.argv) > 1 else DEFAULT_SRC
    out_dir = os.path.dirname(os.path.abspath(__file__))

    src = Image.open(src_path).convert('RGBA')
    radius = max_radius(src)
    scale = (CANVAS / 2 * SAFE) / radius
    size = round(src.size[0] * scale)
    emblem = src.resize((size, size), Image.LANCZOS)
    offset = (CANVAS - size) // 2

    print(f'元画像   : {src_path} {src.size}')
    print(f'最大半径 : {radius:.1f}px → 倍率 {scale:.3f} → 描画 {size}px')
    print(f'円の内側 {SAFE * 100:.0f}% に収まる')

    for name, bg in BACKGROUNDS.items():
        base = Image.new('RGBA', (CANVAS, CANVAS), bg + (255,))
        base.alpha_composite(emblem, (offset, offset))
        base.convert('RGB').save(os.path.join(out_dir, f'{name}.png'))
        circular(base).save(os.path.join(out_dir, f'{name}_circle.png'))

    # 小さいサイズでの見比べ
    pad = 16
    width = pad + sum(s + pad for s in PREVIEW_SIZES)
    height = pad + len(BACKGROUNDS) * (max(PREVIEW_SIZES) + pad)
    sheet = Image.new('RGB', (width, height), (0xE9, 0xEA, 0xED))
    for row, name in enumerate(BACKGROUNDS):
        icon = Image.open(os.path.join(out_dir, f'{name}.png')).convert('RGBA')
        y = pad + row * (max(PREVIEW_SIZES) + pad)
        x = pad
        for s in PREVIEW_SIZES:
            thumb = circular(icon.resize((s, s), Image.LANCZOS))
            sheet.paste(thumb, (x, y + (max(PREVIEW_SIZES) - s) // 2), thumb)
            x += s + pad
    sheet.save(os.path.join(out_dir, '_preview_sizes.png'))

    print(f'書き出し : {out_dir}')


if __name__ == '__main__':
    main()
