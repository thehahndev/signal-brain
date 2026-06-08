import { YoutubeTranscript } from 'youtube-transcript';

/**
 * Fetch a YouTube transcript (locked in Phase 0: free, 2/2 on the spike corpus).
 * Returns the concatenated transcript text — there's no Jina-style header, so clean()
 * treats the whole string as the body. Throws if the video has no transcript.
 */
export async function fetchYoutubeTranscript(url: string): Promise<string> {
  const parts = await YoutubeTranscript.fetchTranscript(url);
  const text = parts
    .map((p) => p.text)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!text) throw new Error('Empty transcript');
  return text;
}
