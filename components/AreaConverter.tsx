"use client";

import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
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

const MIN_DIMENSION_METERS = 0.2;
const MAX_RESIZE_DIMENSION_METERS = 80;
const MIN_SHAPE_PIXEL_SIZE = 72;
const DIMENSION_STEP_METERS = 0.1;
const STAGE_PADDING_PX = 44;
const DEFAULT_SHAPE_POSITION = { x: 0.5, y: 0.42 };

type FloorDimensions = {
  widthMeters: number;
  depthMeters: number;
};

type StageSize = {
  width: number;
  height: number;
};

function clamp(value: number, min: number, max: number) {
  if (min > max) {
    return (min + max) / 2;
  }

  return Math.min(Math.max(value, min), max);
}

function isZeroInput(value: string) {
  return parsePositiveNumber(value) === 0;
}

function formatDimension(value: number) {
  return formatNumber(value, 1);
}

function snapDimension(value: number) {
  return Math.round(value / DIMENSION_STEP_METERS) * DIMENSION_STEP_METERS;
}

function resizeDimensionsToArea(area: number, currentDimensions: FloorDimensions) {
  if (area <= 0) {
    return {
      widthMeters: 0,
      depthMeters: 0
    };
  }

  const aspect =
    currentDimensions.widthMeters > 0 && currentDimensions.depthMeters > 0
      ? currentDimensions.widthMeters / currentDimensions.depthMeters
      : 1;

  const widthMeters = Math.sqrt(area * aspect);
  const depthMeters = area / widthMeters;

  return { widthMeters, depthMeters };
}

function getWorkspaceHeight(stageSize: StageSize, metricBoardHeight: number) {
  if (stageSize.height === 0) {
    return 0;
  }

  return Math.max(160, stageSize.height - metricBoardHeight - 32);
}

function getPixelsPerMeter(
  dimensions: FloorDimensions,
  stageSize: StageSize,
  metricBoardHeight: number
) {
  if (stageSize.width === 0 || stageSize.height === 0) {
    return 120;
  }

  const workspaceHeight = getWorkspaceHeight(stageSize, metricBoardHeight);
  const availableWidth = Math.max(120, stageSize.width - STAGE_PADDING_PX * 2);
  const availableHeight = Math.max(120, workspaceHeight - STAGE_PADDING_PX * 2);
  const baseScale = Math.min(availableWidth, availableHeight) * 0.26;
  const fitScale = Math.min(
    availableWidth / Math.max(dimensions.widthMeters, MIN_DIMENSION_METERS),
    availableHeight / Math.max(dimensions.depthMeters, MIN_DIMENSION_METERS)
  );

  return Math.max(4, Math.min(baseScale, fitScale));
}

function clampShapePosition(
  position: { x: number; y: number },
  dimensions: FloorDimensions,
  stageSize: StageSize,
  metricBoardHeight: number
) {
  if (stageSize.width === 0 || stageSize.height === 0) {
    return position;
  }

  const pixelsPerMeter = getPixelsPerMeter(dimensions, stageSize, metricBoardHeight);
  const shapeWidth = Math.max(MIN_SHAPE_PIXEL_SIZE, dimensions.widthMeters * pixelsPerMeter);
  const shapeHeight = Math.max(MIN_SHAPE_PIXEL_SIZE, dimensions.depthMeters * pixelsPerMeter);
  const workspaceHeight = getWorkspaceHeight(stageSize, metricBoardHeight);
  const centerX = position.x * stageSize.width;
  const centerY = position.y * stageSize.height;
  const nextCenterX = clamp(
    centerX,
    STAGE_PADDING_PX + shapeWidth / 2,
    stageSize.width - STAGE_PADDING_PX - shapeWidth / 2
  );
  const nextCenterY = clamp(
    centerY,
    STAGE_PADDING_PX + shapeHeight / 2,
    workspaceHeight - STAGE_PADDING_PX - shapeHeight / 2
  );

  return {
    x: nextCenterX / stageSize.width,
    y: nextCenterY / stageSize.height
  };
}

