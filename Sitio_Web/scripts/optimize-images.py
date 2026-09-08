"""Generate responsive WebP copies; preserve original photographs."""
import json
from pathlib import Path
from PIL import Image, ImageOps
root = Path(__file__).resolve().parents[1]
p = root / 'assets/manifest.json'
data = json.loads(p.read_text())
for key, groups in data.items():
    if key == 'featured':
        continue
    items = [im for g in groups for im in g['items']] if groups and 'items' in groups[0] else groups
    for item in items:
        source = root / item['src']
        with Image.open(source) as original:
            original = ImageOps.exif_transpose(original).convert('RGB')
            variants = []
            for width in (480, 960, 1600):
                if width > original.width:
                    continue
                dest = source.parent / 'responsive' / (source.stem + '-' + str(width) + '.webp')
                dest.parent.mkdir(exist_ok=True)
                im = original.copy()
                im.thumbnail((width, 10000), Image.Resampling.LANCZOS)
                im.save(dest, 'WEBP', quality=80, method=6)
                variants.append(str(dest.relative_to(root)) + ' ' + str(im.width) + 'w')
            item['srcset'] = ', '.join(variants)
for key in ('eventos', 'retratos'):
    for group in data[key]:
        group.setdefault('featured', [im['src'] for im in group['items'][:3]])
data.setdefault('featured', {key: [im['src'] for im in data[key][:3]] for key in ('paisaje', 'documental')})
p.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n')
