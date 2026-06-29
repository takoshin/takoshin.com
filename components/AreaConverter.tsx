"use client";

import { useMemo, useState } from "react";
import {
  areaUnits,
  buildAreaValues,
  DEFAULT_TATAMI_SQM,
  formatAreaValue,
  formatNumber,
  fromSquareMeters,
  parsePositiveNumber,
  SQM_PER_TSUBO,
  toSquareMeters,
  type AreaUnit
} from "@/lib/conversions";

const tatamiOptions = [
  { label: "不動産", value: 1.62 },
  { label: "京間", value: 1.824 },
  { label: "中京間", value: 1.6562 },
  { label: "江戸間", value: 1.548 }
];

export function AreaConverter() {
  const [tatamiSqm, setTatamiSqm] = useState(DEFAULT_TATAMI_SQM);
  const [squareMeters, setSquareMeters] = useState(1);
  const [values, setValues] = useState(() => buildAreaValues(1, DEFAULT_TATAMI_SQM));
  const [activeUnit, setActiveUnit] = useState<AreaUnit>("sqm");
  const [status, setStatus] = useState("");

  const tsubo = fromSquareMeters(squareMeters, "tsubo", tatamiSqm);
  const jo = fromSquareMeters(squareMeters, "jo", tatamiSqm);

  const resultText = useMemo(() => {
    return `${formatAreaValue(squareMeters)}㎡ = ${formatAreaValue(tsubo)}坪 = ${formatAreaValue(jo)}畳`;
  }, [jo, squareMeters, tsubo]);

  const shareUrl = useMemo(() => {
    const text = encodeURIComponent(`面積換算: ${resultText}`);
    return `https://twitter.com/intent/tweet?text=${text}`;
  }, [resultText]);

  function updateFromValue(unit: AreaUnit, rawValue: string, nextTatamiSqm = tatamiSqm) {
    const parsed = parsePositiveNumber(rawValue);
    setActiveUnit(unit);

    if (parsed === null) {
      setValues((current) => ({
        ...current,
        [unit]: rawValue
      }));
      setStatus("数字を入力してください");
      return;
    }

    const nextSquareMeters = toSquareMeters(parsed, unit, nextTatamiSqm);
    setSquareMeters(nextSquareMeters);
    setValues({
      ...buildAreaValues(nextSquareMeters, nextTatamiSqm),
      [unit]: rawValue
    });
    setStatus("");
  }

  function changeTatamiBasis(nextTatamiSqm: number) {
    setTatamiSqm(nextTatamiSqm);

    const activeValue = parsePositiveNumber(values[activeUnit]);
    const nextSquareMeters =
      activeValue === null ? squareMeters : toSquareMeters(activeValue, activeUnit, nextTatamiSqm);

    setSquareMeters(nextSquareMeters);
    setValues(buildAreaValues(nextSquareMeters, nextTatamiSqm));
    setStatus(`${tatamiOptions.find((option) => option.value === nextTatamiSqm)?.label}の基準に変更しました`);
  }

  async function copyResult() {
    try {
      await navigator.clipboard.writeText(resultText);
      setStatus("結果をコピーしました");
    } catch {
      setStatus("コピーできませんでした");
    }
  }

  function resetValues() {
    setSquareMeters(1);
    setValues(buildAreaValues(1, tatamiSqm));
    setActiveUnit("sqm");
    setStatus("1㎡に戻しました");
  }

  return (
    <main className="tool-page area-page" aria-labelledby="page-title">
      <section className="tool-grid">
        <section className="tool-panel converter-panel" aria-label="面積換算">
          <div className="tool-head">
            <p className="eyebrow">Area Converter</p>
            <h1 id="page-title">㎡・坪・畳を変換</h1>
          </div>

          <div className="unit-list">
            {(Object.keys(areaUnits) as AreaUnit[]).map((unit) => (
              <label className="unit-row" key={unit}>
                <span className="unit-badge" aria-hidden="true">
                  {areaUnits[unit].badge}
                </span>
                <span className="unit-copy">
                  <span className="unit-label">{areaUnits[unit].label}</span>
                  <input
                    aria-label={areaUnits[unit].label}
                    inputMode="decimal"
                    type="text"
                    value={values[unit]}
                    onChange={(event) => updateFromValue(unit, event.target.value)}
                    onFocus={() => setActiveUnit(unit)}
                  />
                </span>
              </label>
            ))}
          </div>

          <div className="control-block" aria-label="畳の基準">
            <span>畳基準</span>
            <div className="segments" role="radiogroup" aria-label="畳の基準">
              {tatamiOptions.map((option) => {
                const isActive = option.value === tatamiSqm;

                return (
                  <button
                    className={isActive ? "segment is-active" : "segment"}
                    type="button"
                    key={option.value}
                    role="radio"
                    aria-checked={isActive}
                    onClick={() => changeTatamiBasis(option.value)}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>

          <output className="result-strip" aria-live="polite">
            {resultText}
          </output>

          <div className="quick-area" aria-label="よく使う面積">
            {[20, 30, 50, 70, 100].map((preset) => (
              <button
                type="button"
                key={preset}
                onClick={() => updateFromValue("sqm", String(preset))}
              >
                {preset}㎡
              </button>
            ))}
          </div>

          <div className="tool-actions">
            <button className="icon-button" type="button" onClick={resetValues} aria-label="リセット">
              <span aria-hidden="true">↺</span>
            </button>
            <button type="button" onClick={copyResult}>
              結果をコピー
            </button>
            <a href={shareUrl} target="_blank" rel="noopener noreferrer">
              Xで共有
            </a>
          </div>

          <p className="status" role="status" aria-live="polite">
            {status}
          </p>
        </section>

        <aside className="visual-panel area-visual" aria-label="面積イメージ">
          <div className="floor-stage">
            <div
              className="floor-shape"
              style={{
                inlineSize: `${Math.min(86, 22 + Math.sqrt(squareMeters) * 5.2)}%`,
                blockSize: `${Math.min(76, 18 + Math.sqrt(squareMeters) * 3.8)}%`
              }}
            >
              <span>{formatAreaValue(squareMeters)}㎡</span>
            </div>
          </div>

          <div className="metric-board">
            <span>現在の面積</span>
            <strong>{formatAreaValue(squareMeters)}㎡</strong>
            <small>
              {formatAreaValue(tsubo)}坪 / {formatAreaValue(jo)}畳
            </small>
          </div>
        </aside>
      </section>

      <section className="reference" aria-label="換算の目安">
        <div>
          <strong>1坪</strong>
          <span>{formatNumber(SQM_PER_TSUBO, 6)}㎡</span>
        </div>
        <div>
          <strong>1㎡</strong>
          <span>{formatNumber(1 / SQM_PER_TSUBO, 4)}坪</span>
        </div>
        <div>
          <strong>1畳</strong>
          <span>{formatNumber(tatamiSqm, 4)}㎡</span>
        </div>
      </section>
    </main>
  );
}
