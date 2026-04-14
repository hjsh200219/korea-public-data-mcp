/**
 * YouTube 자막 + Data API v3 타입 정의
 */

/** youtube-transcript 패키지 반환 세그먼트 */
export interface TranscriptSegment {
  text: string;
  offset: number;
  duration: number;
  lang?: string;
}

/** 자막 추출 결과 */
export interface TranscriptResult {
  videoId: string;
  title?: string;
  segments: TranscriptSegment[];
  fullText: string;
  language?: string;
  segmentCount: number;
}

/** YouTube Data API v3 — 영상 메타데이터 */
export interface VideoMetadata {
  videoId: string;
  title: string;
  description: string;
  channelTitle: string;
  channelId: string;
  publishedAt: string;
  tags?: string[];
  viewCount: number;
  likeCount: number;
  commentCount: number;
  duration: string;
  thumbnailUrl: string;
}

/** YouTube Data API v3 — 검색 결과 아이템 */
export interface SearchResultItem {
  videoId: string;
  title: string;
  description: string;
  channelTitle: string;
  publishedAt: string;
  thumbnailUrl: string;
}

/** YouTube Data API v3 — 검색 결과 */
export interface SearchResult {
  query: string;
  totalResults: number;
  items: SearchResultItem[];
}

/** YouTube Data API v3 — 댓글 */
export interface CommentItem {
  author: string;
  text: string;
  likeCount: number;
  publishedAt: string;
}

/** YouTube Data API v3 — 댓글 결과 */
export interface CommentsResult {
  videoId: string;
  totalResults: number;
  items: CommentItem[];
}
