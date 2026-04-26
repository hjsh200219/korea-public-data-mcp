---
name: youtube-transcript-api-v1-migration
description: youtube-transcript-api v1.0+ API 변경 (정적 메서드 → 인스턴스 메서드)
type: reference
created: 2026-04-26
---

v1.0부터 `YouTubeTranscriptApi.get_transcript()` 정적 메서드가 제거되고 인스턴스 메서드 `fetch()`로 변경됨.

```python
# v0.x (구버전)
data = YouTubeTranscriptApi.get_transcript(video_id, languages=['ko'])

# v1.0+ (현재)
api = YouTubeTranscriptApi()
fetched = api.fetch(video_id, languages=['ko'])
data = [{'text': s.text, 'start': s.start, 'duration': s.duration} for s in fetched]
lang = fetched.language_code  # 실제 추출된 언어
```

**Why:** Dockerfile에서 `pip install youtube-transcript-api`로 최신 버전 설치하면 v1.0+가 잡혀서 구 API 사용 시 `AttributeError`.

**How to apply:** `src/youtube-api.ts`의 Python 스크립트는 `hasattr(YouTubeTranscriptApi, 'fetch')`로 양쪽 호환되게 구현되어 있음. 새 코드 작성 시 v1.0+ API 사용 권장.
