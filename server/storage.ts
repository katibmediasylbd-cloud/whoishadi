import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

export interface AudioQuote {
  id: number;
  quote: string;        // বাংলা উক্তি
  audioUrl: string;     // Direct URL or uploaded file URL or embed URL
  sourceUrl: string;    // Archival reference / original source
  date: string;         // Date or year
  verified: boolean;    // Authenticity verified flag
  enabled: boolean;     // Can be toggled on/off
  order: number;        // Display/playback sequence order
  audioType: 'direct' | 'upload' | 'embed';
  embedProvider?: 'youtube' | 'soundcloud' | 'archive' | 'other';
  notes?: string;       // Admin notes
  createdAt: string;
}

export interface SiteConfig {
  portraitUrl: string | null;
  placeholderUsed: boolean;
  themeSongUrl?: string | null;
  title: string;
  subtitle: string;
  updatedAt: string;
}

export interface MemorialDatabase {
  config: SiteConfig;
  adminPasswordHash: string;
  adminSalt: string;
  clips: AudioQuote[];
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const UPLOADS_DIR = path.resolve(process.cwd(), 'uploads');
const DB_FILE = path.resolve(DATA_DIR, 'memorial-data.json');

// Ensure directories exist
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Security hashing helper
export function hashPassword(password: string, salt?: string): { hash: string; salt: string } {
  const actualSalt = salt || crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, actualSalt, 64).toString('hex');
  return { hash, salt: actualSalt };
}

export function verifyPassword(password: string, hash: string, salt: string): boolean {
  try {
    const checkHash = crypto.scryptSync(password, salt, 64).toString('hex');
    return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(checkHash, 'hex'));
  } catch {
    return false;
  }
}

export const DEFAULT_CLIPS_DATA: Partial<AudioQuote>[] = [
  { id: 1, quote: "জান দেবো, জুলাই দেবো না।", audioUrl: "https://res.cloudinary.com/ghxx4dt3/video/upload/v1791641061/Hadi_14.wav", date: "জুলাই বিপ্লব ও প্রতিরোধ" },
  { id: 2, quote: "দাসত্বই যে জমিনের নিশ্চল নিয়তি, লড়াই সেখানে সর্বোত্তম এবাদত।", audioUrl: "https://res.cloudinary.com/ghxx4dt3/video/upload/v1791641063/Hadi_1.wav", date: "লড়াই ও মুক্তি" },
  { id: 3, quote: "আমি আমার শত্রুর সাথেও ইনসাফ করতে চাই।", audioUrl: "https://res.cloudinary.com/ghxx4dt3/video/upload/v1791641059/Hadi_3.wav", date: "ইনসাফ ও ন্যায়বিচার" },
  { id: 4, quote: "মৃত্যুর ফায়সালা জমিনে না, আসমানে হয়।", audioUrl: "https://res.cloudinary.com/ghxx4dt3/video/upload/v1791641060/Hadi_6.wav", date: "ঈমান ও তাওয়াক্কুল" },
  { id: 5, quote: "জীবন যাবে তবু দেশপ্রেমের প্রশ্নে আপস করব না।", audioUrl: "https://res.cloudinary.com/ghxx4dt3/video/upload/v1791641060/Hadi_7.wav", date: "দেশপ্রেম ও আত্মত্যাগ" },
  { id: 6, quote: "পুরো দুনিয়া লিখে দিলেও দেশের সঙ্গে, জমিনের সঙ্গে গাদ্দারি করব না।", audioUrl: "https://res.cloudinary.com/ghxx4dt3/video/upload/v1791641059/Hadi_5.wav", date: "মাটি ও মানুষের প্রতি নিষ্ঠা" },
  { id: 7, quote: "আপনারা প্রতীক দেখে নয়, প্রার্থী দেখে ভোট দেবেন।", audioUrl: "https://res.cloudinary.com/ghxx4dt3/video/upload/v1791641060/Hadi_9.wav", date: "নির্বাচনী চেতনা" },
  { id: 8, quote: "নির্বাচন করলে জিতবো এটি প্রথম কথা নয়।", audioUrl: "https://res.cloudinary.com/ghxx4dt3/video/upload/v1791641060/Hadi_11.wav", date: "মূল্যবোধের রাজনীতি" },
  { id: 9, quote: "তবে রাজনীতিতে তরুণদের সামনে নিতে চাই।", audioUrl: "https://res.cloudinary.com/ghxx4dt3/video/upload/v1791641062/Hadi_16.wav", date: "তরুণ নেতৃত্ব" },
  { id: 10, quote: "লম্বা সময় রাজনীতি করতে আসিনি, রাজনীতির গতিপথ পরিবর্তনের জন্য আসছি।", audioUrl: "https://res.cloudinary.com/ghxx4dt3/video/upload/v1791641060/Hadi_12.wav", date: "রাজনৈতিক সংস্কার" },
  { id: 11, quote: "আমি মানুষের কাছ থেকেই শক্তি নিই।", audioUrl: "https://res.cloudinary.com/ghxx4dt3/video/upload/v1791641059/Hadi_4.wav", date: "জনসম্পৃক্ততা" },
  { id: 12, quote: "নতুন বাংলাদেশের প্রথম ভোট ইনসাফ ও সততার পক্ষে হোক।", audioUrl: "https://res.cloudinary.com/ghxx4dt3/video/upload/v1791641060/Hadi_10.wav", date: "নতুন বাংলাদেশ" },
  { id: 13, quote: "জুলাইয়ের সবচেয়ে বড় শরিক হলেন শহীদ ও আহত যারা।", audioUrl: "https://res.cloudinary.com/ghxx4dt3/video/upload/v1791641059/Hadi_2.wav", date: "শহীদ ও আহতদের ঋণ" },
  { id: 14, quote: "এখানকার মানুষ ধর্মকে ভালোবাসে, ধর্মীয় ভ্যালুজকে মূল্যায়ন করে।", audioUrl: "https://res.cloudinary.com/ghxx4dt3/video/upload/v1791641061/Hadi_13.wav", date: "সামাজিক মূল্যবোধ" },
  { id: 15, quote: "আমি খুবই অনার্ড, একজন রিকশাচালকের সঙ্গে কমপিট করতে পারছি।", audioUrl: "https://res.cloudinary.com/ghxx4dt3/video/upload/v1791641063/Hadi_17.wav", date: "বিনয় ও সাম্য" },
  { id: 16, quote: "আমরা ন্যায়ভিত্তিক রাষ্ট্র গঠনের স্বপ্ন দেখি।", audioUrl: "https://res.cloudinary.com/ghxx4dt3/video/upload/v1791641062/Hadi_15.wav", date: "ন্যায়ভিত্তিক রাষ্ট্র" },
  { id: 17, quote: "শেষ নিঃশ্বাস পর্যন্ত আমাদের লড়াই চলবে, হাসবিয়াল্লাহ।", audioUrl: "https://res.cloudinary.com/ghxx4dt3/video/upload/v1791641060/Hadi_8.wav", date: "অবিচল সংকল্প" },
  { id: 18, quote: "আমরা কোনো দলের লোক না, আমরা জনগণের লোক।", audioUrl: "https://res.cloudinary.com/ghxx4dt3/video/upload/v1791641963/cartesia_2026-10-10T14_17_20Z_Hadi_sonic-3.6_bn.wav", date: "গণরাজনীতি" },
  { id: 19, quote: "৫৬ হাজার বর্গমাইল জুড়ে একদিন করবো আমরা ইনসাফের চাষাবাদ। ইনশাআল্লাহ।", audioUrl: "https://res.cloudinary.com/ghxx4dt3/video/upload/v1791641964/cartesia_2026-10-10T14_18_44Z_Hadi_sonic-3.6_bn.wav", date: "ইনসাফের বাংলাদেশ" },
  { id: 20, quote: "লুটতরাজ রুখে দিন, প্রতীক নয়, প্রার্থী দেখে ভোট দিন।", audioUrl: "https://res.cloudinary.com/ghxx4dt3/video/upload/v1791641963/cartesia_2026-10-10T14_17_56Z_Hadi_sonic-3.6_bn.wav", date: "লুটতন্ত্রবিরোধী প্রতিরোধ" }
];

