import type { Instrument } from "../lib/domain/types";

const META = {
  exchange: "NSE",
  metadataSource: "DhanLens curated demo taxonomy (illustrative classification)",
  metadataUpdatedAt: "2026-10-01T00:00:00+05:30",
};

// Symbols are familiar NSE tickers so a read-only Dhan portfolio can map onto the same taxonomy.
// Sector labels are a small hand-curated list, not an exchange-licensed classification.
// Dhan security IDs are deliberately absent: live holdings bring their own.
const rows: [symbol: string, displayName: string, sector: string, industry: string][] = [
  ["HDFCBANK", "HDFC Bank", "Banks", "Private sector bank"],
  ["ICICIBANK", "ICICI Bank", "Banks", "Private sector bank"],
  ["TCS", "Tata Consultancy Services", "IT Services", "IT consulting & software"],
  ["INFY", "Infosys", "IT Services", "IT consulting & software"],
  ["RELIANCE", "Reliance Industries", "Oil & Gas", "Refining & petrochemicals"],
  ["ONGC", "Oil & Natural Gas Corporation", "Oil & Gas", "Exploration & production"],
  ["SUNPHARMA", "Sun Pharmaceutical", "Pharmaceuticals", "Pharmaceuticals"],
  ["MARUTI", "Maruti Suzuki India", "Automobiles", "Passenger vehicles"],
  ["ASIANPAINT", "Asian Paints", "Paints", "Decorative paints"],
  ["HINDUNILVR", "Hindustan Unilever", "FMCG", "Household & personal products"],
];

export const demoInstruments: Instrument[] = rows.map(([symbol, displayName, sector, industry]) => ({
  id: symbol,
  symbol,
  displayName,
  sector,
  industry,
  ...META,
}));

export const BENCHMARK = { id: "NIFTY50", label: "Nifty 50 (simulated)" };
