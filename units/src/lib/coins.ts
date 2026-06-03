/**
 * Coin schema. Adding new coins later = drop another entry into this map.
 * Premium rates are dealer "sell-back" estimates — what you actually
 * RECEIVE per coin above (or sometimes at) spot when you sell to a
 * major dealer like Monex, APMEX, or JM Bullion. Adjust on the page
 * per your real quotes.
 */
export interface Coin {
  id: string
  name: string
  metal: 'silver' | 'gold' | 'platinum'
  troyOz: number
  /** Default dealer premium-over-spot, in $/oz, when YOU SELL the coin.
   *  Defaults to what major sovereign coins typically command from
   *  bulk dealers in 2026 markets. */
  defaultDealerPremiumPerOz: number
  /** A short note shown under the dropdown to explain the default. */
  premiumNote: string
}

export const COINS: Coin[] = [
  {
    id: 'csml-1oz',
    name: 'Canadian Silver Maple Leaf · 1 oz',
    metal: 'silver',
    troyOz: 1,
    defaultDealerPremiumPerOz: 1.25,
    premiumNote:
      'Default dealer sell-back premium ≈ spot + $1.25/oz (typical for 1 oz CSMLs at Monex, APMEX, JM Bullion). Adjust to match your real quote.',
  },
  // Add more here as they come up. Schema is intentionally tiny.
]

export function getCoin(id: string): Coin {
  return COINS.find((c) => c.id === id) ?? COINS[0]
}
