"use client";

import { ChangeEvent, DragEvent, useEffect, useMemo, useRef, useState } from "react";

type OutputFormat = "image/jpeg" | "image/png" | "image/webp";

const outputFormats: Array<{ label: string; value: OutputFormat; extension: string }> = [
  { label: "JPEG", value: "image/jpeg", extension: "jpg" },
  { label: "PNG", value: "image/png", extension: "png" },
  { label: "WebP", value: "image/webp", extension: "webp" }
];

function formatBytes(bytes: number) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

function getOutputName(filename: string, extension: string) {
  const base = filename.replace(/\.[^.]+$/, "");
  return `${base || "converted"}.${extension}`;
}

export function ImageConverter() {
  const [file, setFile] = useState<File | null>(null);
  const [sourceUrl, setSourceUrl] = useState("");
  const [outputUrl, setOutputUrl] = useState("");
  const [outputName, setOutputName] = useState("converted.png");
  const [outputSize, setOutputSize] = useState<number | null>(null);
  const [targetFormat, setTargetFormat] = useState<OutputFormat>("image/png");
  const [quality, setQuality] = useState(0.92);
  const [error, setError] = useState("");
  const [isConverting, setIsConverting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const selectedFormat = useMemo(
    () => outputFormats.find((format) => format.value === targetFormat) ?? outputFormats[1],
    [targetFormat]
  );

  useEffect(() => {
    return () => {
      if (sourceUrl) {
        URL.revokeObjectURL(sourceUrl);
      }
      if (outputUrl) {
        URL.revokeObjectURL(outputUrl);
      }
    };
  }, [outputUrl, sourceUrl]);

  function selectFile(nextFile: File | undefined) {
    if (!nextFile) {
      return;
    }

    if (!["image/jpeg", "image/png", "image/webp"].includes(nextFile.type)) {
      setError("JPEG、PNG、WebPの画像を選択してください");
      return;
    }

    if (sourceUrl) {
      URL.revokeObjectURL(sourceUrl);
    }
    if (outputUrl) {
      URL.revokeObjectURL(outputUrl);
    }

    setFile(nextFile);
    setSourceUrl(URL.createObjectURL(nextFile));
    setOutputUrl("");
    setOutputSize(null);
    setOutputName(getOutputName(nextFile.name, selectedFormat.extension));
    setError("");
  }

  function onFileChange(event: ChangeEvent<HTMLInputElement>) {
    selectFile(event.target.files?.[0]);
  }

  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    selectFile(event.dataTransfer.files?.[0]);
  }

  async function convertImage() {
    if (!file || !sourceUrl) {
      setError("変換する画像を選択してください");
      return;
    }

    setIsConverting(true);
    setError("");

    try {
      const image = new Image();
      image.src = sourceUrl;
      await image.decode();

      const canvas = document.createElement("canvas");
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;

      const context = canvas.getContext("2d");

      if (!context) {
        throw new Error("Canvas is not supported");
      }

      if (targetFormat === "image/jpeg") {
        context.fillStyle = "#ffffff";
        context.fillRect(0, 0, canvas.width, canvas.height);
      }

      context.drawImage(image, 0, 0);

      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob(resolve, targetFormat, quality);
      });

      if (!blob) {
        throw new Error("Conversion failed");
      }

      if (outputUrl) {
        URL.revokeObjectURL(outputUrl);
      }

      setOutputUrl(URL.createObjectURL(blob));
      setOutputSize(blob.size);
      setOutputName(getOutputName(file.name, selectedFormat.extension));
    } catch {
      setError("この画像は変換できませんでした");
    } finally {
      setIsConverting(false);
    }
  }

  return (
    <main className="tool-page image-page" aria-labelledby="page-title">
      <section className="tool-grid">
        <section className="tool-panel converter-panel" aria-label="画像形式変換">
          <div className="tool-head">
            <p className="eyebrow">Image Converter</p>
            <h1 id="page-title">画像形式を変換</h1>
          </div>

          <div
            className="drop-zone"
            onDragOver={(event) => event.preventDefault()}
            onDrop={onDrop}
            onClick={() => fileInputRef.current?.click()}
            role="button"
            tabIndex={0}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                fileInputRef.current?.click();
              }
            }}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={onFileChange}
            />
            <span aria-hidden="true">＋</span>
            <strong>{file ? file.name : "画像を選択"}</strong>
            <small>JPEG / PNG / WebP</small>
          </div>

          <div className="control-block">
            <span>変換先</span>
            <div className="segments" role="radiogroup" aria-label="変換先">
              {outputFormats.map((format) => {
                const isActive = format.value === targetFormat;

                return (
                  <button
                    className={isActive ? "segment is-active" : "segment"}
                    type="button"
                    key={format.value}
                    role="radio"
                    aria-checked={isActive}
                    onClick={() => {
                      setTargetFormat(format.value);
                      if (file) {
                        setOutputName(getOutputName(file.name, format.extension));
                      }
                    }}
                  >
                    {format.label}
                  </button>
                );
              })}
            </div>
          </div>

          {targetFormat !== "image/png" && (
            <label className="quality-control">
              <span>画質 {Math.round(quality * 100)}%</span>
              <input
                type="range"
                min="0.4"
                max="1"
                step="0.01"
                value={quality}
                onChange={(event) => setQuality(Number(event.target.value))}
              />
            </label>
          )}

          <div className="tool-actions">
            <button type="button" onClick={convertImage} disabled={isConverting}>
              {isConverting ? "変換中" : "変換する"}
            </button>
            {outputUrl && (
              <a href={outputUrl} download={outputName}>
                ダウンロード
              </a>
            )}
          </div>

          <p className="status" role="status" aria-live="polite">
            {error ||
              (outputSize !== null
                ? `変換後: ${outputName} / ${formatBytes(outputSize)}`
                : file
                  ? `元画像: ${formatBytes(file.size)}`
                  : "")}
          </p>
        </section>

        <aside className="visual-panel image-visual" aria-label="画像プレビュー">
          <div className="preview-frame">
            {sourceUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={sourceUrl} alt="変換する画像のプレビュー" />
            ) : (
              <div className="preview-placeholder" aria-hidden="true">
                <span>JPEG</span>
                <span>PNG</span>
                <span>WebP</span>
              </div>
            )}
          </div>

          <div className="metric-board">
            <span>出力形式</span>
            <strong>{selectedFormat.label}</strong>
            <small>{file ? outputName : "画像を選択してください"}</small>
          </div>
        </aside>
      </section>
    </main>
  );
}
