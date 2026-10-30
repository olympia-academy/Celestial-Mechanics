"""Build deterministic SVG logos. Requires fonttools; pass a local bold TTF.

Example: python tools/build_logos.py --font /path/to/Arial-Bold.ttf
The font file is not embedded or distributed; only the wordmark outlines are.
"""
from argparse import ArgumentParser
from html import escape
from math import cos, sin, sqrt, radians
from pathlib import Path

from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.ttLib import TTFont

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "assets" / "logo"
A, B = 500.0, 210.0
C = sqrt(A * A - B * B)
THETA = radians(-35)
PX, PY = A * cos(THETA), B * sin(THETA)


def wordmark(font, text):
    glyphs, cmap = font.getGlyphSet(), font.getBestCmap()
    pen, advance = SVGPathPen(glyphs), 0
    for char in text:
        glyph = glyphs[cmap[ord(char)]]
        glyph.draw(TransformPen(pen, (1, 0, 0, 1, advance, 0)))
        advance += glyph.width
    return pen.getCommands(), advance


def main():
    parser = ArgumentParser(description=__doc__)
    parser.add_argument("--font", type=Path, required=True)
    args = parser.parse_args()
    font = TTFont(args.font)
    names = [("himmelmekanikk-no", "Himmelmekanikk", "nb"),
             ("celestial-mechanics-en", "Celestial Mechanics", "en")]
    marks = {name: wordmark(font, label) for name, label, _ in names}
    # Identical font size and symbol geometry in both languages.
    scale = min(105 / font["head"].unitsPerEm,
                1220 / max(width for _, width in marks.values()))
    OUT.mkdir(parents=True, exist_ok=True)
    for name, label, language in names:
        d, width = marks[name]
        left = (1400 - scale * width) / 2
        for suffix, ink in [("", "#101e2d"), ("-dark", "#f1f5f9")]:
            desc = ("En ellipse med solen i venstre brennpunkt og planeten på banen."
                    if language == "nb" else
                    "An ellipse with the sun at the left focus and a planet on the orbit.")
            text_transform = f"translate({left:.9f} 355) scale({scale:.12f} {-scale:.12f})"
            svg = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1400 640" width="1400" height="640" role="img" aria-labelledby="logo-title logo-desc" lang="{language}">
  <title id="logo-title">{escape(label)}</title>
  <desc id="logo-desc">{desc} a=500, b=210, c=sqrt(a²-b²). Rotation: -12°.</desc>
  <defs>
    <mask id="planet-gap" maskUnits="userSpaceOnUse" x="-520" y="-250" width="1040" height="500">
      <rect x="-520" y="-250" width="1040" height="500" fill="white"/>
      <circle cx="{PX:.9f}" cy="{PY:.9f}" r="28" fill="black"/>
    </mask>
    <mask id="wordmark-clearance" maskUnits="userSpaceOnUse" x="0" y="0" width="1400" height="640">
      <rect width="1400" height="640" fill="white"/>
      <rect x="{left - 16:.9f}" y="270" width="{scale * width + 32:.9f}" height="100" fill="black"/>
    </mask>
  </defs>
  <g mask="url(#wordmark-clearance)">
  <g id="orbit-symbol" transform="translate(700 320) rotate(-12)">
    <ellipse id="orbit" cx="0" cy="0" rx="{A:g}" ry="{B:g}" fill="none" stroke="{ink}" stroke-width="8" mask="url(#planet-gap)"/>
    <circle id="sun" cx="{-C:.9f}" cy="0" r="30" fill="#dba73e"/>
    <circle id="planet" cx="{PX:.9f}" cy="{PY:.9f}" r="20" fill="#039bb6"/>
  </g>
  </g>
  <path id="wordmark" fill="{ink}" transform="{text_transform}" d="{d}"/>
</svg>
'''
            output = OUT / f"{name}{suffix}.svg"
            output.write_text(svg, encoding="utf-8", newline="\n")
            print(f"Created {output.relative_to(ROOT)}")
    print(f"Focus offset: {C:.9f}; planet: ({PX:.9f}, {PY:.9f})")


if __name__ == "__main__":
    main()
