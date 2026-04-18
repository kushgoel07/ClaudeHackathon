export function computeTodayTotals(log, goals) {
  const totals = log.reduce((acc, entry) => ({
    kcal:      acc.kcal      + (entry.kcal      || 0),
    protein_g: acc.protein_g + (entry.protein_g || 0),
    carbs_g:   acc.carbs_g   + (entry.carbs_g   || 0),
    fat_g:     acc.fat_g     + (entry.fat_g     || 0),
    fiber_g:   acc.fiber_g   + (entry.fiber_g   || 0),
  }), { kcal: 0, protein_g: 0, carbs_g: 0, fat_g: 0, fiber_g: 0 });

  const safe = (n, d) => d > 0 ? Math.min(100, Math.round((n / d) * 100)) : 0;

  return {
    totals,
    pct: {
      kcal:    safe(totals.kcal,      goals.calGoal     || 2000),
      protein: safe(totals.protein_g, goals.proteinGoal || 120),
      carbs:   safe(totals.carbs_g,   goals.carbGoal    || 220),
      fat:     safe(totals.fat_g,     goals.fatGoal     || 70),
      fiber:   safe(totals.fiber_g,   goals.fiberGoal   || 25),
    },
    remaining: {
      kcal: Math.max(0, (goals.calGoal || 2000) - totals.kcal),
    }
  };
}

export function suggestCalories(profile) {
  const { age = 30, sex = 'male', primaryGoal = 'Maintain weight' } = profile;
  let bmr = sex === 'female'
    ? 655 + (9.6 * 65) + (1.8 * 165) - (4.7 * age)
    : 88 + (13.4 * 75) + (5 * 175) - (5.7 * age);
  const tdee = Math.round(bmr * 1.55);
  if (primaryGoal.toLowerCase().includes('lose')) return tdee - 500;
  if (primaryGoal.toLowerCase().includes('build') || primaryGoal.toLowerCase().includes('muscle')) return tdee + 300;
  return tdee;
}

export function suggestMacros(kcal, primaryGoal = '') {
  const goal = primaryGoal.toLowerCase();
  let proteinPct = 0.30, carbPct = 0.40, fatPct = 0.30;
  if (goal.includes('build') || goal.includes('muscle')) { proteinPct = 0.35; carbPct = 0.40; fatPct = 0.25; }
  if (goal.includes('lose'))  { proteinPct = 0.35; carbPct = 0.35; fatPct = 0.30; }
  return {
    proteinGoal: Math.round((kcal * proteinPct) / 4),
    carbGoal:    Math.round((kcal * carbPct)    / 4),
    fatGoal:     Math.round((kcal * fatPct)     / 9),
    fiberGoal:   25,
    waterGoal:   2
  };
}
