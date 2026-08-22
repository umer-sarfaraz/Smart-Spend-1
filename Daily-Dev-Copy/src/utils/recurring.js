// Shared recurring-bill helpers.
//
// The "has this bill already posted to the current month's ledger?" guard and the
// paid/left split of the standing monthly commitment were, until now, written out
// by hand in three places: App.jsx's auto-post effect, Settings' per-row status +
// paid/left summary, and Dashboard's Upcoming module + month-in-progress bar.
// Three hand-mirrored copies of the same rule is three chances for the screens to
// disagree about the same bill, so they all now call these functions instead.
//
// Behaviour is intentionally identical to the copies they replace, with one
// hardening: the expense-date guard (`e.date &&`) that only Settings had is now
// applied everywhere, so a malformed expense with no date can no longer throw
// inside `.startsWith()` on Home or during auto-post.

/** `YYYY-MM` key for the given date (defaults to now). */
export function currentMonthKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * The set of recurring-bill ids that have already posted an expense in `monthKey`.
 * An expense counts as a posting when it carries a `recurringId` and its date falls
 * in that month — the same rule App.jsx uses when deciding what to auto-post.
 */
export function postedRecurringIds(expenses, monthKey = currentMonthKey()) {
  return new Set(
    (expenses || [])
      .filter(e => e && e.recurringId && e.date && e.date.startsWith(monthKey))
      .map(e => e.recurringId)
  );
}

/**
 * Month-in-progress split of the standing recurring commitment.
 * Returns `{ paid, left, leftCount, committed }` — how much of this month's bills
 * has already gone out, how much is still to come (and across how many bills), and
 * the full monthly commitment. Amounts are coerced with `Number(...) || 0`, matching
 * the previous inline copies.
 */
export function recurringSplit(recurring = [], postedIds = new Set()) {
  let paid = 0, left = 0, leftCount = 0;
  (recurring || []).forEach(r => {
    if (!r) return;
    const amt = Number(r.amount) || 0;
    if (postedIds.has(r.id)) paid += amt;
    else { left += amt; leftCount += 1; }
  });
  return { paid, left, leftCount, committed: paid + left };
}
