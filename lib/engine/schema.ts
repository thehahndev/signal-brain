/**
 * JSON schema for the structured ranking output. Structured-output rules:
 * every object needs `additionalProperties: false`, every property listed in
 * `required`, and NO numeric min/max (the 0–100 score bound is enforced via the
 * prompt, not the schema). See the rubric + rank.ts prompt for semantics.
 */
export const RANK_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    items: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          id: { type: 'string', description: 'The item id, copied verbatim from the input.' },
          score: { type: 'integer', description: 'Ruthlessness score 0–100; higher = more signal.' },
          signal_or_hype: { type: 'string', enum: ['signal', 'hype'] },
          verdict: { type: 'string', enum: ['read', 'skim', 'bury'] },
          opportunity_flag: {
            type: 'boolean',
            description: 'True only for a concrete build/sell/market idea worth a guaranteed slot.',
          },
          cluster_id: {
            type: 'integer',
            description: 'Items covering the same story/release share one cluster_id; unique otherwise.',
          },
          why: { type: 'string', description: 'One terse line justifying the verdict.' },
          key_claims: {
            type: 'array',
            items: { type: 'string' },
            description: '1–2 concrete claims/takeaways from the item.',
          },
        },
        required: [
          'id',
          'score',
          'signal_or_hype',
          'verdict',
          'opportunity_flag',
          'cluster_id',
          'why',
          'key_claims',
        ],
      },
    },
  },
  required: ['items'],
} as const;
