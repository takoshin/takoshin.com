export type AreaUnit = "sqm" | "tsubo" | "jo";

export const SQM_PER_TSUBO = 400 / 121;
export const DEFAULT_TATAMI_SQM = 1.62;

export const areaUnits: Record<AreaUnit, { label: string; badge: string }> = {
  sqm: { label: "平米", badge: "㎡" },
  tsubo: { label: "坪", badge: "坪" },
  jo: { label: "畳", badge: "畳" }
};

const fullWidthDigitMap: Record<string, string> = {
  "０": "0",
  "１": "1",
  "２": "2",
  "３": "3",
  "４": "4",
  "５": "5",
  "６": "6",
  "７": "7",
  "８": "8",
  "９": "9",
  "．": ".",
  "，": ","
};

export function normalizeNumericInput(value: string) {
  return value
    .replace(/[０-９．，]/g, (char) => fullWidthDigitMap[char] ?? char)
    .replace(/,/g, "")
    .replace(/\s/g, "");
}

export function parsePositiveNumber(value: string) {
  const normalized = normalizeNumericInput(value);

  if (normalized === "" || normalized === "." || normalized === "-") {
    return null;
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

export function toSquareMeters(value: number, unit: AreaUnit, tatamiSqm: number) {
  if (unit === "tsubo") {
    return value * SQM_PER_TSUBO;
  }

  if (unit === "jo") {
    return value * tatamiSqm;
  }

  return value;
}

export function fromSquareMeters(squareMeters: number, unit: AreaUnit, tatamiSqm: number) {
  if (unit === "tsubo") {
    return squareMeters / SQM_PER_TSUBO;
  }

  if (unit === "jo") {
    return squareMeters / tatamiSqm;
  }

  return squareMeters;
}

export function formatNumber(value: number, maximumFractionDigits = 4) {
  if (!Number.isFinite(value)) {
    return "";
  }

  return new Intl.NumberFormat("ja-JP", {
    maximumFractionDigits,
    minimumFractionDigits: 0
  }).format(value);
}

export function formatAreaValue(value: number) {
  if (value === 0) {
    return "0";
  }

  if (Math.abs(value) < 0.0001) {
    return value.toExponential(3);
  }

  return formatNumber(value, value >= 100 ? 2 : 4);
}

export function buildAreaValues(squareMeters: number, tatamiSqm: number) {
  return (Object.keys(areaUnits) as AreaUnit[]).reduce<Record<AreaUnit, string>>(
    (values, unit) => {
      values[unit] = formatAreaValue(fromSquareMeters(squareMeters, unit, tatamiSqm));
      return values;
    },
    { sqm: "", tsubo: "", jo: "" }
  );
}

export const currencies = {
  JPY: { name: "日本円", symbol: "¥" },
  USD: { name: "米ドル", symbol: "$" },
  EUR: { name: "ユーロ", symbol: "€" },
  GBP: { name: "英ポンド", symbol: "£" },
  AUD: { name: "豪ドル", symbol: "A$" },
  CAD: { name: "カナダドル", symbol: "C$" },
  CNY: { name: "人民元", symbol: "元" },
  KRW: { name: "韓国ウォン", symbol: "₩" },
  SGD: { name: "シンガポールドル", symbol: "S$" },
  THB: { name: "タイバーツ", symbol: "฿" }
} as const;

export type CurrencyCode = keyof typeof currencies;

export const fallbackJpyRates: Record<CurrencyCode, number> = {
  JPY: 1,
  USD: 0.0069,
  EUR: 0.0064,
  GBP: 0.0054,
  AUD: 0.0105,
  CAD: 0.0094,
  CNY: 0.049,
  KRW: 9.4,
  SGD: 0.0093,
  THB: 0.25
};

export function ratesFromJpyReference(base: CurrencyCode) {
  const baseToJpy = fallbackJpyRates[base];

  return (Object.keys(currencies) as CurrencyCode[]).reduce<Record<CurrencyCode, number>>(
    (rates, code) => {
      rates[code] = fallbackJpyRates[code] / baseToJpy;
      return rates;
    },
    {} as Record<CurrencyCode, number>
  );
}

export function formatCurrencyAmount(value: number, currency: CurrencyCode) {
  return new Intl.NumberFormat("ja-JP", {
    style: "currency",
    currency,
    currencyDisplay: "narrowSymbol",
    maximumFractionDigits: currency === "JPY" || currency === "KRW" ? 0 : 2
  }).format(value);
}

export function formatYen(value: number) {
  return new Intl.NumberFormat("ja-JP", {
    style: "currency",
    currency: "JPY",
    currencyDisplay: "narrowSymbol",
    maximumFractionDigits: 0
  }).format(value);
}
