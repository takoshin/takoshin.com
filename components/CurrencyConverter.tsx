"use client";

import { useEffect, useMemo, useState } from "react";
import {
  currencies,
  formatCurrencyAmount,
  formatNumber,
  parsePositiveNumber,
  ratesFromJpyReference,
  type CurrencyCode
} from "@/lib/conversions";

const currencyCodes = Object.keys(currencies) as CurrencyCode[];

type RateState = {
  rates: Record<CurrencyCode, number>;
  source: "live" | "fallback";
  date: string;
};

export function CurrencyConverter() {
  const [base, setBase] = useState<CurrencyCode>("JPY");
  const [amount, setAmount] = useState("10000");
  const [rateState, setRateState] = useState<RateState>(() => ({
    rates: ratesFromJpyReference("JPY"),
    source: "fallback",
    date: "参考値"
  }));
  const [isLoading, setIsLoading] = useState(false);

  const parsedAmount = parsePositiveNumber(amount) ?? 0;

  useEffect(() => {
    const controller = new AbortController();

    async function loadRates() {
      setIsLoading(true);

      try {
        const response = await fetch(`https://api.frankfurter.app/latest?from=${base}`, {
          signal: controller.signal
        });

        if (!response.ok) {
          throw new Error("Failed to fetch rates");
        }

        const data = (await response.json()) as {
          date?: string;
          rates?: Partial<Record<CurrencyCode, number>>;
        };
        const nextRates = ratesFromJpyReference(base);

        currencyCodes.forEach((code) => {
          nextRates[code] = code === base ? 1 : data.rates?.[code] ?? nextRates[code];
        });

        setRateState({
          rates: nextRates,
          source: "live",
          date: data.date ?? "最新"
        });
      } catch (error) {
        if (!controller.signal.aborted) {
          setRateState({
            rates: ratesFromJpyReference(base),
            source: "fallback",
            date: "参考値"
          });
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    }

    loadRates();

    return () => controller.abort();
  }, [base]);

  const rows = useMemo(() => {
    return currencyCodes
      .filter((code) => code !== base)
      .map((code) => ({
        code,
        converted: parsedAmount * rateState.rates[code],
        rate: rateState.rates[code]
      }));
  }, [base, parsedAmount, rateState.rates]);

  const primaryUsd = rows.find((row) => row.code === "USD");

  return (
    <main className="tool-page currency-page" aria-labelledby="page-title">
      <section className="tool-grid">
        <section className="tool-panel converter-panel" aria-label="通貨換算">
          <div className="tool-head">
            <p className="eyebrow">Currency Converter</p>
            <h1 id="page-title">日本円から主要通貨へ</h1>
          </div>

          <div className="currency-input">
            <label>
              <span>金額</span>
              <input
                aria-label="換算する金額"
                inputMode="decimal"
                type="text"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
              />
            </label>

            <label>
              <span>元通貨</span>
              <select
                aria-label="元通貨"
                value={base}
                onChange={(event) => setBase(event.target.value as CurrencyCode)}
              >
                {currencyCodes.map((code) => (
                  <option value={code} key={code}>
                    {code} {currencies[code].name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="primary-result" aria-live="polite">
            <span>{base} から USD</span>
            <strong>
              {primaryUsd ? formatCurrencyAmount(primaryUsd.converted, "USD") : "-"}
            </strong>
          </div>

          <div className="currency-list" aria-label="換算結果">
            {rows.map((row) => (
              <div className="currency-row" key={row.code}>
                <span className="currency-code">{row.code}</span>
                <span className="currency-name">{currencies[row.code].name}</span>
                <strong>{formatCurrencyAmount(row.converted, row.code)}</strong>
                <small>
                  1 {base} = {formatNumber(row.rate, 6)} {row.code}
                </small>
              </div>
            ))}
          </div>

          <p className="status" role="status" aria-live="polite">
            {isLoading
              ? "レートを取得しています"
              : rateState.source === "live"
                ? `${rateState.date} の公開レートを使用中`
                : "接続できない場合の参考レートを表示中"}
          </p>
        </section>

        <aside className="visual-panel currency-visual" aria-label="通貨比較">
          <div className="rate-stack">
            {rows.slice(0, 6).map((row, index) => (
              <div
                className="rate-bar"
                key={row.code}
                style={{ inlineSize: `${88 - index * 8}%` }}
              >
                <span>{row.code}</span>
                <strong>{formatCurrencyAmount(row.converted, row.code)}</strong>
              </div>
            ))}
          </div>
          <div className="metric-board">
            <span>換算元</span>
            <strong>{formatCurrencyAmount(parsedAmount, base)}</strong>
            <small>{currencies[base].name}</small>
          </div>
        </aside>
      </section>
    </main>
  );
}
