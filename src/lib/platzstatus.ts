export type StatusValue = 'open' | 'limited' | 'closed';

export interface Sperrzeit {
  vonDatum: string;
  bisDatum: string;
  grund?: string;
  hauptplatz?: string;
  kurzplatz?: string;
  drivingRange?: string;
  carts?: string;
}

function isNowBetween(open: string, close: string): boolean {
  const now = new Date();
  const [oh, om] = open.split(':').map(Number);
  const [ch, cm] = close.split(':').map(Number);
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const openMin = oh * 60 + om;
  const closeMin = ch * 60 + cm;
  return nowMin >= openMin && nowMin < closeMin;
}

export function getSperrzeit(sperrzeiten: Sperrzeit[], field: keyof Sperrzeit): string | null {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (const s of sperrzeiten) {
    const von = new Date(s.vonDatum + 'T00:00:00');
    const bis = new Date(s.bisDatum + 'T23:59:59');
    if (today >= von && today <= bis) {
      const val = s[field] as string | undefined;
      if (val && val !== 'auto') return val;
    }
  }
  return null;
}

export function getUpcomingSperrzeiten(sperrzeiten: Sperrzeit[]): Array<Sperrzeit & { isActive: boolean; daysUntil: number }> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return sperrzeiten
    .map(s => {
      const von = new Date(s.vonDatum + 'T00:00:00');
      const bis = new Date(s.bisDatum + 'T23:59:59');
      const isActive = today >= von && today <= bis;
      const daysUntil = Math.ceil((von.getTime() - today.getTime()) / 86400000);
      return { ...s, isActive, daysUntil };
    })
    .filter(s => new Date(s.bisDatum + 'T23:59:59') >= today)
    .sort((a, b) => a.vonDatum.localeCompare(b.vonDatum));
}

export function resolveStatus(
  manual: string,
  oeffnet?: string,
  schliesst?: string,
  sperrzeit?: string | null,
): StatusValue {
  if (manual !== 'auto') return manual as StatusValue;
  if (sperrzeit && sperrzeit !== 'auto') return sperrzeit as StatusValue;
  if (!oeffnet || !schliesst) return 'open';
  return isNowBetween(oeffnet, schliesst) ? 'open' : 'closed';
}
