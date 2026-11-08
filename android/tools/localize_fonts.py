"""ينسخ index.html إلى أصول التطبيق ويستبدل رابط خطوط Google بملفات محلية،
لتعمل اللعبة على الهاتف دون اتصال. الخطوط تُحمَّل مرة واحدة وتُحفظ في fonts-cache.

الاستخدام: python3 -I localize_fonts.py <page.html> <assets-dir>
"""
import hashlib
import os
import re
import shutil
import sys
import urllib.request

SRC, ASSETS = sys.argv[1], sys.argv[2]
CACHE = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'fonts-cache')
UA = ('Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 '
      '(KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36')
KEEP = {'arabic', 'latin'}  # يكفي العربي واللاتيني الأساسي


def fetch(url, dest):
    if not os.path.exists(dest):
        req = urllib.request.Request(url, headers={'User-Agent': UA})
        with urllib.request.urlopen(req, timeout=60) as r, open(dest + '.part', 'wb') as f:
            f.write(r.read())
        os.replace(dest + '.part', dest)
    return dest


os.makedirs(CACHE, exist_ok=True)
fonts_dir = os.path.join(ASSETS, 'fonts')
os.makedirs(fonts_dir, exist_ok=True)

html = open(SRC, encoding='utf-8').read()
link = re.search(r'<link href="(https://fonts\.googleapis\.com/css2[^"]+)" rel="stylesheet">', html)
if not link:
    sys.exit('Google Fonts <link> not found in index.html')
css_url = link.group(1).replace('&amp;', '&')
css = open(fetch(css_url, os.path.join(CACHE, hashlib.sha1(css_url.encode()).hexdigest()[:12] + '.css')),
           encoding='utf-8').read()

# كل كتلة @font-face يسبقها تعليق باسم المجموعة الحرفية: /* arabic */
blocks = re.findall(r'/\* ([\w-]+) \*/\s*(@font-face\s*\{[^}]*\})', css)
out = []
for subset, block in blocks:
    if subset not in KEEP:
        continue
    url = re.search(r'url\((https://fonts\.gstatic\.com/[^)]+)\)', block).group(1)
    name = hashlib.sha1(url.encode()).hexdigest()[:16] + '.woff2'
    shutil.copyfile(fetch(url, os.path.join(CACHE, name)), os.path.join(fonts_dir, name))
    out.append(f'/* {subset} */\n' + block.replace(url, 'fonts/' + name))
if not out:
    sys.exit('no font faces found')

html = re.sub(r'<link rel="preconnect"[^>]*>\n?', '', html)
html = html.replace(link.group(0), '<style>\n' + '\n'.join(out) + '\n</style>')
open(os.path.join(ASSETS, os.path.basename(SRC)), 'w', encoding='utf-8').write(html)
size = sum(os.path.getsize(os.path.join(fonts_dir, f)) for f in os.listdir(fonts_dir))
print(f'fonts: {len(out)} faces, {size // 1024} KB')
