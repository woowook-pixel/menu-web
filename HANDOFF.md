# HANDOFF: 구내식당 식단 안내 웹앱 "Bite" (menu-web)

- 저장소: https://github.com/woowook-pixel/menu-web (공개, 기본 브랜치 `main`)
- 사이트: https://woowook-pixel.github.io/menu-web/ (GitHub Pages, `main` / root, 하위 경로 배포)
- 사용자: 한국어로 소통합니다. 기능은 단순하게 유지하는 쪽을 선호합니다(AI·DB·서버 없이 가자는 결정을 사용자가 직접 내림).
- 마지막 갱신: 2026-10-21 (세션을 다른 Claude 계정으로 옮기기 위해 작성)

## 1. 프로젝트 목적

회사 구내식당의 주간 식단표 사진을 올리면, 직원이 휴대폰에서 오늘 메뉴를 바로 보는 정적 웹앱입니다.
- 직원: 앱을 열면 오늘 메뉴. 좌우 스와이프로 다른 날 메뉴. 홈 화면에 추가해 앱처럼 씁니다(PWA).
- 담당자: 브라우저에서 식단표 사진을 올립니다. 사진 속 메뉴를 글자로 뽑지 않고(OCR 안 함) **사진을 그대로** 보여줍니다.
- 개인 앱 패밀리(Bite, Script, Wayly, Lexi, Pitch, Strum)의 공통 디자인을 따릅니다. Bite가 이 저장소입니다.

## 2. 구조 (빌드 도구 없음, 순수 HTML/JS/CSS)

| 파일 | 역할 |
|---|---|
| `index.html` | 화면 틀. head에 공통 CSS·기호·아이콘 링크, 새 버전 띠(`#update`), 덮어쓰기 확인창. 하단 탭바 없음 |
| `app.js` | 해시 라우팅 `#/`(홈), `#/upload`(담당자). `#/week`는 `#/`로 이동. KST 날짜 계산, 사진을 CSS 배경으로 칸 자르기(`crop()`), 홈 슬라이드, 업로드 편집기, GitHub Contents API 저장, 새 버전 확인 |
| `style.css` | Bite 전용 스타일(공통 CSS 위에 얹음). 모서리·그림자·원형 없음, 라이트 모드만 |
| `sw.js` | 서비스 워커. 사진·아이콘은 캐시 우선, HTML/JS/CSS는 네트워크 우선(`no-cache`), `version.json`은 가로채지 않음. 현재 캐시 이름 `menu-v4` |
| `config.js` | 저장소 이름(비워 두면 Pages 주소에서 자동 인식) |
| `manifest.webmanifest` | PWA. 아이콘은 `design/shared/icons/` |
| `version.json` + `APP_VERSION`(app.js) | 새 버전 알림용. 앱 코드 해시(12자리). 사진 업로드(`data/`)로는 안 바뀜 |
| `scripts/stamp-version.py` | 위 두 값을 계산해 기록하고, `index.html`의 apple-touch-icon에 `design/shared/icons/apple-touch-icon.datauri.txt`를 그대로 삽입(head에 1개) |
| `.github/workflows/stamp-version.yml` | 앱 코드나 `design/shared/**`가 main에서 바뀌면 같은 스크립트를 실행하고, 값이 바뀐 경우에만 "버전 갱신" 커밋 |
| `data/index.json`, `data/<월요일>.jpg` | 주별 원본 사진 1장과 열 경계(layout 비율), 휴무일. 담당자가 올릴 때마다 커밋됨 |
| `design/shared/` | 공통 디자인(tokens.css, symbols.js, 아이콘, 캐릭터 GIF, DESIGN.md, CHANGELOG.md). **personal-design 저장소에서 자동 동기화 PR로 덮어쓰므로 직접 고치지 않음** |
| `design/BITE.md`, `design/APPLIED.md` | Bite 적용 기준, 적용한 CHANGELOG 번호 기록 |

