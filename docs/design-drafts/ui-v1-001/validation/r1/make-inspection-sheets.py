"""Contact sheets for visual inspection only; no source artwork is altered."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import json

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'validation/r1/contact-sheets'
OUT.mkdir(exist_ok=True)
files = sorted((ROOT / 'previews/screens').glob('*.png'))
font = ImageFont.truetype('C:/Windows/Fonts/arial.ttf', 18)
rows = []
for start in range(0, len(files), 6):
    sheet = Image.new('RGB', (1920, 1140), '#162128')
    draw = ImageDraw.Draw(sheet)
    group = files[start:start + 6]
    for i, p in enumerate(group):
        im = Image.open(p).convert('RGB')
        im.thumbnail((950, 340))
        x, y = (i % 2) * 960, (i // 2) * 380
        sheet.paste(im, (x + (960-im.width)//2, y+30))
        draw.text((x+8, y+4), p.stem, font=font, fill='white')
    target = OUT / f'{start//6+1:02}.jpg'
    sheet.save(target, quality=90)
    rows.append({'sheet':target.relative_to(ROOT).as_posix(), 'files':[p.relative_to(ROOT).as_posix() for p in group]})
(OUT/'index.json').write_text(json.dumps(rows, indent=2)+'\n', 'utf-8')
print(json.dumps({'screens':len(files),'sheets':len(rows)}))
