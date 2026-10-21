# HANDOFF: 구내식당 식단 안내 웹앱 (menu-web)

- 저장소: https://github.com/woowook-pixel/menu-web (공개, 기본 브랜치 `main`)
- 사이트: https://woowook-pixel.github.io/menu-web/ (GitHub Pages, `main` / root)
- 사용자: 한국어로 소통. 기능은 단순하게 유지하는 쪽을 선호합니다(AI·DB·서버 없이 가자는 결정을 사용자가 직접 내림).

## 지금까지 한 일

1. 처음 요구는 React + 서버리스 + Claude 비전 파싱이었습니다. 사용자가 "DB·AI 필요 없다, 단순하게"로 방향을 바꿨고, 이어 파이썬(Flask) 버전을 거쳐 **서버 없는 정적 웹앱**으로 확정했습니다. 앞의 두 버전은 버렸고 이 저장소에 없습니다.
2. 현재 구조 (빌드 도구 없음, 순수 HTML/JS/CSS)
   - `index.html`: 각 화면이 `BITE` 상단 바를 직접 그림, 하단 탭 없음(한 화면에서 스와이프), 시트형 확인창
   - `app.js`: 해시 라우팅 `#/`, `#/week`, `#/upload`. KST 날짜 계산, CSS 배경으로 칸 자르기, 업로드 편집기, GitHub Contents API 저장
   - `style.css`: 공통 CSS(`design/shared/tokens.css`, 자동 동기화라 직접 고치지 않음. 적용 기록은 `design/APPLIED.md`) 위에 얹는 Bite 전용 스타일. 모서리·그림자·원형 없음, 라이트 모드만. Bite 적용 기준은 `design/BITE.md`
   - 아이콘: favicon·manifest는 `design/shared/icons/`를 가리키고, apple-touch-icon은 `scripts/stamp-version.py`가 `design/shared/icons/apple-touch-icon.datauri.txt`를 읽어 index.html에 그대로 넣음(head에 1개)
   - 새 버전 알림: `scripts/stamp-version.py`가 앱 코드(공통 파일 `design/shared/tokens.css`, `symbols.js` 포함) 해시를 `version.json`과 `app.js`의 `APP_VERSION`에 기록. 코드를 바꾸면 이 스크립트를 실행해 함께 커밋하고(안 해도 `.github/workflows/stamp-version.yml`이 main 푸시 후 대신 커밋), 사진 업로드(data/)는 영향 없음
   - `sw.js`: PWA 캐시. 이미지는 캐시 우선이라 아이콘·이미지를 바꾸면 `CACHE` 이름(현재 `menu-v4`)과 `?v=` 값(현재 4)을 올려야 함
   - `config.js`: 저장소 이름. 비워 두면 Pages 주소에서 자동 인식
   - `data/index.json` + `data/<월요일>.jpg`: 주별 원본 사진 1장과 열 경계(layout 비율), 휴무일
3. 화면
   - **오늘**: 오늘 메뉴 칸만 크게 표시. 주말이거나 식단이 없으면 "다음 주 식단은 일요일 저녁에 올라옵니다"
   - **홈(`#/`)**: 열면 항상 오늘에 맞춰지고, 좌우 스와이프(scroll-snap)나 위의 날짜 밑줄 탭으로 다른 날을 봄. 올라와 있는 주의 평일 + 오늘이 슬라이드이고 지난 주는 없음. 메뉴 사진은 화면(가로·세로)에 딱 맞게 축소·확대. `#/week`는 `#/`로 이동
   - **업로드**(`#/upload`, 화면 맨 아래 링크): 담당자가 fine-grained GitHub 토큰을 브라우저에 한 번 입력. 사진 선택(촬영·갤러리·드래그·붙여넣기) → 경계선 드래그(직전 layout을 불러옴) → 1600px/JPEG 0.85로 줄임 → 사진과 `index.json`을 커밋. 같은 주가 있으면 덮어쓰기 확인
   - 저장할 때 **이번 주보다 이전 주는 목록과 사진 모두 자동 삭제**(사용자 요청: 이력 불필요)
4. 앱 이름은 Bite. 아이콘은 `design/shared/icons/bite*`
5. 실제 운영: 사용자가 2026-09-28 주 식단을 사이트에서 직접 올렸고, GitHub 저장이 정상 동작함을 확인함

## 남은 일 / 미결정

- [x] **토큰 → PIN 전환 여부**: 2026-10-02 사용자가 현행 유지(담당자가 토큰을 브라우저에 직접 입력)로 결정함. 코드 변경 없음
- [ ] 2026-09-28 주 사진의 맨 왼쪽에 이전 표 글자가 몇 픽셀 걸쳐 있음. 다음 업로드 때 왼쪽 경계선을 조금 안쪽으로 당기면 해결(코드 수정 불필요)
- [ ] 다음 주 업로드가 실제로 일어나면 지난 주 자동 삭제가 GitHub에서도 동작했는지 확인(모의 API로만 검증됨)

## 다음에 할 첫 작업

`git pull` 후 `data/index.json`을 확인합니다. 2026-10-05 주 식단이 올라와 있으면 지난 주(2026-09-28) 사진과 목록이 지워졌는지 확인합니다. 아직 없으면 다음 업로드를 기다립니다.

## 작업 메모

- 로컬 확인: `python -m http.server 8000` → `http://localhost:8000`. localhost에서는 저장소 자동 인식이 안 되므로 업로드 흐름을 시험할 때는 페이지에서 `window.MENU_CONFIG.repo`를 설정하고 `api.github.com` 호출을 가짜 fetch로 대신해서 검증했습니다. **실제 저장소에 테스트 커밋을 하지 마세요.**
- 사이트에서 담당자가 올리면 원격에 커밋이 생깁니다. 푸시 전에 항상 `git fetch` 후 `rebase origin/main` 하세요.
- 커밋 작성자는 css@pittasoft.com이고, 메시지는 한국어입니다.
- 환경변수와 비밀값은 없습니다. 담당자 토큰은 각자 브라우저 localStorage(`menu.ghToken`)에만 있습니다.
