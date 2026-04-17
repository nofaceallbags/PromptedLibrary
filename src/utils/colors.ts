const PALETTE = [
  { bg: 'rgba(255,26,26,0.18)', text: '#FF5555', dot: '#FF1A1A' },
  { bg: 'rgba(255,90,0,0.18)', text: '#FF7744', dot: '#FF5A00' },
  { bg: 'rgba(255,20,147,0.18)', text: '#FF55AA', dot: '#FF1493' },
  { bg: 'rgba(138,43,226,0.18)', text: '#BB77FF', dot: '#8B2BE2' },
  { bg: 'rgba(30,144,255,0.18)', text: '#55AAFF', dot: '#1E90FF' },
  { bg: 'rgba(0,205,102,0.18)', text: '#33DD88', dot: '#00CD66' },
  { bg: 'rgba(255,200,0,0.18)', text: '#FFD633', dot: '#FFC800' },
  { bg: 'rgba(200,200,200,0.1)', text: '#CCCCCC', dot: '#AAAAAA' },
]

export function getCategoryColor(name: string) {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = ((hash << 5) - hash) + name.charCodeAt(i)
    hash |= 0
  }
  return PALETTE[Math.abs(hash) % PALETTE.length]
}
