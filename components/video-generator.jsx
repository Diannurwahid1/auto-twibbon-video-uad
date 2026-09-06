"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  CircleAlert,
  X,
  Download,
  Expand,
  ImageUp,
  Loader2,
  Move,
  MoveDownRight,
  Play,
  RotateCcw,
  Send,
  Share2,
  ZoomIn,
} from "lucide-react";

const DEFAULT_PLACEMENT = {
  scale: 1,
  x: 0,
  y: 0,
  rotation: 0,
};

const MAX_PHOTO_SIZE = 5 * 1024 * 1024;

const LOADING_MESSAGES = [
  "Sebentar ya, twibbon P2K kamu sedang dirapikan.",
  "Dibuat gratis oleh Dian Nurwahid untuk maba UAD 2026.",
  "Follow update tool ini di Instagram @denzhang1.",
  "diannurwahid.com sedang menyiapkan video kamu.",
  "Hasil akhir tetap Full HD dan suara template tetap aman.",
];

export default function VideoGenerator() {
  const inputRef = useRef(null);
  const editorFrameRef = useRef(null);
  const dragRef = useRef(null);
  const workerRef = useRef(null);
  const autoPreviewRef = useRef(null);
  const lastAutoPreviewKeyRef = useRef("");
  const [photoFile, setPhotoFile] = useState(null);
  const [photoUrl, setPhotoUrl] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");
  const [previewBlob, setPreviewBlob] = useState(null);
  const [downloadUrl, setDownloadUrl] = useState("");
  const [downloadBlob, setDownloadBlob] = useState(null);
  const [placement, setPlacement] = useState(DEFAULT_PLACEMENT);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [renderMode, setRenderMode] = useState("");
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState("Upload foto, atur posisi, lalu preview otomatis muncul.");
  const [error, setError] = useState("");
  const [floatingAlert, setFloatingAlert] = useState("");
  const isRendering = Boolean(renderMode);

  const loadingText = useMemo(() => {
    const index = Math.min(
      LOADING_MESSAGES.length - 1,
      Math.floor((progress / 100) * LOADING_MESSAGES.length),
    );
    return LOADING_MESSAGES[index] ?? LOADING_MESSAGES[0];
  }, [progress]);

  useEffect(() => () => {
    workerRef.current?.terminate();
    window.clearTimeout(autoPreviewRef.current);
  }, []);

  useEffect(() => {
    if (!isEditorOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isEditorOpen]);

  useEffect(() => {
    if (!photoFile || isRendering || isEditorOpen) return;
    const nextPreviewKey = getPreviewKey(photoFile, placement);
    if (lastAutoPreviewKeyRef.current === nextPreviewKey) return;
    setStatus("Penyesuaian tersimpan. Preview otomatis dimulai sebentar lagi.");
    window.clearTimeout(autoPreviewRef.current);
    autoPreviewRef.current = window.setTimeout(() => {
      lastAutoPreviewKeyRef.current = nextPreviewKey;
      renderVideo("preview", photoFile, placement);
    }, 650);
    return () => window.clearTimeout(autoPreviewRef.current);
  }, [photoFile, placement, isRendering, isEditorOpen]);

  useEffect(() => {
    if (!floatingAlert) return;
    const timer = window.setTimeout(() => setFloatingAlert(""), 4200);
    return () => window.clearTimeout(timer);
  }, [floatingAlert]);

  async function handlePhotoChange(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_PHOTO_SIZE) {
      resetOutputs();
      setPhotoFile(null);
      setPlacement(DEFAULT_PLACEMENT);
      setPhotoUrl((current) => replaceObjectUrl(current, ""));
      setFloatingAlert("Ukuran foto maksimal 5MB. Kompres atau pilih foto lain dulu.");
      setStatus("Foto terlalu besar untuk diproses.");
      if (inputRef.current) inputRef.current.value = "";
      return;
    }
    resetOutputs();
    setPlacement(DEFAULT_PLACEMENT);
    setPhotoUrl((current) => replaceObjectUrl(current, URL.createObjectURL(file)));
    setPhotoFile(file);
    setIsEditorOpen(true);
    setStatus("Foto masuk. Geser foto di dalam frame, lalu buat preview.");
  }

  function updatePlacement(key, value) {
    setDownloadUrl((current) => replaceObjectUrl(current, ""));
    setDownloadBlob(null);
    setPreviewUrl((current) => replaceObjectUrl(current, ""));
    setPreviewBlob(null);
    setProgress(0);
    setPlacement((current) => ({ ...current, [key]: Number(value) }));
  }

  function resetOutputs() {
    window.clearTimeout(autoPreviewRef.current);
    lastAutoPreviewKeyRef.current = "";
    setError("");
    setFloatingAlert("");
    setProgress(0);
    setPreviewUrl((current) => replaceObjectUrl(current, ""));
    setPreviewBlob(null);
    setDownloadUrl((current) => replaceObjectUrl(current, ""));
    setDownloadBlob(null);
    setStatus("Upload foto, atur posisi, lalu preview otomatis muncul.");
  }

  function resetAll() {
    resetOutputs();
    setPhotoFile(null);
    setPlacement(DEFAULT_PLACEMENT);
    setIsEditorOpen(false);
    setPhotoUrl((current) => replaceObjectUrl(current, ""));
    if (inputRef.current) inputRef.current.value = "";
  }

  function startDrag(event) {
    if (!photoFile || isRendering) return;
    const rect = editorFrameRef.current?.getBoundingClientRect();
    if (!rect) return;
    event.currentTarget.setPointerCapture?.(event.pointerId);
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      placement,
      rect,
    };
  }

  function moveDrag(event) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const nextX = clamp(drag.placement.x + (event.clientX - drag.startX) / drag.rect.width, -0.28, 0.28);
    const nextY = clamp(drag.placement.y + (event.clientY - drag.startY) / drag.rect.height, -0.28, 0.28);
    setDownloadUrl((current) => replaceObjectUrl(current, ""));
    setDownloadBlob(null);
    setPreviewUrl((current) => replaceObjectUrl(current, ""));
    setPreviewBlob(null);
    setProgress(0);
    setPlacement((current) => ({ ...current, x: nextX, y: nextY }));
  }

  function endDrag(event) {
    if (dragRef.current?.pointerId === event.pointerId) dragRef.current = null;
  }

  function finishEditor() {
    setIsEditorOpen(false);
    setStatus("Posisi foto disimpan. Preview otomatis sedang disiapkan.");
  }

  async function renderVideo(mode, file = photoFile, nextPlacement = placement) {
    if (!file || isRendering) return;
    if (!("VideoEncoder" in window) || !("VideoDecoder" in window)) {
      setError("Browser belum mendukung render video cepat. Gunakan Chrome atau Edge terbaru.");
      return;
    }

    window.clearTimeout(autoPreviewRef.current);
    setRenderMode(mode);
    setError("");
    setProgress(1);
    setStatus(mode === "preview" ? "Membuat preview ringan..." : "Membuat video Full HD...");

    try {
      const worker = ensureWorker();
      const photoBuffer = await file.arrayBuffer();
      worker.postMessage(
        { type: "render", mode, photo: photoBuffer, placement: nextPlacement },
        [photoBuffer],
      );
    } catch (renderError) {
      finishWithError(renderError.message);
    }
  }

  function ensureWorker() {
    if (workerRef.current) return workerRef.current;
    const worker = new Worker(new URL("../workers/video-render.worker.js", import.meta.url), {
      type: "module",
    });
    worker.onmessage = ({ data }) => {
      if (data.type === "progress") {
        setProgress(data.progress);
        if (data.message) setStatus(data.message);
        return;
      }
      if (data.type === "error") {
        finishWithError(data.message);
        return;
      }
      if (data.type === "complete") {
        const blob = new Blob([data.buffer], { type: "video/mp4" });
        const url = URL.createObjectURL(blob);
        setProgress(100);
        setRenderMode("");
        if (data.mode === "preview") {
          setPreviewUrl((current) => replaceObjectUrl(current, url));
          setPreviewBlob(blob);
          setStatus("Preview siap. Kalau posisinya sudah pas, unduh versi Full HD.");
        } else {
          setDownloadUrl((current) => replaceObjectUrl(current, url));
          setDownloadBlob(blob);
          setStatus("Video Full HD selesai. Klik Unduh HD Lagi kalau download belum muncul.");
        }
      }
    };
    worker.onerror = () => finishWithError("Render berhenti. Muat ulang halaman lalu coba lagi.");
    workerRef.current = worker;
    return worker;
  }

  function finishWithError(message) {
    setError(message || "Render gagal. Silakan coba lagi.");
    setStatus("Render berhenti sebelum selesai.");
    setRenderMode("");
  }

  async function shareVideo(target = "Instagram") {
    const blob = downloadBlob ?? previewBlob;
    if (!blob) return;

    const isFullHd = Boolean(downloadBlob);
    const file = new File(
      [blob],
      isFullHd ? "twibbon-p2k-prakarsa-uad-2026-full-hd.mp4" : "preview-twibbon-p2k.mp4",
      { type: "video/mp4" },
    );
    const shareData = {
      title: "Twibbon Video P2K Prakarsa UAD 2026",
      text: `Twibbon Video P2K siap dibagikan ke ${target}. Dibuat di diannurwahid.com`,
      files: [file],
    };

    try {
      if (navigator.canShare?.(shareData)) {
        await navigator.share(shareData);
        setStatus(`File siap dibagikan. Pilih ${target} di menu perangkat kamu.`);
        return;
      }
      window.open("https://www.instagram.com/", "_blank", "noopener,noreferrer");
      setStatus("Browser desktop tidak bisa mengirim file langsung. Unduh videonya, lalu upload lewat Instagram.");
    } catch (shareError) {
      if (shareError?.name === "AbortError") return;
      setStatus("Bagikan belum tersedia di browser ini. Gunakan tombol unduh lalu upload ke Instagram.");
    }
  }

  const hasShareableVideo = Boolean(previewBlob || downloadBlob);

  return (
    <section className="hero-tool" id="generator" aria-label="Generator Twibbon Video P2K">
      <div className="tool-panel glass-panel">
        <div className="tool-header">
          <span>Twibbon Video P2K</span>
          <strong>Upload, atur, preview, unduh.</strong>
        </div>

        <div className="tool-grid">
          <div className="upload-side">
            <input
              ref={inputRef}
              id="real-photo-upload"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handlePhotoChange}
            />
            <label className="real-upload" htmlFor="real-photo-upload">
              {!photoFile ? (
                <span className="upload-arrow" aria-hidden="true">
                  <MoveDownRight size={24} />
                </span>
              ) : null}
              {photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={photoUrl} alt="Foto yang dipilih" />
              ) : (
                <ImageUp size={34} />
              )}
              <span>
                <strong>{photoFile ? "Ganti Foto" : "Upload Foto"}</strong>
                <small>{photoFile ? photoFile.name : "JPG, PNG, WEBP - maks. 5MB"}</small>
              </span>
            </label>
            <div className="placement-panel">
              <div className="placement-title">
                <Move size={17} />
                <strong>Posisi Foto</strong>
              </div>
              <p>Geser foto langsung di frame agar wajah pas sebelum preview dibuat.</p>
              <button
                className="open-editor-button"
                type="button"
                onClick={() => setIsEditorOpen(true)}
                disabled={!photoFile || isRendering}
              >
                <Expand size={17} />
                Atur di Frame
              </button>
            </div>
          </div>

          <div className="preview-side">
            <div className="preview-frame">
              {previewUrl ? (
                <video src={previewUrl} controls playsInline />
              ) : (
                <div className="live-compose" style={previewStyle(placement)}>
                  {photoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={photoUrl} alt="Preview posisi foto" />
                  ) : null}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img className="template-frame" src="/editor-frame.png" alt="" />
                  {!photoUrl ? <Play size={40} fill="currentColor" /> : null}
                </div>
              )}
              {isRendering ? <RenderOverlay progress={progress} text={loadingText} /> : null}
            </div>

            <div className="progress-box" aria-live="polite">
              <div className="step-track">
                {["Upload", "Atur", "Preview", "Unduh"].map((item, index) => (
                  <span
                    className={
                      progress >= index * 28 || (index < 2 && photoFile) ? "active" : ""
                    }
                    key={item}
                  >
                    {item}
                  </span>
                ))}
              </div>
              <div className="progress-line">
                <span style={{ width: `${progress}%` }} />
              </div>
              <strong>{status}</strong>
              <p>
                {isRendering ? <Loader2 size={15} /> : <Play size={15} fill="currentColor" />}
                {isRendering ? loadingText : "Preview ringan, download tetap Full HD dengan suara asli."}
              </p>
              {error ? <small>{error}</small> : null}
            </div>

            {hasShareableVideo ? (
              <div className="share-panel">
                <div>
                  <strong>Bagikan video</strong>
                  <span>{downloadBlob ? "Versi Full HD siap dibagikan." : "Preview siap. Full HD tetap tersedia setelah dirender."}</span>
                </div>
                <div className="share-actions">
                  <button type="button" onClick={() => shareVideo("Instagram Post")}>
                    <Send size={16} />
                    Post
                  </button>
                  <button type="button" onClick={() => shareVideo("Instagram Reels")}>
                    <Play size={16} fill="currentColor" />
                    Reels
                  </button>
                  <button type="button" onClick={() => shareVideo("Instagram Story")}>
                    <Share2 size={16} />
                    Story
                  </button>
                  <button className="primary-tool-action" type="button" onClick={() => shareVideo("aplikasi pilihan")}>
                    <Share2 size={16} />
                    Bagikan
                  </button>
                </div>
              </div>
            ) : null}

            <div className="tool-actions">
              <button
                type="button"
                onClick={() => renderVideo("preview")}
                disabled={!photoFile || isRendering}
              >
                <Play size={17} fill="currentColor" />
                Preview
              </button>
              {downloadUrl ? (
                <button
                  className="download-ready"
                  type="button"
                  onClick={() => triggerDownload(downloadUrl, "twibbon-p2k-prakarsa-uad-2026-full-hd.mp4")}
                >
                  <Download size={17} />
                  Unduh HD Lagi
                </button>
              ) : (
                <button
                  className="primary-tool-action"
                  type="button"
                  onClick={() => renderVideo("hd")}
                  disabled={!previewUrl || isRendering}
                >
                  <Download size={17} />
                  Generate HD
                </button>
              )}
              <button type="button" onClick={resetAll} disabled={isRendering || !photoFile}>
                <RotateCcw size={17} />
                Reset
              </button>
            </div>
          </div>
        </div>
      </div>

      {isEditorOpen ? (
        <div className="editor-backdrop" role="dialog" aria-modal="true" aria-label="Atur letak foto">
          <div className="editor-modal glass-panel">
            <div className="editor-copy">
              <span>Atur Foto</span>
              <h2>Geser fotomu sampai pas di frame.</h2>
              <p>Drag foto di area preview. Setelah selesai, preview video akan dibuat otomatis.</p>
            </div>
            <div
              ref={editorFrameRef}
              className="editor-frame"
              style={previewStyle(placement)}
              onPointerDown={startDrag}
              onPointerMove={moveDrag}
              onPointerUp={endDrag}
              onPointerCancel={endDrag}
            >
              {photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={photoUrl} alt="Foto yang sedang diatur" draggable="false" />
              ) : null}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img className="template-frame" src="/editor-frame.png" alt="" draggable="false" />
              <div className="drag-hint">
                <Move size={16} />
                Drag foto
              </div>
            </div>
            <div className="editor-controls">
              <Control
                icon={ZoomIn}
                label="Zoom"
                min="0.8"
                max="1.45"
                step="0.01"
                value={placement.scale}
                suffix={`${Math.round(placement.scale * 100)}%`}
                onChange={(value) => updatePlacement("scale", value)}
                disabled={isRendering}
              />
              <Control
                icon={RotateCcw}
                label="Rotasi"
                min="-8"
                max="8"
                step="0.5"
                value={placement.rotation}
                suffix={`${placement.rotation}deg`}
                onChange={(value) => updatePlacement("rotation", value)}
                disabled={isRendering}
              />
            </div>
            <div className="editor-actions">
              <button type="button" onClick={() => setPlacement(DEFAULT_PLACEMENT)} disabled={isRendering}>
                <RotateCcw size={17} />
                Reset Posisi
              </button>
              <button className="primary-tool-action" type="button" onClick={finishEditor} disabled={isRendering}>
                <Check size={17} />
                Selesai, Buat Preview
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {floatingAlert ? (
        <div className="floating-alert" role="alert">
          <CircleAlert size={18} />
          <span>{floatingAlert}</span>
          <button type="button" onClick={() => setFloatingAlert("")} aria-label="Tutup notifikasi">
            <X size={16} />
          </button>
        </div>
      ) : null}
    </section>
  );
}

