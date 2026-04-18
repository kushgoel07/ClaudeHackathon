export function parseClaudeResponse(responseText, type) {
  if (type === 'coach_question') {
    return { type: 'coach', text: responseText.trim() };
  }

  const cleaned = responseText
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/, '')
    .replace(/\s*```$/, '')
    .trim();

  try {
    const meal = JSON.parse(cleaned);
    const required = ['meal', 'kcal', 'protein_g', 'carbs_g', 'fat_g'];
    for (const f of required) {
      if (meal[f] === undefined) throw new Error('missing ' + f);
    }
    meal.kcal = Number(meal.kcal) || 0;
    meal.protein_g = Number(meal.protein_g) || 0;
    meal.carbs_g = Number(meal.carbs_g) || 0;
    meal.fat_g = Number(meal.fat_g) || 0;
    meal.fiber_g = Number(meal.fiber_g) || 0;

    if (meal.kcal < 20) {
      return { type: 'water', amount_l: 0.25, note: meal.meal };
    }

    return { type: 'meal', meal };
  } catch (_) {
    return { type: 'coach', text: responseText.trim() };
  }
}
