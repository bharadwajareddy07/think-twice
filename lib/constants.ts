import type { HouseName } from './types'

export interface HouseInfo {
  name: HouseName
  symbol: string
  color: string
  description: string
}

export const OFFICIAL_HOUSES: HouseInfo[] = [
  { name: 'AGNI', symbol: '🔥', color: '#ef4444', description: 'Fire — Passion, Drive, and Quick Action' },
  { name: 'BHUMI', symbol: '🌍', color: '#10b981', description: 'Earth — Stability, Depth, and Resilience' },
  { name: 'VAYU', symbol: '🌬️', color: '#06b6d4', description: 'Wind — Agility, Innovation, and Clarity' },
  { name: 'JAL', symbol: '💧', color: '#3b82f6', description: 'Water — Flow, Adaptability, and Intuition' },
  { name: 'AKASH', symbol: '✨', color: '#8b5cf6', description: 'Ether — Vision, Wisdom, and Higher Insight' },
]

export const HOUSE_SYMBOLS: Record<HouseName, string> = {
  AGNI: '🔥',
  BHUMI: '🌍',
  VAYU: '🌬️',
  JAL: '💧',
  AKASH: '✨',
}

export const HOUSE_COLORS: Record<HouseName, string> = {
  AGNI: '#ef4444',
  BHUMI: '#10b981',
  VAYU: '#06b6d4',
  JAL: '#3b82f6',
  AKASH: '#8b5cf6',
}
