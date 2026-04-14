/** youtube-transcript ESM 빌드 타입 선언 */
declare module "youtube-transcript/dist/youtube-transcript.esm.js" {
  export interface TranscriptResponse {
    text: string;
    offset: number;
    duration: number;
    lang?: string;
  }

  export interface TranscriptConfig {
    lang?: string;
  }

  export class YoutubeTranscript {
    static fetchTranscript(
      videoId: string,
      config?: TranscriptConfig,
    ): Promise<TranscriptResponse[]>;
  }

  export function fetchTranscript(
    videoId: string,
    config?: TranscriptConfig,
  ): Promise<TranscriptResponse[]>;
}
