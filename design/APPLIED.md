# 적용 중인 공통 디자인

- 공통 파일: design/shared (자동 동기화, 직접 고치지 않음). 정적 사이트라 같은 도메인의 `design/shared/...` 상대 경로로 링크하고, apple-touch-icon은 `scripts/stamp-version.py`가 `design/shared/icons/apple-touch-icon.datauri.txt`를 읽어 넣음(복사 스크립트·import 없음)
- 적용한 CHANGELOG 번호: 002 (상단 헤더 위치·높이 통일), 003 (새 버전 알림 띠), 004 (홈 아이콘을 중앙 픽셀 아이콘으로), 005 (기호 추가), 006 (홈 아이콘 회색 글자 수정), 009 (제목 줄 배치), 011 (워드마크 옆 작은 앱 아이콘), 012 (워드마크 옆 앱 캐릭터)