현재 데이터: `data/index.json`에 2026-10-12, 2026-10-19 주가 있습니다. 2026-10-12 주는 이미 지난 주라 화면에는 안 나오고, 다음 업로드 때 자동 삭제됩니다.

## 3. 화면 동작

- **홈(`#/`)**: 열면(그리고 앱으로 돌아오면) 항상 오늘에 맞춰짐. 슬라이드는 올라와 있는 주의 평일 + 오늘(주말이어도). 좌우 스와이프(CSS scroll-snap)나 위쪽 날짜 밑줄 탭으로 이동. 오늘이 아닌 날을 볼 때만 오른쪽 위 "오늘" 버튼 표시. 사진은 컨테이너 쿼리(`cqw`, `cqh`)로 화면에 딱 맞게 축소·확대. 메뉴 없는 날은 "메뉴가 없습니다."(휴무는 "휴무"), 주말 안내 문구는 "다음 주 식단은 일요일 저녁에 올라옵니다".
- **업로드(`#/upload`, 홈 맨 아래 "담당자: 식단표 업로드")**: 담당자가 fine-grained GitHub 토큰을 브라우저에 한 번 입력(localStorage `menu.ghToken`). 사진 선택(촬영·갤러리·드래그·붙여넣기) → 경계선 드래그(직전 layout 불러옴) → 1600px/JPEG 0.85로 줄임 → 사진과 `index.json` 커밋. 같은 주가 있으면 덮어쓰기 확인. 저장할 때 **이번 주보다 이전 주는 목록과 사진을 자동 삭제**(사용자 요청: 이력 불필요).
- **새 버전 띠**: 열 때, 앱으로 돌아올 때, 5분마다 `version.json`을 `no-store`로 받아 `APP_VERSION`과 비교. 다르면 띠 표시. "나중에"는 이번 세션 동안 같은 버전을 다시 안 띄움. "새로고침"은 서비스 워커 업데이트 후 reload. 못 받으면 아무것도 안 띄움.

## 4. 확정된 결정 사항

