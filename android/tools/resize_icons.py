"""يحجّم أيقونات المصدر (1024px) إلى مقاسات كثافات أندرويد."""
import os
import sys

from PIL import Image

masters, res = sys.argv[1], sys.argv[2]
DENSITIES = {'mdpi': 1, 'hdpi': 1.5, 'xhdpi': 2, 'xxhdpi': 3, 'xxxhdpi': 4}


def save(img, folder, name, px):
    d = os.path.join(res, folder)
    os.makedirs(d, exist_ok=True)
    img.resize((px, px), Image.LANCZOS).save(os.path.join(d, name), optimize=True)


legacy = Image.open(os.path.join(masters, 'legacy.png')).convert('RGBA')
round_ = Image.open(os.path.join(masters, 'round.png')).convert('RGBA')
fg = Image.open(os.path.join(masters, 'fg.png')).convert('RGBA')

# الأيقونة أحادية اللون (أندرويد ١٣+) تأخذ شكل الحجر فقط بلون أبيض
alpha = fg.getchannel('A').point(lambda a: 255 if a > 140 else 0)
mono = Image.new('RGBA', fg.size, (255, 255, 255, 0))
mono.putalpha(alpha)

for dens, k in DENSITIES.items():
    folder = 'mipmap-' + dens
    save(legacy, folder, 'ic_launcher.png', round(48 * k))
    save(round_, folder, 'ic_launcher_round.png', round(48 * k))
    save(fg, folder, 'ic_launcher_fg.png', round(108 * k))
    save(mono, folder, 'ic_launcher_mono.png', round(108 * k))

Image.open(os.path.join(masters, 'store.png')).convert('RGB').resize((512, 512), Image.LANCZOS).save(
    os.path.join(os.path.dirname(res), 'icon-512.png'), optimize=True)
print('icons written')
