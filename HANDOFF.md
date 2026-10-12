# HANDOFF: 구내식당 식단 안내 웹앱 (menu-web)

- 저장소: https://github.com/woowook-pixel/menu-web (공개, 기본 브랜치 `main`)
- 사이트: https://woowook-pixel.github.io/menu-web/ (GitHub Pages, `main` / root)
- 사용자: 한국어로 소통. 기능은 단순하게 유지하는 쪽을 선호합니다(AI·DB·서버 없이 가자는 결정을 사용자가 직접 내림).

## 지금까지 한 일

1. 처음 요구는 React + 서버리스 + Claude 비전 파싱이었습니다. 사용자가 "DB·AI 필요 없다, 단순하게"로 방향을 바꿨고, 이어 파이썬(Flask) 버전을 거쳐 **서버 없는 정적 웹앱**으로 확정했습니다. 앞의 두 버전은 버렸고 이 저장소에 없습니다.
2. 현재 구조 (빌드 도구 없음, 순수 HTML/JS/CSS)
   - `index.html`: 각 화면이 `BITE` 상단 바를 직접 그림, 글자만 있는 하단 탭 2개(오늘 / 이번 주), 시트형 확인창
   - `app.js`: 해시 라우팅 `#/`, `#/week`, `#/upload`. KST 날짜 계산, CSS 배경으로 칸 자르기, 업로드 편집기, GitHub Contents API 저장
   - `style.css`: 중앙 공통 CSS(`https://personal-design-rho.vercel.app/v1/tokens.css`, 버전 기록은 `design/APPLIED.md`) 위에 얹는 Bite 전용 스타일. 모서리·그림자·원형 없음, 라이트 모드만. Bite 적용 기준은 `design/BITE.md`
   - `index.html`의 apple-touch-icon은 data 주소(`icon-180.png`를 base64로 변환)입니다. iOS 홈 화면 아이콘이 회색 글자 타일로 나오는 문제를 피하려는 것이며, `icon-180.png`를 바꾸면 이 값도 다시 만들어야 함
   - `sw.js`: PWA 캐시. 이미지는 캐시 우선이라 아이콘·이미지를 바꾸면 `CACHE` 이름(현재 `menu-v4`)과 `?v=` 값(현재 4)을 올려야 함
   - `config.js`: 저장소 이름. 비워 두면 Pages 주소에서 자동 인식
   - `data/index.json` + `data/<월요일>.jpg`: 주별 원본 사진 1장과 열 경계(layout 비율), 휴무일
3. 화면
   - **오늘**: 오늘 메뉴 칸만 크게 표시. 주말이거나 식단이 없으면 "다음 주 식단은 일요일 저녁에 올라옵니다"
   - **이번 주**: 월~금 밑줄 탭(오늘 탭에 Ember 점)으로 날을 고르면 아래에 그날 메뉴를 크게 표시. 다음 주가 올라와 있으면 상단 → 로 이동. 지난 주는 볼 수 없음
   - **업로드**(`#/upload`, 주간 탭 맨 아래 링크): 담당자가 fine-grained GitHub 토큰을 브라우저에 한 번 입력. 사진 선택(촬영·갤러리·드래그·붙여넣기) → 경계선 드래그(직전 layout을 불러옴) → 1600px/JPEG 0.85로 줄임 → 사진과 `index.json`을 커밋. 같은 주가 있으면 덮어쓰기 확인
   - 저장할 때 **이번 주보다 이전 주는 목록과 사진 모두 자동 삭제**(사용자 요청: 이력 불필요)
4. 앱 이름은 Bite. 아이콘은 `design/icons/bite*` 파일(`icon.svg`, `icon-180/192/512.png`로 복사해 사용)
5. 실제 운영: 사용자가 2026-09-28 주 식단을 사이트에서 직접 올렸고, GitHub 저장이 정상 동작함을 확인함

## 남은 일 / 미결정

- [ ] **토큰 → PIN 전환 여부**: 사용자가 "토큰이 필요하냐"고 물어서, 토큰을 PIN으로 암호화해 `config.js`에 넣는 방안을 제안함. 공개 저장소라 짧은 PIN은 대입 공격에 약하다는 트레이드오프를 설명했고, 사용자 답은 아직 없음
- [ ] 2026-09-28 주 사진의 맨 왼쪽에 이전 표 글자가 몇 픽셀 걸쳐 있음. 다음 업로드 때 왼쪽 경계선을 조금 안쪽으로 당기면 해결(코드 수정 불필요)
- [ ] 다음 주 업로드가 실제로 일어나면 지난 주 자동 삭제가 GitHub에서도 동작했는지 확인(모의 API로만 검증됨)

## 다음에 할 첫 작업

`git pull` 후 `data/index.json`과 사이트 상태를 확인하고, 사용자에게 **토큰 대신 PIN 방식으로 바꿀지** 물어 답에 따라 진행합니다. 새 주 데이터가 커밋돼 있으면 지난 주 사진이 지워졌는지도 함께 확인합니다.

## 작업 메모

- 로컬 확인: `python -m http.server 8000` → `http://localhost:8000`. localhost에서는 저장소 자동 인식이 안 되므로 업로드 흐름을 시험할 때는 페이지에서 `window.MENU_CONFIG.repo`를 설정하고 `api.github.com` 호출을 가짜 fetch로 대신해서 검증했습니다. **실제 저장소에 테스트 커밋을 하지 마세요.**
- 사이트에서 담당자가 올리면 원격에 커밋이 생깁니다. 푸시 전에 항상 `git fetch` 후 `rebase origin/main` 하세요.
- 커밋 작성자는 css@pittasoft.com이고, 메시지는 한국어입니다.
- 환경변수와 비밀값은 없습니다. 담당자 토큰은 각자 브라우저 localStorage(`menu.ghToken`)에만 있습니다.
