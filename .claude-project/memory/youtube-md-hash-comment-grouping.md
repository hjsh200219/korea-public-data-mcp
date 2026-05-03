---
name: youtube-md-hash-comment-grouping
description: youtube.md — # 주석으로 채널 카테고리 그룹핑, parseYoutubeMdChannels가 자동 무시
type: reference
created: 2026-05-03
---

`youtube.md`는 `# 카테고리명` 형식의 주석 줄로 채널을 그룹핑할 수 있다.
`parseYoutubeMdChannels()` 함수는 `youtube.com/@` 패턴만 추출하므로 `#` 주석 줄은 자동으로 무시된다.

**현재 카테고리 구조**:
- `# IT/기술 리뷰` — ITSUB, gwigom, techmong, the-edit, bgsreview, zuyoni, HGHLab
- `# 뷰티/패션` — RISABAE, calarygirl, PONYSyndrome, clarins_unni
- `# 음식/먹방` — EatwithBoki
- `# 라이프스타일` — Gajoo, JANGPS
- `# 크리에이티브/편집` — hyojin94517, the-edit-life, director_pihyunjung

**Why:** 채널 수가 늘어남에 따라 가독성을 위해 카테고리 그룹핑이 필요하며, 파싱 함수 수정 없이 주석만으로 구분 가능하다.
**How to apply:** `youtube.md`에 새 채널 추가 시 적절한 `#` 카테고리 아래에 `https://www.youtube.com/@handle` 형식으로 추가. 주석 줄은 파싱에 영향 없음.
