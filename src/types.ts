export interface AudioQuote {
  id: number;
  quote: string;        // বাংলা উক্তি
  audioUrl: string;     // Direct audio link or uploaded audio file
  sourceUrl?: string;   // Archival source or reference link
  date?: string;        // Recording date / time
  verified: boolean;    // Archival verification flag
  enabled?: boolean;    // Active in public rotation
  order?: number;       // Ordering
  audioType?: 'direct' | 'upload' | 'embed';
  embedProvider?: 'youtube' | 'soundcloud' | 'archive' | 'other';
  notes?: string;
  createdAt?: string;
}

export interface SiteConfig {
  portraitUrl: string | null;
  placeholderUsed: boolean;
  themeSongUrl?: string | null;
  title: string;
  subtitle: string;
  updatedAt?: string;
  activeClipsCount?: number;
  draftClipsCount?: number;
  totalClipsCount?: number;
}

export type PlaybackStatus = 'idle' | 'buffering' | 'playing' | 'paused' | 'error';