- AI·DB·서버 없는 정적 웹앱. React/서버리스/Claude 비전 파싱안과 Flask 안은 버림.
- 업로드 인증은 **현행 유지: 담당자가 GitHub 토큰을 브라우저에 직접 입력**(PIN 방식으로 바꾸지 않음. 공개 저장소라 짧은 PIN은 대입 공격에 약함). 사용자가 2026-10-02에 선택.
- 지난 주 식단은 보관하지 않음.
- 메뉴는 사진 그대로(원본 색 유지, 흑백 처리 안 함). 텍스트 추출 기능을 만들지 않음.
- 라이트 모드만(다크모드 제거). 오류·경고는 빨강 대신 상단 검정 2px 선 + 굵은 글씨.
- UI는 "오늘 / 이번 주" 탭을 없애고 한 화면(오늘 고정 + 스와이프)으로. 제목은 30px(`.day-title`)로 줄임(앱 예외, 사진 영역 확보).
- 아래 항목은 사용자가 따로 답하지 않은 채 PR이 머지됐습니다. 필요하면 다시 물어보세요: 이번 주의 지난 날도 스와이프로 볼 수 있음 / 사진을 누르면 원본이 새 탭에 열림 / 주말 문구에서 "쉬는 날" 표현 삭제 / 다크모드 제거.
- Ember(#FF7A3D)는 "오늘" 표시에만. border-radius 0, 원형·그림자 금지, 터치 영역 44px 이상.
- 공통 파일은 중앙 주소 링크 대신 **같은 도메인의 `design/shared/` 상대 경로**(하위 경로 배포라 앞에 빗금 없음). 중앙 주소(`personal-design-rho.vercel.app`)는 코드에서 제거됨(`design/shared/` 안 문서에만 남음, 그대로 둠).
- 홈 화면 아이콘(apple-touch-icon)은 파일 주소 대신 **data 주소를 HTML에 직접 삽입**(iOS가 파일 주소 아이콘을 못 받아 회색 글자 타일이 나오던 문제의 유일한 해결책). 값은 손으로 옮기지 말고 `scripts/stamp-version.py`가 파일에서 읽어 넣음.

적용한 공통 CHANGELOG: 002, 003, 004, 005, 006, 009, 011, 012, 013 (`design/APPLIED.md`). 007(자동 복사 방식)은 `design/shared` 전환으로, 008(아이콘 스타일 되돌림)·010(tokens.css 정리)은 자동 동기화로 반영됨.

## 5. PR 현황 (2026-10-21 기준)

### 열린 PR
| PR | 목적 | 상태 |
|---|---|---|
| [#1](https://github.com/woowook-pixel/menu-web/pull/1) `claude/optimistic-wozniak-gpe9cg` | 예전 HANDOFF.md 갱신(토큰 방식 유지 결정 기록). 내용이 이 문서에 흡수됨 | **폐기 가능** (머지하면 이 문서를 옛 내용으로 덮을 위험) |
| [#5](https://github.com/woowook-pixel/menu-web/pull/5) `fix/home-icon` | apple-touch-icon을 `apple-touch-icon.png` 파일로 이동 | **폐기 가능** (이후 data 주소 방식으로 대체됨. 대상 파일 `icon-180.png`도 이미 삭제되어 충돌) |
| 이 HANDOFF PR `docs/handoff-update` | HANDOFF.md 한 파일만 갱신 | **머지 예정** |

공통 디자인 자동 동기화 PR("공통 디자인 동기화 (#N)")은 personal-design 저장소의 Action이 만들며 보통 사용자가 바로 머지합니다. 열려 있어도 `design/shared/`만 바꾸는 PR이면 머지해도 안전합니다.

### 머지 끝난 PR(참고)
#2 family-ui, #3 중앙 CSS, #4 헤더 002, #6·#9 아이콘 data 주소, #7 003/004, #8 005, #10 한 화면 스와이프, #15 design/shared 전환+009, #18 011, #21 012, #25 013.

정리 가능한 원격 브랜치(모두 머지됨): `design/central-tokens`, `design/family-ui`, `design/header-002`, `feat/changelog-003-004`, `feat/changelog-005-006`, `feat/changelog-009-shared`, `feat/changelog-011-brand-icon`, `feat/changelog-012-character`, `feat/changelog-013`, `feat/swipe-today`, `fix/home-icon-data-uri-006`, `fix/ios-icon-data-uri`. `fix/home-icon`과 `claude/optimistic-wozniak-gpe9cg`는 #5, #1이 닫힌 뒤 정리.

## 6. 진행 중인 작업과 다음 할 일

진행 중인 코드 작업은 없습니다. 마지막으로 머지된 작업은 CHANGELOG 013(상단 캐릭터 40x28)입니다.

- [ ] **실기기 확인(사용자만 가능)**: iOS에서 "홈 화면에 추가"한 아이콘이 나오는지(회색 글자 타일이 아닌지). 사용자가 결과를 아직 알려 주지 않았습니다. 확인할 때는 기존 홈 화면 항목을 지우고 Safari에서 다시 추가해야 합니다. 안 나오면 원인은 파일 경로·캐시·배포 보호가 아님(다른 앱에서 이미 제외됨). data 주소가 head에 1개로 들어 있는지부터 확인.
- [ ] 실기기에서 스와이프 감촉, 상단 캐릭터 GIF 움직임, 새 버전 띠 모양 확인(이 세션에서는 헤드리스 브라우저로만 검증).
- [ ] **CHANGELOG 001(배치 규칙)** 미확인: 하위 화면은 상단 왼쪽을 "← 상위 화면 이름"으로, 시트는 제목 오른쪽 "닫기" + 맨 아래 주 버튼. Bite의 업로드 화면은 지금 왼쪽 워드마크 + 오른쪽 "닫기"이고, 덮어쓰기 확인창은 "취소/덮어쓰기" 텍스트 버튼이라 규칙과 다를 수 있음. `design/shared/CHANGELOG.md` 001과 `DESIGN.md` 9장을 보고 맞출지 사용자에게 확인.
- 2026-10-12 주 사진은 지난 주라 다음 업로드 때 자동 삭제됩니다. 삭제 동작은 2026-10-19 업로드 때 `data/2026-10-05.jpg`가 지워진 커밋(e57c4ee)으로 실제 GitHub에서도 확인됨(예전 미확인 항목 완료).
- 새 공통 CHANGELOG가 오면: `design/shared/CHANGELOG.md`를 읽고 이 앱에 해당하는 것만 적용 → `design/APPLIED.md`에 번호 추가 → `python3 scripts/stamp-version.py` 실행 후 함께 커밋 → PR.

## 7. 주의할 점

- **`design/shared/`는 직접 고치지 마세요.** 자동 동기화가 덮어씁니다. 앱만의 예외는 `style.css`에 둡니다.
- 코드(`index.html`, `app.js`, `style.css`, `sw.js`, `config.js`, `manifest.webmanifest`, `design/shared/tokens.css`, `symbols.js`)를 바꾸면 `python3 scripts/stamp-version.py`를 실행해 `version.json`, `app.js`, `index.html`을 함께 커밋하세요(안 해도 Action이 대신 커밋하지만 PR에 넣는 편이 깔끔).
- apple-touch-icon 링크는 head에 정확히 1개여야 하고(아니면 스크립트가 실패), 문자열을 손으로 옮기지 마세요(전에 옮겨 적다 PNG가 깨진 적 있음).
- 이미지·아이콘을 바꾸면 `sw.js`의 `CACHE` 이름을 올려야 합니다(사진·아이콘은 캐시 우선).
- 로컬 확인: `python3 -m http.server <포트>` 후 `http://localhost:<포트>`. **서버는 포트로 종료**(`lsof -ti:<포트> | xargs -r kill`). `pkill`이나 이름으로 죽이면 실행 중인 셸까지 종료됩니다.
- 로컬에서는 저장소 자동 인식이 안 되므로 업로드 흐름은 `config.js` 응답을 `repo: 'x/y'`로 바꾸고 `api.github.com`을 가짜 응답으로 대신해 검증하세요(서비스 워커가 방해하면 브라우저 컨텍스트에서 막기). **실제 저장소에 테스트 커밋을 하지 마세요.**
- 세션 환경: 중앙 주소와 `*.github.io`는 프록시에 막혀 접속되지 않을 수 있고, iOS 기기 확인도 불가. 배포 확인은 사용자가 합니다. GitHub 푸시는 Claude GitHub App이 `woowook-pixel` 계정에 설치돼 있어야 하며, 처음에는 설치 전이라 403이 났었습니다(현재는 해결됨).
- 사이트에서 담당자가 올리면 원격 `main`에 커밋이 생깁니다. 푸시 전에 항상 `git fetch` 후 `origin/main` 위에서 작업하세요. 이미 머지된 PR의 브랜치에 이어서 커밋하면 `main`에 안 들어갑니다(실제로 한 번 발생해 새 브랜치로 다시 올림).
- 사용자가 요청하지 않으면 PR을 만들지 않습니다. 요청에는 보통 "새 브랜치에서 작업하고 PR을 열어 달라"가 포함되어 있습니다.
- 커밋 메시지는 한국어이고 끝에 `Co-Authored-By`, `Claude-Session` 줄을 붙입니다. 커밋 작성자는 css@pittasoft.com.
- 환경변수와 비밀값은 없습니다. 담당자 토큰은 각자 브라우저 localStorage에만 있습니다.