export function buildDefaultCandidateClips(): AudioQuote[] {
  const now = new Date().toISOString();
  return DEFAULT_CLIPS_DATA.map((item, idx) => ({
    id: item.id || idx + 1,
    quote: item.quote || "",
    audioUrl: item.audioUrl || "",
    sourceUrl: "",
    date: item.date || "",
    verified: true,
    enabled: true,
    order: idx + 1,
    audioType: "direct",
    notes: item.audioUrl ? "শহীদ ওসমান হাদীর মূল কণ্ঠরেকর্ড সংযুক্ত" : "মূল উক্তি",
    createdAt: now,
  }));
}

// Initial default state
const initialData: MemorialDatabase = {
  config: {
    portraitUrl: 'https://res.cloudinary.com/ghxx4dt3/image/upload/v1791639922/Hadi_35.jpg',
    placeholderUsed: false,
    themeSongUrl: 'https://res.cloudinary.com/ghxx4dt3/video/upload/v1791638857/who_is_hadi.mp3',
    title: 'WHO IS HADI?',
    subtitle: "HADI'S VOICE. HADI'S WORDS. HADI'S LEGACY.",
    updatedAt: new Date().toISOString(),
  },
  adminPasswordHash: '',
  adminSalt: '',
  clips: buildDefaultCandidateClips(),
};

// Set initial admin password: 'hadi2026'
const defaultPass = hashPassword('hadi2026');
initialData.adminPasswordHash = defaultPass.hash;
initialData.adminSalt = defaultPass.salt;

export function loadDatabase(): MemorialDatabase {
  try {
    if (fs.existsSync(DB_FILE)) {
      const content = fs.readFileSync(DB_FILE, 'utf-8');
      const parsed = JSON.parse(content);
      const clips = (Array.isArray(parsed.clips) && parsed.clips.length > 0)
        ? parsed.clips
        : buildDefaultCandidateClips();

      const loaded: MemorialDatabase = {
        ...initialData,
        ...parsed,
        clips,
        config: {
          ...initialData.config,
          ...(parsed.config || {}),
        },
      };

      if (!parsed.clips || parsed.clips.length === 0) {
        saveDatabase(loaded);
      }

      return loaded;
    }
  } catch (err) {
    console.error('Error reading database, creating default:', err);
  }
  saveDatabase(initialData);
  return initialData;
}

export function saveDatabase(data: MemorialDatabase): void {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error writing to database:', err);
  }
}

// In-memory active tokens
const activeSessions = new Set<string>();

export function createSessionToken(): string {
  const token = crypto.randomBytes(32).toString('hex');
  activeSessions.add(token);
  return token;
}

export function isValidSession(token: string): boolean {
  if (!token) return false;
  return activeSessions.has(token);
}

export function revokeSession(token: string): void {
  activeSessions.delete(token);
}
