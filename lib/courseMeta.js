// Small helpers shared by the dashboard and the courses page.

const ICONS = [
  [/biomaterial/i, '🧬'],
  [/biomech/i, '🦴'],
  [/imag/i, '🩻'],
  [/physic/i, '⚛️'],
  [/signal/i, '📈'],
  [/instrument|device|equipment/i, '🩺'],
  [/anatom|physiolog/i, '🫀'],
  [/tissue|cell|bio/i, '🔬'],
  [/math|calcul|statist/i, '📐'],
  [/electr|circuit/i, '⚡'],
];

export function courseIcon(name = '') {
  const hit = ICONS.find(([re]) => re.test(name));
  return hit ? hit[1] : '📚';
}

// Colours that repeat across course cards
export const ACCENTS = ['#2dd4bf', '#60a5fa', '#a78bfa', '#fbbf24', '#fb7185', '#34d399'];

export function courseStatus(pct) {
  if (pct === null || pct === undefined) return { label: 'No mocks yet', tone: 'idle' };
  if (pct === 0) return { label: 'Not started', tone: 'idle' };
  if (pct < 40) return { label: 'Building', tone: 'low' };
  if (pct < 70) return { label: 'In progress', tone: 'mid' };
  return { label: 'Strong', tone: 'high' };
}
