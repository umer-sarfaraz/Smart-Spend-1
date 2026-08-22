// Shared category-limit status.
//
// A category limit is one fact — "how is this category doing against its monthly
// limit?" — but until now it was answered by two different rules on two screens:
//
//   Home (Dashboard.jsx)  four states, pace-aware: over / on pace to go over /
//                         nearly there (>=85%) / fine, worded as "$45 left of $200".
//   Settings.jsx          three states from raw percent only: <70% green,
//                         <100% amber, else red, worded as "$45 spent".
//
// So the same category on the same day could read amber in Settings and grey on
// Home, or be flagged "on pace to blow the limit" on Home while Settings showed a
// comfortable green bar. Both screens now call `categoryBudgetStatus`, so there is
// one state machine, one colour per state and one phrase per state.
//
// Behaviour is Home's, verbatim — Settings adopts it. This module is pure: no
// React, no imports.

/** Colour per state. `near` and `pace` share amber; both mean "watch this one". */
export const BUDGET_STATE_COLORS = {
  over: '#f43f5e',
  pace: '#f59e0b',
  near: '#f59e0b',
  ok:   '#5A6270',
};

/**
 * A linear month-end projector: `spent -> projected month-end spend`.
 * Returns `null` before day 5 of the month, so one early purchase can't project a
 * wild total. Same math Home's ring status pill uses.
 */
export function monthPaceProjector(now = new Date()) {
  if (now.getDate() < 5) return null;
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  return spent => (spent / now.getDate()) * daysInMonth;
}

/**
 * Days remaining in the month, **including today** — the same convention Home's
 * whole-budget LEFT / DAY figure uses (`daysInMonth - date + 1`), so a per-category
 * daily figure and the overall one are always divided by the same number of days.
 */
export function daysLeftInMonth(now = new Date()) {
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  return daysInMonth - now.getDate() + 1;
}

/**
 * Spendee-style "how much can I still spend each day in this category?".
 * `left` is a `categoryBudgetStatus` result's `left`. Returns `null` when there is
 * nothing left to spread (an over-limit category's `left` is 0 by construction) or
 * when the month is out of days, so callers can render nothing rather than $0.00.
 *
 * `{ perDay, daysLeft }` — `perDay` is formatted by the caller.
 */
export function categoryDailyLeft(left, daysLeft = daysLeftInMonth()) {
  const amt = Number(left) || 0;
  if (!(amt > 0) || !(daysLeft >= 1)) return null;
  return { perDay: amt / daysLeft, daysLeft };
}

/**
 * YNAB-style "roll with the punches": the budgeted categories that still have room
 * this month, most-room-first, so an over-limit row can point at real slack instead
 * of dead-ending in red. An over-limit category can never appear here by
 * construction (its remaining is negative).
 *
 * `totals` maps category key -> spent this month. Returns `[{ k, left }]`.
 * Home and Settings both call this, so the two "Cover it from…" lines can never
 * name different categories for the same month.
 */
export function categorySlack(catBudgets, totals, max = 2) {
  return Object.entries(catBudgets || {})
    .map(([k, a]) => ({ k, left: (Number(a) || 0) - ((totals && totals[k]) || 0) }))
    .filter(s => s.left > 0.5)
    .sort((x, y) => y.left - x.left)
    .slice(0, max);
}

/**
 * Status of `spent` against a category `limit`, optionally pace-aware.
 *
 * `project` is a `monthPaceProjector()` result (or null). Returns `null` when there
 * is no usable limit, so callers can render "no limit set" however they like.
 *
 * `{ state, color, spent, limit, over, left, projected, text, shortText }`
 *  - `text`      full phrase, names the limit — for screens that don't show it
 *                elsewhere on the row (Home's Breakdown).
 *  - `shortText` same words, limit dropped — for rows that already display the
 *                limit (Settings' Category Budgets).
 */
export function categoryBudgetStatus(spent, limit, project = null) {
  const lim = Number(limit) || 0;
  if (!(lim > 0)) return null;
  const amt = Number(spent) || 0;
  const projected = amt <= lim && typeof project === 'function' ? project(amt) : 0;

  const state = amt > lim ? 'over'
    : projected > lim + 1 ? 'pace'
      : amt >= lim * 0.85 ? 'near'
        : 'ok';

  const over = Math.max(0, amt - lim);
  const left = Math.max(0, lim - amt);

  const text = state === 'over'
    ? `▲ $${over.toFixed(0)} over $${lim} limit`
    : state === 'pace'
      ? `▲ on pace for ~$${projected.toFixed(0)} of $${lim} limit`
      : `$${left.toFixed(0)} left of $${lim}`;

  const shortText = state === 'over'
    ? `▲ $${over.toFixed(0)} over`
    : state === 'pace'
      ? `▲ on pace for ~$${projected.toFixed(0)}`
      : `$${left.toFixed(0)} left`;

  return { state, color: BUDGET_STATE_COLORS[state], spent: amt, limit: lim, over, left, projected, text, shortText };
}
