#!/usr/bin/env python3
"""앱 코드 버전을 계산해 version.json과 app.js의 APP_VERSION에 기록한다.
먼저 index.html의 apple-touch-icon에 design/shared/icons/apple-touch-icon.datauri.txt 내용을 그대로 넣는다.

버전 = 앱 코드 파일 내용의 해시. 식단 사진·목록(data/) 업로드로는 바뀌지 않고,
코드가 바뀐 배포에서만 바뀐다. APP_VERSION 값 자체는 해시에서 제외한다.
같은 코드면 항상 같은 값이라 여러 번 실행해도 변경이 생기지 않는다.
"""
import hashlib
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CODE_FILES = ['index.html', 'app.js', 'style.css', 'sw.js', 'config.js', 'manifest.webmanifest',
              'design/shared/tokens.css', 'design/shared/symbols.js']
CONST = re.compile(r"(APP_VERSION = ')[^']*(')")

# 홈 화면 아이콘: 공통 data 주소를 파일에서 읽어 그대로 삽입 (head에 1개만)
datauri = (ROOT / 'design/shared/icons/apple-touch-icon.datauri.txt').read_text(encoding='utf-8').strip()
html = (ROOT / 'index.html').read_text(encoding='utf-8')
LINK = re.compile(r'(<link rel="apple-touch-icon" sizes="180x180" href=")[^"]*(">)')
assert len(LINK.findall(html)) == 1 and html.count('rel="apple-touch-icon"') == 1, 'apple-touch-icon 링크는 head에 1개여야 함'
html = LINK.sub(lambda m: m.group(1) + datauri + m.group(2), html)
(ROOT / 'index.html').write_text(html, encoding='utf-8')

app_js = (ROOT / 'app.js').read_text(encoding='utf-8')
h = hashlib.sha256()
for name in CODE_FILES:
    text = (ROOT / name).read_text(encoding='utf-8')
    if name == 'app.js':
        text = CONST.sub(r"\1\2", text)
    h.update(name.encode() + b'\0' + text.encode('utf-8') + b'\0')
version = h.hexdigest()[:12]

(ROOT / 'app.js').write_text(CONST.sub(lambda m: m.group(1) + version + m.group(2), app_js), encoding='utf-8')
(ROOT / 'version.json').write_text(json.dumps({'version': version}) + '\n', encoding='utf-8')
print(version)
