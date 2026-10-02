// Shared extraction contract, used only for explicitly marked receipt requests.
// Ask and older clients keep their existing response shapes.
const number = { type: 'NUMBER', nullable: true };

// Round 173: a screenshot of card or bank payments (Apple Wallet, a banking
// app, a statement) is not one shop's receipt. The model now says which of
// the two it is looking at, and a list comes back as one row per payment
// instead of being squeezed into "one receipt from the first shop". Every
// field below is OPTIONAL in the contract, so an app from before this round
// reads exactly what it always did, and the `required` list is untouched.
// `when` is the row's date text as shown ("Yesterday"); the APP turns it into
// a calendar day (utils/cardList.js), the model's own `date` is the fallback.
const transaction = {
  type: 'OBJECT', required: ['merchant', 'amount', 'when', 'date', 'status', 'category'],
  properties: {
    merchant: { type: 'STRING' }, amount: { type: 'NUMBER' }, when: { type: 'STRING' },
    date: { type: 'STRING' }, status: { type: 'STRING' }, category: { type: 'STRING' },
  },
};

export const receiptSchema = {
  type: 'OBJECT', required: ['merchant', 'date', 'isGasMeter', 'receiptSubtotal', 'receiptTotal', 'items'],
  properties: {
    documentType: { type: 'STRING' },
    merchant: { type: 'STRING' }, date: { type: 'STRING' }, isGasMeter: { type: 'BOOLEAN' },
    receiptSubtotal: number, receiptTotal: number,
    items: { type: 'ARRAY', items: {
      type: 'OBJECT', required: ['name', 'printed', 'amount', 'category', 'qty', 'size', 'unit'],
      properties: {
        name: { type: 'STRING' }, printed: { type: 'STRING' }, amount: { type: 'NUMBER' },
        category: { type: 'STRING' }, qty: { type: 'INTEGER' }, size: number,
        unit: { type: 'STRING', nullable: true },
        // Round 138 asked the model for `kind` ("fee" for a bag fee, a deposit,
        // a coupon) in the prompt, but the contract never listed it, so the
        // schema-bound reply could not carry it and every fee was recognised
        // by its name alone (utils/lineKind.js). Optional, like the rest.
        kind: { type: 'STRING', nullable: true },
      },
    } },
    transactions: { type: 'ARRAY', items: transaction },
  },
};

export function candidateText(data) {
  const candidate = data?.candidates?.[0];
  // Truncated JSON sometimes parses but omits the end of a receipt.
  if (candidate?.finishReason && candidate.finishReason !== 'STOP') return '';
  return (candidate?.content?.parts || []).filter(p => !p.thought && typeof p.text === 'string').map(p => p.text).join('');
}

/** One payment row a reply may carry: a payee and a readable amount. */
function validTransaction(row) {
  return row && typeof row === 'object' && typeof row.merchant === 'string' && Number.isFinite(row.amount);
}

export function validReceipt(value) {
  if (!value || Array.isArray(value) || typeof value.merchant !== 'string' || typeof value.date !== 'string') return false;
  // A list of payments has no line items of its own; its rows are the content.
  const rows = Array.isArray(value.transactions) ? value.transactions : [];
  if (rows.length > 0 && rows.every(validTransaction)) return true;
  return Array.isArray(value.items) && value.items.length > 0 &&
    value.items.every(i => typeof i.name === 'string' && Number.isFinite(i.amount));
}

export function receiptGeneration(config, modelId, mode) {
  if (!mode) return config;
  if (modelId.startsWith('gemini-3')) {
    // Gemini 3 recommends default sampling. OCR text is already transcribed;
    // spend less time reasoning about it and validate prices deterministically.
    const { temperature, ...rest } = config;
    if (mode === 'text') return { ...rest, thinkingConfig: { thinkingLevel: 'minimal' } };
    // Photos used to carry NO thinkingConfig, so the model reasoned at its full
    // dynamic budget on every receipt. Round 143's diagnostics measured what
    // that cost on real scans (2026-09-20): 2,000 to 3,600 thinking tokens per
    // receipt against 600 to 1,200 of actual answer, billed at the output rate,
    // and 12 to 18 seconds of the wait — with four of seven scans hitting the
    // 18-second cut-off outright. `low`, not `minimal`: a photo still has to be
    // READ, and the text path's `minimal` was chosen for input that was already
    // transcribed. Validated by rescanning the same receipts and comparing
    // item by item (Umer's call, 2026-09-21).
    return { ...rest, thinkingConfig: { thinkingLevel: 'low' } };
  }
  return mode === 'text' ? { ...config, thinkingConfig: { thinkingBudget: 0 } } : config;
}
