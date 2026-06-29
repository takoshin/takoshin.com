"use client";

import { useMemo, useState } from "react";
import { formatNumber, formatYen, parsePositiveNumber } from "@/lib/conversions";

type TaxMode = "excluded" | "included";
type DiscountBase = "excluded" | "included";
type PresetRate = "10" | "20" | "40" | "60" | "custom";

const TAX_RATE = 0.1;
const presetRates: Array<{ label: string; value: PresetRate }> = [
  { label: "10%", value: "10" },
  { label: "20%", value: "20" },
  { label: "40%", value: "40" },
  { label: "60%", value: "60" },
  { label: "その他", value: "custom" }
];

function roundYen(value: number) {
  return Math.round(value);
}

function clampRate(value: number) {
  return Math.min(100, Math.max(0, value));
}

function isZeroInput(value: string) {
  return parsePositiveNumber(value) === 0;
}

function restoreZeroInput(value: string) {
  return value.trim() === "" ? "0" : value;
}

export function DiscountCalculator() {
  const [amount, setAmount] = useState("0");
  const [taxMode, setTaxMode] = useState<TaxMode>("included");
  const [discountBase, setDiscountBase] = useState<DiscountBase>("excluded");
  const [presetRate, setPresetRate] = useState<PresetRate>("20");
  const [customRate, setCustomRate] = useState("0");
  const [status, setStatus] = useState("");

  const amountValue = parsePositiveNumber(amount);
  const customRateValue = parsePositiveNumber(customRate);

  const discountRatePercent = useMemo(() => {
    if (presetRate === "custom") {
      return clampRate(customRateValue ?? 0);
    }

    return Number(presetRate);
  }, [customRateValue, presetRate]);

  const calculation = useMemo(() => {
    const sourceAmount = amountValue ?? 0;
    const originalExcluded =
      taxMode === "included" ? roundYen(sourceAmount / (1 + TAX_RATE)) : roundYen(sourceAmount);
    const originalIncluded =
      taxMode === "included" ? roundYen(sourceAmount) : roundYen(sourceAmount * (1 + TAX_RATE));
    const rate = discountRatePercent / 100;

    if (discountBase === "included") {
      const discountIncluded = roundYen(originalIncluded * rate);
      const finalIncluded = Math.max(0, originalIncluded - discountIncluded);
      const finalExcluded = roundYen(finalIncluded / (1 + TAX_RATE));

      return {
        originalExcluded,
        originalIncluded,
        originalTax: Math.max(0, originalIncluded - originalExcluded),
        finalExcluded,
        finalIncluded,
        finalTax: Math.max(0, finalIncluded - finalExcluded),
        discountExcluded: Math.max(0, originalExcluded - finalExcluded),
        discountIncluded,
        discountBaseAmount: originalIncluded
      };
    }

    const discountExcluded = roundYen(originalExcluded * rate);
    const finalExcluded = Math.max(0, originalExcluded - discountExcluded);
    const finalIncluded = roundYen(finalExcluded * (1 + TAX_RATE));

    return {
      originalExcluded,
      originalIncluded,
      originalTax: Math.max(0, originalIncluded - originalExcluded),
      finalExcluded,
      finalIncluded,
      finalTax: Math.max(0, finalIncluded - finalExcluded),
      discountExcluded,
      discountIncluded: Math.max(0, originalIncluded - finalIncluded),
      discountBaseAmount: originalExcluded
    };
  }, [amountValue, discountBase, discountRatePercent, taxMode]);

  const isInvalidAmount = amountValue === null;
  const isInvalidCustomRate = presetRate === "custom" && customRateValue === null;
  const resultText = `割引後 ${formatYen(calculation.finalIncluded)}（税込） / ${formatYen(
    calculation.finalExcluded
  )}（税抜）`;

  async function copyResult() {
    try {
      await navigator.clipboard.writeText(
        `${resultText}\n割引率: ${formatNumber(discountRatePercent, 2)}%\n割引額: ${formatYen(
          calculation.discountIncluded
        )}（税込換算）`
      );
      setStatus("結果をコピーしました");
    } catch {
      setStatus("コピーできませんでした");
    }
  }

  function reset() {
    setAmount("0");
    setTaxMode("included");
    setDiscountBase("excluded");
    setPresetRate("20");
    setCustomRate("0");
    setStatus("初期値に戻しました");
  }

  return (
    <main className="tool-page discount-page" aria-labelledby="page-title">
      <section className="tool-grid">
        <section className="tool-panel converter-panel" aria-label="割引計算">
          <div className="tool-head">
            <p className="eyebrow">Discount Calculator</p>
            <h1 id="page-title">割引後の金額を計算</h1>
          </div>

          <div className="discount-input">
            <label>
              <span>金額</span>
              <input
                aria-label="金額"
                inputMode="decimal"
                placeholder="0"
                type="text"
                value={amount}
                onChange={(event) => {
                  setAmount(event.target.value);
                  setStatus("");
                }}
                onFocus={() => {
                  if (isZeroInput(amount)) {
                    setAmount("");
                  }
                }}
                onBlur={(event) => setAmount(restoreZeroInput(event.target.value))}
              />
            </label>

            <div className="control-block compact-control">
              <span>入力金額</span>
              <div className="segments" role="radiogroup" aria-label="入力金額の税区分">
                <button
                  className={taxMode === "excluded" ? "segment is-active" : "segment"}
                  type="button"
                  role="radio"
                  aria-checked={taxMode === "excluded"}
                  onClick={() => setTaxMode("excluded")}
                >
                  税抜
                </button>
                <button
                  className={taxMode === "included" ? "segment is-active" : "segment"}
                  type="button"
                  role="radio"
                  aria-checked={taxMode === "included"}
                  onClick={() => setTaxMode("included")}
                >
                  税込
                </button>
              </div>
            </div>
          </div>

          <div className="control-block" aria-label="割引率">
            <span>割引率</span>
            <div className="segments discount-rate-options" role="radiogroup" aria-label="割引率">
              {presetRates.map((rate) => (
                <button
                  className={presetRate === rate.value ? "segment is-active" : "segment"}
                  type="button"
                  role="radio"
                  aria-checked={presetRate === rate.value}
                  key={rate.value}
                  onClick={() => {
                    setPresetRate(rate.value);
                    setStatus("");
                  }}
                >
                  {rate.label}
                </button>
              ))}
            </div>
          </div>

          {presetRate === "custom" && (
            <label className="custom-rate">
              <span>その他の割引率</span>
              <input
                aria-label="その他の割引率"
                inputMode="decimal"
                placeholder="0"
                type="text"
                value={customRate}
                onChange={(event) => {
                  setCustomRate(event.target.value);
                  setStatus("");
                }}
                onFocus={() => {
                  if (isZeroInput(customRate)) {
                    setCustomRate("");
                  }
                }}
                onBlur={(event) => setCustomRate(restoreZeroInput(event.target.value))}
              />
              <strong>%</strong>
            </label>
          )}

          <div className="control-block" aria-label="割引の基準">
            <span>割引の基準</span>
            <div className="segments" role="radiogroup" aria-label="割引の基準">
              <button
                className={discountBase === "excluded" ? "segment is-active" : "segment"}
                type="button"
                role="radio"
                aria-checked={discountBase === "excluded"}
                onClick={() => setDiscountBase("excluded")}
              >
                税抜から割引
              </button>
              <button
                className={discountBase === "included" ? "segment is-active" : "segment"}
                type="button"
                role="radio"
                aria-checked={discountBase === "included"}
                onClick={() => setDiscountBase("included")}
              >
                税込から割引
              </button>
            </div>
          </div>

          <div className="primary-result discount-result" aria-live="polite">
            <span>{formatNumber(discountRatePercent, 2)}% 割引後</span>
            <strong>{formatYen(calculation.finalIncluded)}</strong>
            <small>税込 / 税率10%</small>
          </div>

          <div className="summary-list" aria-label="計算結果">
            <div className="summary-row">
              <span>割引前</span>
              <strong>{formatYen(calculation.originalIncluded)}</strong>
              <small>税抜 {formatYen(calculation.originalExcluded)}</small>
            </div>
            <div className="summary-row">
              <span>割引額</span>
              <strong>{formatYen(calculation.discountIncluded)}</strong>
              <small>基準額 {formatYen(calculation.discountBaseAmount)}</small>
            </div>
            <div className="summary-row">
              <span>割引後 税抜</span>
              <strong>{formatYen(calculation.finalExcluded)}</strong>
              <small>消費税 {formatYen(calculation.finalTax)}</small>
            </div>
          </div>

          <div className="tool-actions">
            <button className="icon-button" type="button" onClick={reset} aria-label="リセット">
              <span aria-hidden="true">↺</span>
            </button>
            <button type="button" onClick={copyResult} disabled={isInvalidAmount || isInvalidCustomRate}>
              結果をコピー
            </button>
          </div>

          <p className="status" role="status" aria-live="polite">
            {isInvalidAmount
              ? "金額は0以上の数字で入力してください"
              : isInvalidCustomRate
                ? "割引率は0以上の数字で入力してください"
                : status || "1円未満は四捨五入しています"}
          </p>
        </section>

        <aside className="visual-panel discount-visual" aria-label="割引イメージ">
          <div className="receipt-card">
            <span className="receipt-label">SALE</span>
            <strong>{formatNumber(discountRatePercent, 2)}% OFF</strong>
            <div className="receipt-lines">
              <span style={{ inlineSize: "74%" }} />
              <span style={{ inlineSize: "56%" }} />
              <span style={{ inlineSize: "66%" }} />
            </div>
            <div className="receipt-total">
              <span>税込</span>
              <strong>{formatYen(calculation.finalIncluded)}</strong>
            </div>
          </div>

          <div className="metric-board">
            <span>割引額</span>
            <strong>{formatYen(calculation.discountIncluded)}</strong>
            <small>
              {discountBase === "included" ? "税込" : "税抜"}から
              {formatNumber(discountRatePercent, 2)}%割引
            </small>
          </div>
        </aside>
      </section>
    </main>
  );
}
