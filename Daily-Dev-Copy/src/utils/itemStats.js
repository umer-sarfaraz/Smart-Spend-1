// Shared item-level purchase stats (grocery intelligence).
// Promoted from the restock-cadence logic in History.jsx's itemPriceStats so other
// screens (e.g. the shopping list's "Running low?" row) can reuse the same rules:
// 3+ distinct purchase dates → median gap in days (median, not mean, so one long
// vacation gap doesn't skew the rhythm); gaps under 2 days are ignored as
// same-week top-up noise. An item is "due" when days since the last purchase
// exceed its usual cadence.

const DAY_MS = 86400000;

export function getRestockSuggestions(expenses, { max = 4 } = {}) {
  const byItem = {};
  (Array.isArray(expenses) ? expenses : []).forEach((exp) => {
    (exp?.items || []).forEach((item) => {
      const name = (item?.name || '').trim();
      const key = name.toLowerCase();
      if (!key) return;
      if (!byItem[key]) byItem[key] = { name, category: item.category || 'other', dateSet: new Set() };
      byItem[key].dateSet.add(exp.date);
    });
  });

  const today = new Date().setHours(0, 0, 0, 0);
  const due = [];
  Object.values(byItem).forEach((s) => {
    const days = [...s.dateSet]
      .map((d) => new Date(d).setHours(0, 0, 0, 0))
      .filter((t) => !isNaN(t))
      .sort((a, b) => a - b);
    if (days.length < 3) return;
    const gaps = [];
    for (let i = 1; i < days.length; i++) gaps.push((days[i] - days[i - 1]) / DAY_MS);
    gaps.sort((a, b) => a - b);
    const mid = Math.floor(gaps.length / 2);
    const median = gaps.length % 2 ? gaps[mid] : (gaps[mid - 1] + gaps[mid]) / 2;
    if (median < 2) return;
    const cadenceDays = Math.round(median);
    const daysSince = Math.round((today - days[days.length - 1]) / DAY_MS);
    if (daysSince > cadenceDays) {
      due.push({ name: s.name, category: s.category, cadenceDays, daysSince, overdueBy: daysSince - cadenceDays });
    }
  });

  return due.sort((a, b) => b.overdueBy - a.overdueBy).slice(0, max);
}

// Average price paid per item (all-time, case-insensitive name key).
// Powers the shopping list's estimated-cost line: SmartSpend already knows
// what you usually pay from scanned receipts, so no manual price entry needed.
export function getAveragePrices(expenses) {
  const sums = {};
  (Array.isArray(expenses) ? expenses : []).forEach((exp) => {
    (exp?.items || []).forEach((item) => {
      const key = (item?.name || '').trim().toLowerCase();
      const amt = Number(item?.amount) || 0;
      if (!key || amt <= 0) return;
      if (!sums[key]) sums[key] = { sum: 0, count: 0 };
      sums[key].sum += amt;
      sums[key].count += 1;
    });
  });
  const avg = {};
  Object.entries(sums).forEach(([key, s]) => { avg[key] = s.sum / s.count; });
  return avg;
}
