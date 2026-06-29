import { NextResponse } from "next/server";
import { currencies, type CurrencyCode } from "@/lib/conversions";

const currencyCodes = Object.keys(currencies) as CurrencyCode[];

type ExchangeRateApiResponse = {
  result?: string;
  base_code?: string;
  rates?: Record<string, number>;
  time_last_update_utc?: string;
  time_next_update_utc?: string;
};

function isCurrencyCode(value: string): value is CurrencyCode {
  return value in currencies;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const base = (url.searchParams.get("base") ?? "JPY").toUpperCase();

  if (!isCurrencyCode(base)) {
    return NextResponse.json({ error: "Unsupported currency" }, { status: 400 });
  }

  try {
    const response = await fetch(`https://open.er-api.com/v6/latest/${base}`, {
      cache: "no-store"
    });

    if (!response.ok) {
      throw new Error("Failed to fetch exchange rates");
    }

    const data = (await response.json()) as ExchangeRateApiResponse;

    if (data.result !== "success" || !data.rates) {
      throw new Error("Invalid exchange rate response");
    }

    const rates = currencyCodes.reduce<Record<CurrencyCode, number>>(
      (nextRates, code) => {
        nextRates[code] = code === base ? 1 : Number(data.rates?.[code] ?? 0);
        return nextRates;
      },
      {} as Record<CurrencyCode, number>
    );

    return NextResponse.json({
      base,
      rates,
      provider: "ExchangeRate-API",
      providerUrl: "https://www.exchangerate-api.com",
      updatedAt: data.time_last_update_utc ?? null,
      nextUpdateAt: data.time_next_update_utc ?? null
    });
  } catch {
    return NextResponse.json(
      { error: "Could not fetch current exchange rates" },
      { status: 502 }
    );
  }
}
