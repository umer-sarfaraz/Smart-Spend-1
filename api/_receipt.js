// Shared extraction contract, used only for explicitly marked receipt requests.
// Ask and older clients keep their existing response shapes.
const number = { type: 'NUMBER', nullable: true };
export const receiptSchema = {
  type: 'OBJECT', required: ['merchant', 'date', 'isGasMeter', 'receiptSubtotal', 'receiptTotal', 'items'],
  properties: {
    merchant: { type: 'STRING' }, date: { type: 'STRING' }, isGasMeter: { type: 'BOOLEAN' },
    receiptSubtotal: number, receiptTotal: number,
    items: { type: 'ARRAY', items: {
      type: 'OBJECT', required: ['name', 'printed', 'amount', 'category', 'qty', 'size', 'unit'],
      properties: {
        name: { type: 'STRING' }, printed: { type: 'STRING' }, amount: { type: 'NUMBER' },
        category: { type: 'STRING' }, qty: { type: 'INTEGER' }, size: number,
        unit: { type: 'STRING', nullable: true },
      },
    } },
  },
};

export function candidateText(data) {
  const candidate = data?.candidates?.[0];
  // Truncated JSON sometimes parses but omits the end of a receipt.
  if (candidate?.finishReason && candidate.finishReason !== 'STOP') return '';
  return (candidate?.content?.parts || []).filter(p => !p.thought && typeof p.text === 'string').map(p => p.text).join('');
}

export function validReceipt(value) {
  return value && !Array.isArray(value) && typeof value.merchant === 'string' &&
    typeof value.date === 'string' && Array.isArray(value.items) && value.items.length > 0 &&
    value.items.every(i => typeof i.name === 'string' && Number.isFinite(i.amount));
}

export function receiptGeneration(config, modelId, mode) {
  if (!mode) return config;
  if (modelId.startsWith('gemini-3')) {
    // Gemini 3 recommends default sampling. OCR text is already transcribed;
    // spend less time reasoning about it and validate prices deterministically.
    const { temperature, ...rest } = config;
    return mode === 'text' ? { ...rest, thinkingConfig: { thinkingLevel: 'minimal' } } : rest;
  }
  return mode === 'text' ? { ...config, thinkingConfig: { thinkingBudget: 0 } } : config;
}
