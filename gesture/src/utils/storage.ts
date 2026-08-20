export interface HighScoreRecord {
  id: string;
  name: string;
  score: number;
  maxCombo: number;
  survivalTimeSeconds: number;
  level: number;
  date: string;
  checksum: string;
}

const STORAGE_KEY = 'finger_rush_high_scores_v1';
const SECRET = 'FR_SALT_2026_ESPORTS';

function generateChecksum(score: number, maxCombo: number, level: number): string {
  const str = `${score}:${maxCombo}:${level}:${SECRET}`;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return hash.toString(16);
}

export function getHighScores(): HighScoreRecord[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return getInitialDefaultScores();
    const parsed: HighScoreRecord[] = JSON.parse(data);

    // Filter valid records
    const valid = parsed.filter((rec) => {
      const expected = generateChecksum(rec.score, rec.maxCombo, rec.level);
      return rec.checksum === expected;
    });

    // If any tampered, return valid sorted
    return valid.sort((a, b) => b.score - a.score).slice(0, 10);
  } catch {
    return getInitialDefaultScores();
  }
}

export function saveHighScore(
  name: string,
  score: number,
  maxCombo: number,
  survivalTimeSeconds: number,
  level: number
): HighScoreRecord[] {
  const scores = getHighScores();
  const newRecord: HighScoreRecord = {
    id: 'score_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
    name: name.trim().toUpperCase() || 'ANONYMOUS PLAYER',
    score,
    maxCombo,
    survivalTimeSeconds,
    level,
    date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    checksum: generateChecksum(score, maxCombo, level),
  };

  scores.push(newRecord);
  scores.sort((a, b) => b.score - a.score);
  const top10 = scores.slice(0, 10);

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(top10));
  } catch (e) {
    console.error('Failed to save high scores:', e);
  }

  return top10;
}

function getInitialDefaultScores(): HighScoreRecord[] {
  const defaults = [
    { name: 'CYBER_ACE', score: 45000, maxCombo: 12, survivalTimeSeconds: 145, level: 5 },
    { name: 'NEON_FINGER', score: 32500, maxCombo: 9, survivalTimeSeconds: 120, level: 4 },
    { name: 'ORB_MASTER', score: 24000, maxCombo: 7, survivalTimeSeconds: 98, level: 3 },
    { name: 'SPEED_RUNNER', score: 18500, maxCombo: 6, survivalTimeSeconds: 82, level: 2 },
    { name: 'ROOKIE_HAND', score: 12000, maxCombo: 4, survivalTimeSeconds: 60, level: 1 },
  ];

  return defaults.map((item, idx) => ({
    id: `default_${idx}`,
    name: item.name,
    score: item.score,
    maxCombo: item.maxCombo,
    survivalTimeSeconds: item.survivalTimeSeconds,
    level: item.level,
    date: 'Aug 20, 2026',
    checksum: generateChecksum(item.score, item.maxCombo, item.level),
  }));
}
