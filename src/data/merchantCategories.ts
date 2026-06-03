// O(1) merchant → category dictionary
export const merchantCategories: Record<string, string> = {
  // Food & Dining
  swiggy: "Food",
  zomato: "Food",
  dominos: "Food",
  mcdonalds: "Food",
  kfc: "Food",
  subway: "Food",
  dunkin: "Food",
  starbucks: "Food",
  "burger king": "Food",
  "pizza hut": "Food",
  blinkit: "Food",
  zepto: "Food",
  bigbasket: "Food",
  dunzo: "Food",
  // Transport
  uber: "Transport",
  ola: "Transport",
  rapido: "Transport",
  irctc: "Transport",
  indigo: "Transport",
  "air india": "Transport",
  makemytrip: "Transport",
  redbus: "Transport",
  yulu: "Transport",
  bounce: "Transport",
  // Shopping
  amazon: "Shopping",
  flipkart: "Shopping",
  myntra: "Shopping",
  ajio: "Shopping",
  meesho: "Shopping",
  nykaa: "Shopping",
  snapdeal: "Shopping",
  croma: "Shopping",
  reliance: "Shopping",
  // Entertainment
  netflix: "Entertainment",
  spotify: "Entertainment",
  "prime video": "Entertainment",
  hotstar: "Entertainment",
  "disney+": "Entertainment",
  youtube: "Entertainment",
  zee5: "Entertainment",
  sonyliv: "Entertainment",
  bookmyshow: "Entertainment",
  // Utilities
  airtel: "Others",
  jio: "Others",
  bsnl: "Others",
  electricity: "Others",
  "water bill": "Others",
  "gas bill": "Others",
};

export function lookupCategory(merchant: string): string | null {
  const lower = merchant.toLowerCase().trim();
  for (const key of Object.keys(merchantCategories)) {
    if (lower.includes(key)) return merchantCategories[key];
  }
  return null;
}