function RenderOverlay({ progress, text }) {
  return (
    <div className="render-overlay">
      <div className="render-orbit" style={{ "--progress": `${progress * 3.6}deg` }}>
        <Loader2 size={30} />
      </div>
      <strong>{Math.max(1, Math.round(progress))}%</strong>
      <span>{text}</span>
    </div>
  );
}

function Control({ icon: Icon, label, suffix, onChange, disabled, ...props }) {
  return (
    <label className="control-row">
      <span>
        <Icon size={15} />
        {label}
      </span>
      <input type="range" onChange={(event) => onChange(event.target.value)} disabled={disabled} {...props} />
      <small>{suffix}</small>
    </label>
  );
}

function previewStyle(placement) {
  return {
    "--photo-scale": placement.scale,
    "--photo-x": `${placement.x * 100}%`,
    "--photo-y": `${placement.y * 100}%`,
    "--photo-rotate": `${placement.rotation}deg`,
  };
}

function getPreviewKey(file, placement) {
  return [
    file.name,
    file.size,
    file.lastModified,
    placement.scale,
    placement.x,
    placement.y,
    placement.rotation,
  ].join(":");
}

function replaceObjectUrl(current, next) {
  if (current) URL.revokeObjectURL(current);
  return next;
}

function triggerDownload(url, filename) {
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  link.remove();
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}
