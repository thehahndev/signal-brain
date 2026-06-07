export type SourceType = 'x' | 'youtube' | 'article' | 'pdf' | 'other';

/** A captured item, fetched + cleaned, ready to feed the ranking call. */
export interface Item {
  id: string;
  source_type: SourceType;
  url: string;
  adapter: string;
  title: string;
  /** Cleaned, boilerplate-stripped body. */
  text: string;
  /** True if the capture looks like a deleted/missing page, not real content. */
  fetch_miss: boolean;
}

export type Verdict = 'read' | 'skim' | 'bury';
export type SignalOrHype = 'signal' | 'hype';

/** One ranked item, as returned by the structured Claude call. */
export interface RankedItem {
  id: string;
  score: number; // 0–100
  signal_or_hype: SignalOrHype;
  verdict: Verdict;
  opportunity_flag: boolean;
  cluster_id: number;
  why: string;
  key_claims: string[];
}

export interface RankResult {
  items: RankedItem[];
}