export function AreaConverter() {
  const [tatamiSqm, setTatamiSqm] = useState(DEFAULT_TATAMI_SQM);
  const [squareMeters, setSquareMeters] = useState(0);
  const [floorDimensions, setFloorDimensions] = useState<FloorDimensions>({
    widthMeters: 0,
    depthMeters: 0
  });
  const [shapePosition, setShapePosition] = useState(DEFAULT_SHAPE_POSITION);
  const [stageSize, setStageSize] = useState<StageSize>({ width: 0, height: 0 });
  const [metricBoardHeight, setMetricBoardHeight] = useState(0);
  const [values, setValues] = useState(() => buildAreaValues(0, DEFAULT_TATAMI_SQM));
  const [activeUnit, setActiveUnit] = useState<AreaUnit>("sqm");
  const [status, setStatus] = useState("");
  const stageRef = useRef<HTMLDivElement>(null);
  const metricBoardRef = useRef<HTMLDivElement>(null);

  const tsubo = fromSquareMeters(squareMeters, "tsubo", tatamiSqm);
  const jo = fromSquareMeters(squareMeters, "jo", tatamiSqm);
  const pixelsPerMeter = useMemo(
    () => getPixelsPerMeter(floorDimensions, stageSize, metricBoardHeight),
    [floorDimensions, metricBoardHeight, stageSize]
  );
  const shapePixelSize = useMemo(
    () => ({
      width: Math.max(MIN_SHAPE_PIXEL_SIZE, floorDimensions.widthMeters * pixelsPerMeter),
      height: Math.max(MIN_SHAPE_PIXEL_SIZE, floorDimensions.depthMeters * pixelsPerMeter)
    }),
    [floorDimensions, pixelsPerMeter]
  );

  const resultText = useMemo(() => {
    return `${formatAreaValue(squareMeters)}㎡ = ${formatAreaValue(tsubo)}坪 = ${formatAreaValue(jo)}畳`;
  }, [jo, squareMeters, tsubo]);

  const shareUrl = useMemo(() => {
    const text = encodeURIComponent(`面積換算: ${resultText}`);
    return `https://twitter.com/intent/tweet?text=${text}`;
  }, [resultText]);

  useEffect(() => {
    const stage = stageRef.current;
    const metricBoard = metricBoardRef.current;

    if (!stage) {
      return undefined;
    }

    const updateMeasurements = () => {
      setStageSize({
        width: stage.clientWidth,
        height: stage.clientHeight
      });
      setMetricBoardHeight(metricBoard?.offsetHeight ?? 0);
    };

    const observer = new ResizeObserver(updateMeasurements);
    observer.observe(stage);

    if (metricBoard) {
      observer.observe(metricBoard);
    }

    updateMeasurements();

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    setShapePosition((current) => {
      const next = clampShapePosition(current, floorDimensions, stageSize, metricBoardHeight);

      if (Math.abs(next.x - current.x) < 0.0001 && Math.abs(next.y - current.y) < 0.0001) {
        return current;
      }

      return next;
    });
  }, [floorDimensions, metricBoardHeight, stageSize]);

  function syncAreaFromDimensions(nextDimensions: FloorDimensions) {
    const safeDimensions = {
      widthMeters: Math.max(MIN_DIMENSION_METERS, nextDimensions.widthMeters),
      depthMeters: Math.max(MIN_DIMENSION_METERS, nextDimensions.depthMeters)
    };
    const nextSquareMeters = safeDimensions.widthMeters * safeDimensions.depthMeters;

    setFloorDimensions(safeDimensions);
    setSquareMeters(nextSquareMeters);
    setValues(buildAreaValues(nextSquareMeters, tatamiSqm));
    setActiveUnit("sqm");
  }

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
    setFloorDimensions((current) => resizeDimensionsToArea(nextSquareMeters, current));
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
    setSquareMeters(0);
    setFloorDimensions({ widthMeters: 0, depthMeters: 0 });
    setShapePosition(DEFAULT_SHAPE_POSITION);
    setValues(buildAreaValues(0, tatamiSqm));
    setActiveUnit("sqm");
    setStatus("0㎡に戻しました");
  }

  function beginMove(event: ReactPointerEvent<HTMLDivElement>) {
    const stage = stageRef.current;

    if (!stage || stageSize.width === 0 || stageSize.height === 0) {
      return;
    }

    event.preventDefault();

    const startX = event.clientX;
    const startY = event.clientY;
    const startPosition = shapePosition;

    function handlePointerMove(moveEvent: PointerEvent) {
      const nextPosition = {
        x: (startPosition.x * stageSize.width + moveEvent.clientX - startX) / stageSize.width,
        y: (startPosition.y * stageSize.height + moveEvent.clientY - startY) / stageSize.height
      };

      setShapePosition(
        clampShapePosition(nextPosition, floorDimensions, stageSize, metricBoardHeight)
      );
    }

    function stopDragging() {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", stopDragging);
      window.removeEventListener("pointercancel", stopDragging);
    }

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", stopDragging);
    window.addEventListener("pointercancel", stopDragging);
  }

  function beginResize(axis: "width" | "depth" | "both", event: ReactPointerEvent<HTMLButtonElement>) {
    if (stageSize.width === 0 || stageSize.height === 0) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    const startX = event.clientX;
    const startY = event.clientY;
    const startDimensions = floorDimensions;
    const startPosition = shapePosition;
    const startPixelsPerMeter = pixelsPerMeter;
    const startWidthPixels = Math.max(
      MIN_SHAPE_PIXEL_SIZE,
      startDimensions.widthMeters * startPixelsPerMeter
    );
    const startDepthPixels = Math.max(
      MIN_SHAPE_PIXEL_SIZE,
      startDimensions.depthMeters * startPixelsPerMeter
    );
    const startLeft = startPosition.x * stageSize.width - startWidthPixels / 2;
    const startTop = startPosition.y * stageSize.height - startDepthPixels / 2;

    function handlePointerMove(moveEvent: PointerEvent) {
      const deltaWidth = axis === "depth" ? 0 : (moveEvent.clientX - startX) / startPixelsPerMeter;
      const deltaDepth = axis === "width" ? 0 : (moveEvent.clientY - startY) / startPixelsPerMeter;
      const nextDimensions = {
        widthMeters: clamp(
          snapDimension(startDimensions.widthMeters + deltaWidth),
          MIN_DIMENSION_METERS,
          MAX_RESIZE_DIMENSION_METERS
        ),
        depthMeters: clamp(
          snapDimension(startDimensions.depthMeters + deltaDepth),
          MIN_DIMENSION_METERS,
          MAX_RESIZE_DIMENSION_METERS
        )
      };
      const nextWidthPixels = Math.max(
        MIN_SHAPE_PIXEL_SIZE,
        nextDimensions.widthMeters * startPixelsPerMeter
      );
      const nextDepthPixels = Math.max(
        MIN_SHAPE_PIXEL_SIZE,
        nextDimensions.depthMeters * startPixelsPerMeter
      );
      const nextPosition = {
        x: (startLeft + nextWidthPixels / 2) / stageSize.width,
        y: (startTop + nextDepthPixels / 2) / stageSize.height
      };

      syncAreaFromDimensions(nextDimensions);
      setShapePosition(
        clampShapePosition(nextPosition, nextDimensions, stageSize, metricBoardHeight)
      );
    }

    function stopResizing() {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", stopResizing);
      window.removeEventListener("pointercancel", stopResizing);
    }

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", stopResizing);
    window.addEventListener("pointercancel", stopResizing);
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
                    placeholder="0"
                    type="text"
                    value={values[unit]}
                    onChange={(event) => updateFromValue(unit, event.target.value)}
                    onFocus={() => {
                      setActiveUnit(unit);
                      if (isZeroInput(values[unit])) {
                        setValues((current) => ({
                          ...current,
                          [unit]: ""
                        }));
                      }
                    }}
                    onBlur={(event) => {
                      if (event.target.value.trim() === "") {
                        updateFromValue(unit, "0");
                      }
                    }}
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
          <div className="floor-stage" ref={stageRef}>
            <div
              className="floor-shape"
              role="group"
              aria-label={`横 ${formatDimension(floorDimensions.widthMeters)}m、縦 ${formatDimension(
                floorDimensions.depthMeters
              )}m、面積 ${formatAreaValue(squareMeters)}㎡`}
              onPointerDown={beginMove}
              style={{
                inlineSize: `${shapePixelSize.width}px`,
                blockSize: `${shapePixelSize.height}px`,
                insetInlineStart: `${shapePosition.x * 100}%`,
                insetBlockStart: `${shapePosition.y * 100}%`
              }}
            >
              <small className="shape-dimension shape-width">
                横 {formatDimension(floorDimensions.widthMeters)}m
              </small>
              <small className="shape-dimension shape-depth">
                縦 {formatDimension(floorDimensions.depthMeters)}m
              </small>
              <button
                className="resize-handle resize-handle-x"
                type="button"
                aria-label="横幅を変更"
                onPointerDown={(event) => beginResize("width", event)}
              />
              <button
                className="resize-handle resize-handle-y"
                type="button"
                aria-label="縦幅を変更"
                onPointerDown={(event) => beginResize("depth", event)}
              />
              <button
                className="resize-handle resize-handle-corner"
                type="button"
                aria-label="縦横を変更"
                onPointerDown={(event) => beginResize("both", event)}
              />
            </div>
          </div>

          <div className="metric-board" ref={metricBoardRef}>
            <span>現在の面積</span>
            <strong>{formatAreaValue(squareMeters)}㎡</strong>
            <small>
              {formatAreaValue(tsubo)}坪 / {formatAreaValue(jo)}畳
            </small>
            <div className="dimension-readout" aria-label="縦横の長さ">
              <b>横 {formatDimension(floorDimensions.widthMeters)}m</b>
              <b>縦 {formatDimension(floorDimensions.depthMeters)}m</b>
            </div>
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
