# 오늘 뭐 먹지: 구내식당 식단 안내 (GitHub Pages)

서버가 없는 정적 웹앱입니다. 저장소를 GitHub에 올리고 Pages를 켜면 바로 쓸 수 있습니다.

- 직원: 오늘 탭(오늘 메뉴만 크게), 이번 주 탭(캘린더처럼 월~금 날짜 줄과 칸 미리보기, 누른 날을 크게 표시. 다음 주가 올라와 있으면 다음 주도). iOS 기본 앱 스타일입니다. 휴대폰 홈 화면에 추가할 수 있습니다(PWA). 다크모드는 시스템 설정을 따릅니다.
- 담당자: `#/upload`에서 식단표 사진을 올리고 요일 칸 경계를 맞춘 뒤 저장합니다. 브라우저가 GitHub API로 이 저장소에 사진을 커밋하고, 1~2분 뒤 사이트에 반영됩니다.
- 지난 식단은 보관하지 않습니다. 저장할 때 이번 주보다 이전 주의 사진과 목록을 자동으로 지웁니다. git 기록에는 남지만 사이트와 `data/` 폴더에서는 사라집니다.
- AI·DB·서버 없음. 데이터는 저장소의 `data/` 폴더뿐입니다.

## 파일 구조

```
index.html        화면 틀 (상단바, 하단 탭, 덮어쓰기 확인창)
app.js            모든 로직: 날짜(KST), 화면(오늘·주간·업로드), 칸 자르기(CSS), 업로드 편집기, GitHub 저장
style.css         모바일 우선, 다크모드
config.js         저장소 이름 (보통 비워 둠: Pages 주소에서 자동 인식)
sw.js             오프라인 캐시 (마지막으로 본 식단은 오프라인에서도 보임)
manifest.webmanifest, icon*.png/svg   PWA
.nojekyll         Pages가 파일을 가공하지 않게
data/
  index.json      주별 목록 { weeks: { "2026-09-28": { image, width, height, layout, closed, … } } }
  2026-09-28.jpg  원본 사진 (긴 변 1600px, JPEG 0.85). 요일 칸은 layout 비율로 화면에서 잘라 보여줌
```

## 처음 설정 (한 번만)

1. **저장소 만들기**: GitHub에서 새 저장소(예: `menu-web`)를 만들고 이 폴더 내용을 올립니다.
   ```bash
   git remote add origin https://github.com/<계정>/menu-web.git
   ```
   ```bash
   git push -u origin main
   ```
2. **Pages 켜기**: 저장소 → Settings → Pages → Source: *Deploy from a branch* → Branch: `main` / `(root)` → Save.
   1~2분 뒤 `https://<계정>.github.io/menu-web/`에서 열립니다.
   무료 계정이면 저장소가 **공개(public)** 여야 Pages를 쓸 수 있습니다. 식단 사진도 공개됩니다.
3. **담당자 토큰 만들기**: GitHub → Settings → Developer settings → [Fine-grained tokens](https://github.com/settings/personal-access-tokens/new)
   - Repository access: **Only select repositories** → 이 저장소 하나
   - Permissions → Repository → **Contents: Read and write**
   - 만료 기간은 1년 정도로 두고, 만료되면 새로 만들어 다시 입력합니다.

## 매주 할 일 (담당자)

1. 사이트 주소 뒤에 `#/upload`를 붙여 엽니다. 이번 주 탭 맨 아래 "담당자: 식단표 업로드" 링크로도 들어갈 수 있습니다.
2. 처음 한 번은 토큰을 붙여넣습니다. 그 브라우저에만 저장되고, 다른 사람에게는 보이지 않습니다.
3. 사진을 고릅니다. 촬영, 갤러리, 끌어다 놓기, 붙여넣기 모두 됩니다.
4. 주황색 선으로 요일 칸 경계와 위·아래를 맞춥니다. 지난번 위치가 그대로 불러와지므로 양식이 같으면 바로 저장하면 됩니다. 휴무일은 요일 이름을 누릅니다.
5. 주를 확인하고 저장합니다. 같은 주가 있으면 덮어쓸지 묻습니다.

## 로컬에서 보기

```bash
python -m http.server 8000
```

`http://localhost:8000`에서 열립니다. 로컬에서 업로드까지 시험하려면 `config.js`의 `repo`에 `계정/저장소`를 적습니다. 이 경우 실제 저장소에 커밋됩니다.

## 참고

- 사진을 잘라 보여주는 방식이라 메뉴 글자 검색이나 선호 메뉴 강조는 없습니다.
- 토큰은 해당 저장소의 파일 쓰기 권한만 가진 담당자용 열쇠입니다. 담당자가 바뀌면 토큰을 삭제하고 새로 발급하세요.
- 커스텀 도메인을 쓰면 저장소를 자동으로 알 수 없으니 `config.js`에 `repo`를 적어 주세요.
