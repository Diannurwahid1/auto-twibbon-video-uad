"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  CircleAlert,
  Copy,
  X,
  Download,
  ExternalLink,
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
const FEB_TEMPLATE_URL = "/Vidio%20twibbon_FEB.mp4";
const FEB_TEMPLATE_NAME = "Template FEB UAD";
const FOLLOW_GATE_KEY = "p2k-tools-follow-gate-clicked";
const FOLLOW_POST_URL = "https://www.instagram.com/denzhang1/p/DdLxO8Knd6v/?hl=id&img_index=2";
const FOLLOW_POST_THUMB =
  "https://scontent.cdninstagram.com/v/t51.82787-15/807682558_18361542139300227_4688884255262221001_n.jpg?stp=cmp1_dst-jpg_e35_s640x640_tt6&_nc_cat=105&ccb=7-5&_nc_sid=18de74&efg=eyJlZmdfdGFnIjoiQ0FST1VTRUxfSVRFTS5iZXN0X2ltYWdlX3VybGdlbi5DMyJ9&_nc_ohc=eIwHVK_tpG0Q7kNvwGl5T4a&_nc_oc=AdqCkeUUPjj3IzeMghvZiNrGrAlfTQNDOuIAnoHS2F2aAwMorugCr6BVMlGYu_OyHnY&_nc_zt=23&_nc_ht=scontent.cdninstagram.com&_nc_gid=pSmc_S99wW9QjZpOUMOwQg&_nc_ss=70689&oh=00_AQJkT2188CsJYNIjBiqlSJwhsw-lRGEGFsSS9Qscodu2CA&oe=6AAAFD2C";
const DEFAULT_CHROMA = {
  start: 17,
  end: 9999,
  keyColor: "#62ff53",
  sensitivity: 0.11,
  smoothness: 0.16,
};

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
  const [activeMode, setActiveMode] = useState("feb");
  const [photoFile, setPhotoFile] = useState(null);
  const [photoBuffer, setPhotoBuffer] = useState(null);
  const [photoUrl, setPhotoUrl] = useState("");
  const [templateFile, setTemplateFile] = useState(null);
  const [templateBuffer, setTemplateBuffer] = useState(null);
  const [templateUrl, setTemplateUrl] = useState("");
  const [templateMeta, setTemplateMeta] = useState(null);
  const [customFrameUrl, setCustomFrameUrl] = useState("");
  const [chroma, setChroma] = useState(DEFAULT_CHROMA);
  const [isDetectingTemplate, setIsDetectingTemplate] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState("");
  const [downloadBlob, setDownloadBlob] = useState(null);
  const [placement, setPlacement] = useState(DEFAULT_PLACEMENT);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [renderMode, setRenderMode] = useState("");
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState("Upload foto, atur posisi, lalu generate video HD.");
  const [error, setError] = useState("");
  const [floatingAlert, setFloatingAlert] = useState("");
  const [captionName, setCaptionName] = useState("");
  const [captionProgram, setCaptionProgram] = useState("");
  const [captionFaculty, setCaptionFaculty] = useState("");
  const [isCaptionCopied, setIsCaptionCopied] = useState(false);
  const [showRenderBrowserNotice, setShowRenderBrowserNotice] = useState(false);
  const [isAndroidDevice, setIsAndroidDevice] = useState(false);
  const [isRenderLinkCopied, setIsRenderLinkCopied] = useState(false);
  const [hasClickedFollowGate, setHasClickedFollowGate] = useState(false);
  const [showFollowGate, setShowFollowGate] = useState(false);
  const [pendingRender, setPendingRender] = useState(null);
  const isRendering = Boolean(renderMode);
  const isCustomMode = activeMode === "feb";
  const canGenerate = photoFile && photoBuffer && (!isCustomMode || templateBuffer);

  const loadingText = useMemo(() => {
    const index = Math.min(
      LOADING_MESSAGES.length - 1,
      Math.floor((progress / 100) * LOADING_MESSAGES.length),
    );
    if (isCustomMode) {
      const customMessages = [
        "Template FEB sedang diproses langsung di browser.",
        "Area green screen dipakai sebagai ruang foto otomatis.",
        "Foto, audio, dan video sedang disusun jadi MP4.",
        "Jika browser menolak, coba Chrome desktop atau HP lain.",
        "Hasil akhir tetap siap diunduh dan dibagikan.",
      ];
      return customMessages[index] ?? customMessages[0];
    }
    return LOADING_MESSAGES[index] ?? LOADING_MESSAGES[0];
  }, [isCustomMode, progress]);

  const generatedCaption = useMemo(
    () =>
      buildP2kCaption({
        name: captionName,
        program: captionProgram,
        faculty: captionFaculty,
      }),
    [captionName, captionProgram, captionFaculty],
  );

  useEffect(() => () => {
    workerRef.current?.terminate();
  }, []);

  useEffect(() => {
    setIsAndroidDevice(/Android/i.test(navigator.userAgent || ""));
    setHasClickedFollowGate(localStorage.getItem(FOLLOW_GATE_KEY) === "true");
  }, []);

  useEffect(() => {
    useFebTemplate({ silent: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      setPhotoBuffer(null);
      setPlacement(DEFAULT_PLACEMENT);
      setPhotoUrl((current) => replaceObjectUrl(current, ""));
      setFloatingAlert("Ukuran foto maksimal 5MB. Kompres atau pilih foto lain dulu.");
      setStatus("Foto terlalu besar untuk diproses.");
      if (inputRef.current) inputRef.current.value = "";
      return;
    }
    resetOutputs();
    setShowRenderBrowserNotice(false);

    try {
      const buffer = await file.arrayBuffer();
      setPlacement(DEFAULT_PLACEMENT);
      setPhotoUrl((current) => replaceObjectUrl(current, URL.createObjectURL(file)));
      setPhotoFile(file);
      setPhotoBuffer(buffer);
      setIsEditorOpen(true);
      setStatus("Foto masuk. Geser foto di dalam frame, lalu generate HD.");
    } catch {
      setPhotoFile(null);
      setPhotoBuffer(null);
      setPhotoUrl((current) => replaceObjectUrl(current, ""));
      setStatus("Foto gagal dibaca browser.");
      setError("Browser gagal membaca foto. Buka lewat Chrome/Safari lalu pilih foto dari Galeri lokal.");
      setShowRenderBrowserNotice(true);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function useFebTemplate(options = {}) {
    if (isRendering || isDetectingTemplate) return;
    if (options.silent && templateBuffer) return;
    try {
      const response = await fetch(FEB_TEMPLATE_URL, { cache: "force-cache" });
      if (!response.ok) throw new Error("Template FEB gagal dimuat.");
      const buffer = await response.arrayBuffer();
      const url = URL.createObjectURL(new Blob([buffer], { type: "video/mp4" }));
      await processTemplate({
        buffer,
        name: FEB_TEMPLATE_NAME,
        url,
        shouldRevokeInputUrl: false,
      });
    } catch (templateError) {
      finishTemplateWithError(templateError?.message || "Template FEB belum bisa dimuat. Coba refresh halaman.");
    }
  }

  async function processTemplate({ buffer, name, url, shouldRevokeInputUrl }) {
    resetOutputs();
    setActiveMode("feb");
    setIsDetectingTemplate(true);
    setStatus("Membaca template dan mendeteksi green screen...");
    setError("");
    setTemplateFile({ name });
    setTemplateBuffer(buffer);
    setTemplateMeta(null);
    setTemplateUrl((current) => replaceObjectUrl(current, url));
    setCustomFrameUrl((current) => replaceObjectUrl(current, ""));

    try {
      const detected = await detectGreenScreen(url);
      setChroma(detected.chroma);
      setTemplateMeta(detected.meta);
      setCustomFrameUrl((current) => replaceObjectUrl(current, detected.frameUrl));
      setStatus(`Green screen terdeteksi mulai ${formatSeconds(detected.chroma.start)} sampai ${formatSeconds(detected.chroma.end)}.`);
    } catch (detectError) {
      setChroma({ ...DEFAULT_CHROMA, start: 0, end: 9999 });
      setTemplateMeta(null);
      setCustomFrameUrl((current) => replaceObjectUrl(current, ""));
      setError(detectError?.message || "Green screen belum bisa dideteksi otomatis. Atur timing manual.");
      setStatus("Template masuk, tetapi timing green screen perlu dicek manual.");
    } finally {
      if (shouldRevokeInputUrl) URL.revokeObjectURL(url);
      setIsDetectingTemplate(false);
    }
  }

  function finishTemplateWithError(message) {
    setIsDetectingTemplate(false);
    setError(message);
    setStatus("Template gagal diproses.");
    setFloatingAlert(message);
  }

  function switchMode(nextMode) {
    if (nextMode === activeMode || isRendering) return;
    resetOutputs();
    setActiveMode(nextMode);
    setStatus(
      nextMode === "feb"
        ? "Template FEB sudah siap. Upload foto, atur posisi, lalu generate HD."
        : "Upload foto, atur posisi, lalu generate video HD.",
    );
  }

  function updateChroma(key, value) {
    setDownloadUrl((current) => replaceObjectUrl(current, ""));
    setDownloadBlob(null);
    setProgress(0);
    setChroma((current) => ({ ...current, [key]: key === "keyColor" ? value : Number(value) }));
  }

  function updatePlacement(key, value) {
    setDownloadUrl((current) => replaceObjectUrl(current, ""));
    setDownloadBlob(null);
    setProgress(0);
    setPlacement((current) => ({ ...current, [key]: Number(value) }));
  }

  function resetOutputs() {
    setError("");
    setFloatingAlert("");
    setShowRenderBrowserNotice(false);
    setProgress(0);
    setDownloadUrl((current) => replaceObjectUrl(current, ""));
    setDownloadBlob(null);
    setStatus("Upload foto, atur posisi, lalu generate video HD.");
  }

  function resetAll() {
    resetOutputs();
    setPhotoFile(null);
    setPhotoBuffer(null);
    setTemplateFile(null);
    setTemplateBuffer(null);
    setTemplateMeta(null);
    setTemplateUrl((current) => replaceObjectUrl(current, ""));
    setCustomFrameUrl((current) => replaceObjectUrl(current, ""));
    setChroma(DEFAULT_CHROMA);
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
    setProgress(0);
    setPlacement((current) => ({ ...current, x: nextX, y: nextY }));
  }

  function endDrag(event) {
    if (dragRef.current?.pointerId === event.pointerId) dragRef.current = null;
  }

  function finishEditor() {
    setIsEditorOpen(false);
    setStatus("Posisi foto disimpan. Klik Generate HD untuk membuat video final.");
  }

  async function renderVideo(mode, nextPlacement = placement, bypassFollowGate = false) {
    if (!canGenerate || isRendering) return;
    if (!bypassFollowGate && !hasClickedFollowGate) {
      setPendingRender({ mode, placement: nextPlacement });
      setShowFollowGate(true);
      return;
    }
    if (!("VideoEncoder" in window) || !("VideoDecoder" in window)) {
      setError("Browser belum mendukung render video cepat. Gunakan Chrome atau Edge terbaru.");
      setShowRenderBrowserNotice(true);
      return;
    }

    setRenderMode(mode);
    setError("");
    setShowRenderBrowserNotice(false);
    setProgress(1);
    setStatus("Membuat video Full HD...");

    try {
      const worker = ensureWorker();
      const renderBuffer = photoBuffer.slice(0);
      const renderTemplateBuffer = isCustomMode ? templateBuffer.slice(0) : null;
      const transferList = renderTemplateBuffer ? [renderBuffer, renderTemplateBuffer] : [renderBuffer];
      worker.postMessage(
        {
          type: "render",
          mode,
          photo: renderBuffer,
          template: renderTemplateBuffer,
          placement: { ...nextPlacement, fit: isCustomMode ? "contain" : "cover" },
          chroma: isCustomMode ? chroma : DEFAULT_CHROMA,
        },
        transferList,
      );
    } catch (renderError) {
      finishWithError(renderError.message);
    }
  }

  function followAndContinue() {
    localStorage.setItem(FOLLOW_GATE_KEY, "true");
    setHasClickedFollowGate(true);
    setShowFollowGate(false);
    window.open(FOLLOW_POST_URL, "_blank", "noopener,noreferrer");
    const nextRender = pendingRender;
    setPendingRender(null);
    if (nextRender) {
      window.setTimeout(() => {
        renderVideo(nextRender.mode, nextRender.placement, true);
      }, 450);
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
        setDownloadUrl((current) => replaceObjectUrl(current, url));
        setDownloadBlob(blob);
        setStatus("Video Full HD selesai. Klik Unduh HD untuk menyimpan file.");
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
    setShowRenderBrowserNotice(true);
  }

  async function copyRenderLink() {
    const url = window.location.href;
    try {
      await navigator.clipboard.writeText(url);
      setIsRenderLinkCopied(true);
      window.setTimeout(() => setIsRenderLinkCopied(false), 2200);
    } catch {
      window.prompt("Salin link ini lalu buka di Chrome/Safari:", url);
    }
  }

  function openRenderInBrowser() {
    const url = window.location.href;
    if (isAndroidDevice) {
      const parsed = new URL(url);
      const fallback = encodeURIComponent(url);
      window.location.href = `intent://${parsed.host}${parsed.pathname}${parsed.search}${parsed.hash}#Intent;scheme=${parsed.protocol.replace(":", "")};package=com.android.chrome;S.browser_fallback_url=${fallback};end`;
      return;
    }
    copyRenderLink();
  }

  async function shareVideo(target = "Instagram") {
    const blob = downloadBlob;
    if (!blob) return;

    const file = new File(
      [blob],
      isCustomMode ? "twibbon-feb-uad-full-hd.mp4" : "twibbon-p2k-prakarsa-uad-2026-full-hd.mp4",
      { type: "video/mp4" },
    );
    const shareData = {
      title: isCustomMode ? "Twibbon FEB UAD" : "Twibbon Video P2K Prakarsa UAD 2026",
      text: `${isCustomMode ? "Twibbon FEB UAD" : "Twibbon Video P2K"} siap dibagikan ke ${target}. Dibuat di diannurwahid.com`,
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

  async function copyCaption() {
    try {
      await navigator.clipboard.writeText(generatedCaption);
      setIsCaptionCopied(true);
      window.setTimeout(() => setIsCaptionCopied(false), 2200);
    } catch {
      window.prompt("Salin caption ini:", generatedCaption);
    }
  }

  const hasShareableVideo = Boolean(downloadBlob);
  const frameSrc = isCustomMode && customFrameUrl ? customFrameUrl : "/editor-frame.png";
  const frameAspectRatio = isCustomMode && templateMeta?.width && templateMeta?.height
    ? `${templateMeta.width} / ${templateMeta.height}`
    : "1080 / 1350";
  const frameAspectStyle = { aspectRatio: frameAspectRatio };
  const composeClassName = isCustomMode ? "live-compose contain-photo" : "live-compose";
  const editorFrameClassName = isCustomMode ? "editor-frame contain-photo" : "editor-frame";
  const stepItems = isCustomMode ? ["Template", "Foto", "Atur", "Unduh"] : ["Upload", "Atur", "Generate", "Unduh"];

  return (
    <section className="hero-tool" id="generator" aria-label="Generator Twibbon Video P2K">
      <div className="tool-panel glass-panel">
        <div className="tool-header">
          <div>
            <span>{isCustomMode ? "FEB Twibbon" : "Twibbon Video P2K"}</span>
            <strong>
              {isCustomMode
                ? "Template FEB bawaan, tinggal upload foto."
                : "Upload, atur, generate, unduh."}
            </strong>
          </div>
          <div className="mode-tabs" role="tablist" aria-label="Mode generator">
            <button
              className={activeMode === "p2k" ? "active" : ""}
              type="button"
              role="tab"
              aria-selected={activeMode === "p2k"}
              onClick={() => switchMode("p2k")}
              disabled={isRendering}
            >
              P2K Cepat
            </button>
            <button
              className={activeMode === "feb" ? "active" : ""}
              type="button"
              role="tab"
              aria-selected={activeMode === "feb"}
              onClick={() => switchMode("feb")}
              disabled={isRendering}
            >
              FEB Twibbon
            </button>
          </div>
        </div>

        <div className="tool-grid">
          <div className="upload-side">
            {isCustomMode ? (
              <>
                <div className="custom-template-note">
                  <strong>Template FEB sudah disiapkan.</strong>
                  <span>
                    Fokus mode ini khusus Twibbon Fakultas Ekonomi dan Bisnis.
                    Template dari tools sudah dikunci agar posisi, rasio, dan
                    green screen lebih rapi.
                  </span>
                  <button type="button" onClick={useFebTemplate} disabled={isRendering || isDetectingTemplate}>
                    {isDetectingTemplate ? <Loader2 size={16} /> : <Play size={16} fill="currentColor" />}
                    Muat Ulang Template FEB
                  </button>
                </div>
                <div className="real-upload template-upload fixed-template-card">
                  {isDetectingTemplate ? <Loader2 className="spin-icon" size={34} /> : <Play size={34} fill="currentColor" />}
                  <span>
                    <strong>
                      {isDetectingTemplate
                        ? "Memproses Template"
                        : "Template FEB Aktif"}
                    </strong>
                    <small>
                      {isDetectingTemplate
                        ? "Membaca video dan mencari green screen..."
                        : templateFile?.name ?? "Template FEB UAD"}
                    </small>
                  </span>
                </div>
                <div className="chroma-panel">
                  <div className="placement-title">
                    <CircleAlert size={17} />
                    <strong>Green Screen</strong>
                  </div>
                  <p>
                    {isDetectingTemplate
                      ? "Sedang auto-detect area green screen..."
                      : templateFile
                        ? "Timing terdeteksi otomatis. Kamu tetap bisa koreksi manual."
                        : "Upload template MP4 dengan area green screen."}
                  </p>
                  <div className="chroma-grid">
                    <label>
                      <span>Mulai</span>
                      <input
                        type="number"
                        min="0"
                        step="0.1"
                        value={Number.isFinite(chroma.start) ? chroma.start : 0}
                        onChange={(event) => updateChroma("start", event.target.value)}
                        disabled={isRendering}
                      />
                    </label>
                    <label>
                      <span>Selesai</span>
                      <input
                        type="number"
                        min="0"
                        step="0.1"
                        value={Number.isFinite(chroma.end) && chroma.end < 9999 ? chroma.end : ""}
                        placeholder="akhir"
                        onChange={(event) => updateChroma("end", event.target.value || 9999)}
                        disabled={isRendering}
                      />
                    </label>
                    <label>
                      <span>Key</span>
                      <input
                        type="color"
                        value={chroma.keyColor}
                        onChange={(event) => updateChroma("keyColor", event.target.value)}
                        disabled={isRendering}
                      />
                    </label>
                  </div>
                </div>
              </>
            ) : null}
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
              <p>Geser foto langsung di frame agar wajah pas sebelum video HD dibuat.</p>
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
            <div className="preview-frame" style={frameAspectStyle}>
              {downloadUrl ? (
                <video src={downloadUrl} controls playsInline />
              ) : (
                <div className={composeClassName} style={previewStyle(placement)}>
                  {photoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={photoUrl} alt="Posisi foto sebelum generate HD" />
                  ) : null}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img className="template-frame" src={frameSrc} alt="" />
                  {!photoUrl ? <Play size={40} fill="currentColor" /> : null}
                </div>
              )}
              {isRendering ? <RenderOverlay progress={progress} text={loadingText} /> : null}
            </div>

            <div className="progress-box" aria-live="polite">
              <div className="step-track">
                {stepItems.map((item, index) => (
                  <span
                    className={
                      progress >= index * 28
                      || (isCustomMode && index === 0 && templateFile)
                      || (index < 2 && photoFile)
                        ? "active"
                        : ""
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
                {isRendering
                  ? loadingText
                  : isCustomMode
                    ? "Template FEB diproses di browser. Koreksi timing jika deteksi belum pas."
                    : "Generate HD sekali, hasilnya siap diunduh dan dibagikan."}
              </p>
              {error ? <small>{error}</small> : null}
            </div>

            {hasShareableVideo ? (
              <div className="share-panel">
                <div>
                  <strong>Bagikan video</strong>
                  <span>Versi Full HD siap dibagikan.</span>
                  {downloadBlob ? (
                    <small className="ios-download-note">
                      iPhone: jika tidak muncul di Galeri, cek Files &gt; Downloads lalu pilih Share &gt; Save Video.
                    </small>
                  ) : null}
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
                  <button
                    className="primary-tool-action"
                    type="button"
                    onClick={() => triggerDownload(
                      downloadUrl,
                      isCustomMode ? "twibbon-feb-uad-full-hd.mp4" : "twibbon-p2k-prakarsa-uad-2026-full-hd.mp4",
                    )}
                  >
                    <Download size={16} />
                    Unduh HD
                  </button>
                </div>
              </div>
            ) : null}

            {downloadBlob ? (
              <div className="caption-card">
                <div className="caption-card-head">
                  <div>
                    <strong>Caption P2K otomatis</strong>
                    <span>Isi nama, prodi, dan fakultas. Format mengikuti p2k_uad.</span>
                  </div>
                  <button type="button" onClick={copyCaption}>
                    {isCaptionCopied ? <Check size={16} /> : <Copy size={16} />}
                    {isCaptionCopied ? "Tersalin" : "Copy Caption"}
                  </button>
                </div>
                <div className="caption-fields">
                  <label>
                    <span>Nama</span>
                    <input
                      type="text"
                      value={captionName}
                      onChange={(event) => setCaptionName(event.target.value)}
                      placeholder="Nama kamu"
                    />
                  </label>
                  <label>
                    <span>Prodi</span>
                    <input
                      type="text"
                      value={captionProgram}
                      onChange={(event) => setCaptionProgram(event.target.value)}
                      placeholder="Contoh: Manajemen"
                    />
                  </label>
                  <label>
                    <span>Fakultas</span>
                    <input
                      type="text"
                      value={captionFaculty}
                      onChange={(event) => setCaptionFaculty(event.target.value)}
                      placeholder="Contoh: Ekonomi dan Bisnis"
                    />
                  </label>
                </div>
                <pre>{generatedCaption}</pre>
              </div>
            ) : null}

            <div className="tool-actions">
              {!downloadUrl ? (
                <button
                  className="primary-tool-action"
                  type="button"
                  onClick={() => renderVideo("hd")}
                  disabled={!canGenerate || isRendering || isDetectingTemplate}
                >
                  <Download size={17} />
                  Generate HD
                </button>
              ) : null}
              <button type="button" onClick={resetAll} disabled={isRendering || (!photoFile && !templateFile)}>
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
              <p>Drag foto di area frame. Setelah selesai, klik Generate HD untuk membuat video final.</p>
            </div>
            <div
              ref={editorFrameRef}
              className={editorFrameClassName}
              style={{ ...previewStyle(placement), ...frameAspectStyle }}
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
              <img className="template-frame" src={frameSrc} alt="" draggable="false" />
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
                Selesai
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

      {showFollowGate ? (
        <div className="follow-gate-backdrop" role="dialog" aria-modal="true" aria-label="Follow developer sebelum generate HD">
          <div className="follow-gate glass-panel">
            <div className="follow-gate-copy">
              <span>Langkah kecil sebelum render</span>
              <h2>Follow & like dulu ya.</h2>
              <p>
                Tools ini gratis dan diproses langsung di browser. Bantu dukung
                developer dengan follow dan like postingan twibbon ini dulu,
                setelah itu Generate HD langsung berjalan.
              </p>
            </div>
            <a
              className="follow-preview-card"
              href={FOLLOW_POST_URL}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(event) => {
                event.preventDefault();
                followAndContinue();
              }}
            >
              <div className="follow-preview-thumb">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={FOLLOW_POST_THUMB}
                  alt=""
                  onError={(event) => {
                    event.currentTarget.onerror = null;
                    event.currentTarget.src = "/student-preview.png";
                  }}
                />
              </div>
              <div className="follow-preview-content">
                <strong>Dian Nurwahid (@denzhang1) • Foto dan video Instagram</strong>
                <em>
                  Bursa Ekonom Muda, Bertumbuh dengan Literasi, Bertransformasi
                  untuk Nusantara. Klik untuk follow dan like dulu.
                </em>
              </div>
            </a>
            <button className="primary-tool-action follow-gate-button" type="button" onClick={followAndContinue}>
              <ExternalLink size={17} />
              Follow & Like, lalu Generate HD
            </button>
            <small>Tombol ini hanya muncul sekali di browser kamu setelah diklik.</small>
          </div>
        </div>
      ) : null}

      {showRenderBrowserNotice ? (
        <div className="browser-notice render-browser-notice" role="dialog" aria-label="Buka di browser utama untuk generate HD">
          <button
            className="browser-notice-close"
            type="button"
            onClick={() => setShowRenderBrowserNotice(false)}
            aria-label="Tutup pemberitahuan"
          >
            <X size={16} />
          </button>
          <strong>Buka di Chrome/Safari dulu</strong>
          <p>
            Browser ini membatasi akses foto atau render video. Untuk Generate HD
            yang lebih lancar, buka halaman ini di browser utama lalu upload foto lagi.
          </p>
          <div className="browser-notice-actions">
            <button type="button" onClick={openRenderInBrowser}>
              <ExternalLink size={16} />
              {isAndroidDevice ? "Buka di Chrome" : "Buka Chrome/Safari"}
            </button>
            <button type="button" onClick={copyRenderLink}>
              <Copy size={16} />
              {isRenderLinkCopied ? "Link Tersalin" : "Salin Link"}
            </button>
          </div>
          <small>
            Setelah terbuka di browser utama, pilih ulang foto dari Galeri lokal.
          </small>
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

async function detectGreenScreen(videoUrl) {
  const video = document.createElement("video");
  video.src = videoUrl;
  video.muted = true;
  video.playsInline = true;
  video.preload = "metadata";
  await waitForVideo(video, "loadedmetadata");

  const duration = Number.isFinite(video.duration) ? video.duration : 0;
  if (!duration) throw new Error("Durasi template tidak terbaca.");
  const meta = {
    width: Math.max(1, video.videoWidth || 1080),
    height: Math.max(1, video.videoHeight || 1350),
    duration,
  };

  const sampleCount = clamp(Math.ceil(duration * 2), 10, 48);
  const step = duration / Math.max(1, sampleCount - 1);
  const scanCanvas = document.createElement("canvas");
  const scanWidth = 160;
  const scanHeight = Math.max(120, Math.round(scanWidth * (video.videoHeight / Math.max(1, video.videoWidth))));
  scanCanvas.width = scanWidth;
  scanCanvas.height = scanHeight;
  const scanContext = scanCanvas.getContext("2d", { willReadFrequently: true });
  const frames = [];

  for (let index = 0; index < sampleCount; index += 1) {
    const time = Math.min(duration - 0.05, index * step);
    await seekVideo(video, Math.max(0, time));
    scanContext.drawImage(video, 0, 0, scanWidth, scanHeight);
    const analysis = analyzeGreenFrame(scanContext.getImageData(0, 0, scanWidth, scanHeight));
    frames.push({ time, ...analysis });
  }

  const strongest = frames.reduce((best, frame) => (frame.ratio > best.ratio ? frame : best), frames[0]);
  if (!strongest || strongest.ratio < 0.035) {
    throw new Error("Green screen belum terdeteksi otomatis. Atur timing manual atau pakai template dengan hijau yang lebih jelas.");
  }

  const threshold = Math.max(0.035, strongest.ratio * 0.42);
  const activeFrames = frames.filter((frame) => frame.ratio >= threshold);
  const start = Math.max(0, activeFrames[0].time - Math.max(1.5, step * 2));
  const end = Math.min(duration, activeFrames[activeFrames.length - 1].time + Math.max(1, step * 1.5));
  const keyColor = rgbToHex(strongest.key.r, strongest.key.g, strongest.key.b);
  const bounds = expandBounds(strongest.bounds, 0.06);
  const frameUrl = await createTransparentFrame(video, strongest.time, keyColor, meta, bounds);

  return {
    frameUrl,
    meta,
    chroma: {
      start: roundTime(start),
      end: roundTime(end),
      keyColor,
      bounds,
      sensitivity: 0.18,
      smoothness: 0.24,
    },
  };
}

function analyzeGreenFrame(imageData) {
  const { data } = imageData;
  let greenPixels = 0;
  let red = 0;
  let green = 0;
  let blue = 0;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  const width = imageData.width;
  const height = imageData.height;

  for (let index = 0; index < data.length; index += 4) {
    const r = data[index];
    const g = data[index + 1];
    const b = data[index + 2];
    if (isGreenPixel(r, g, b)) {
      const pixelIndex = index / 4;
      const x = pixelIndex % width;
      const y = Math.floor(pixelIndex / width);
      greenPixels += 1;
      red += r;
      green += g;
      blue += b;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }

  const totalPixels = data.length / 4;
  const divisor = Math.max(1, greenPixels);
  return {
    ratio: greenPixels / totalPixels,
    key: {
      r: Math.round(red / divisor) || 98,
      g: Math.round(green / divisor) || 255,
      b: Math.round(blue / divisor) || 83,
    },
    bounds: greenPixels > 0
      ? {
          left: minX / width,
          top: minY / height,
          right: (maxX + 1) / width,
          bottom: (maxY + 1) / height,
        }
      : null,
  };
}

async function createTransparentFrame(video, time, keyColor, meta, bounds) {
  await seekVideo(video, time);
  const maxPreviewSide = 720;
  const scale = Math.min(1, maxPreviewSide / Math.max(meta.width, meta.height));
  const width = Math.max(1, Math.round(meta.width * scale));
  const height = Math.max(1, Math.round(meta.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  context.drawImage(video, 0, 0, width, height);
  const imageData = context.getImageData(0, 0, width, height);
  const key = hexToRgb(keyColor);

  for (let index = 0; index < imageData.data.length; index += 4) {
    const r = imageData.data[index];
    const g = imageData.data[index + 1];
    const b = imageData.data[index + 2];
    const pixelIndex = index / 4;
    const x = (pixelIndex % width) / width;
    const y = Math.floor(pixelIndex / width) / height;
    const insideBounds = !bounds || (x >= bounds.left && x <= bounds.right && y >= bounds.top && y <= bounds.bottom);
    const redOrangeInk = r - g > 14 && r > 92;
    const greenYellowFill = g > 78 && g >= r - 22 && g > b * 1.05 && !redOrangeInk;
    if (insideBounds && (isGreenPixel(r, g, b) || greenYellowFill || (g > r * 1.02 && g > b * 1.12 && colorDistance({ r, g, b }, key) < 122))) {
      imageData.data[index + 3] = 0;
    }
  }

  context.putImageData(imageData, 0, 0);
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
  if (!blob) throw new Error("Preview template gagal dibuat.");
  return URL.createObjectURL(blob);
}

function expandBounds(bounds, padding) {
  if (!bounds) return { left: 0, top: 0, right: 1, bottom: 1 };
  return {
    left: clamp(bounds.left - padding, 0, 1),
    top: clamp(bounds.top - padding, 0, 1),
    right: clamp(bounds.right + padding, 0, 1),
    bottom: clamp(bounds.bottom + padding, 0, 1),
  };
}

function isGreenPixel(r, g, b) {
  return g > 118 && g > r * 1.12 && g > b * 1.2 && g - Math.max(r, b) > 28;
}

function colorDistance(a, b) {
  return Math.hypot(a.r - b.r, a.g - b.g, a.b - b.b);
}

function hexToRgb(hex) {
  const normalized = String(hex).replace("#", "");
  const value = /^[0-9a-fA-F]{6}$/.test(normalized) ? normalized : "62ff53";
  const number = Number.parseInt(value, 16);
  return {
    r: (number >> 16) & 255,
    g: (number >> 8) & 255,
    b: number & 255,
  };
}

function rgbToHex(r, g, b) {
  return `#${[r, g, b].map((value) => Math.round(clamp(value, 0, 255)).toString(16).padStart(2, "0")).join("")}`;
}

function waitForVideo(video, eventName) {
  return new Promise((resolve, reject) => {
    const cleanup = () => {
      video.removeEventListener(eventName, handleEvent);
      video.removeEventListener("error", handleError);
    };
    const handleEvent = () => {
      cleanup();
      resolve();
    };
    const handleError = () => {
      cleanup();
      reject(new Error("Video template gagal dibaca browser."));
    };
    video.addEventListener(eventName, handleEvent, { once: true });
    video.addEventListener("error", handleError, { once: true });
  });
}

async function seekVideo(video, time) {
  if (Math.abs(video.currentTime - time) < 0.04) return;
  const promise = waitForVideo(video, "seeked");
  video.currentTime = time;
  await promise;
}

function roundTime(value) {
  return Math.round(value * 10) / 10;
}

function formatSeconds(value) {
  if (!Number.isFinite(value)) return "akhir";
  const minutes = Math.floor(value / 60);
  const seconds = Math.floor(value % 60).toString().padStart(2, "0");
  const decimal = Math.round((value % 1) * 10);
  return `${minutes}:${seconds}${decimal ? `.${decimal}` : ""}`;
}

function buildP2kCaption({ name, program, faculty }) {
  const cleanName = name.trim() || "[Nama]";
  const cleanProgram = program.trim() || "[Nama prodi]";
  const cleanFaculty = faculty.trim() || "[Nama Fakultas]";

  return `Assalamualaikum Warahmatullahi Wabarakatuh,
"Dahlan Muda Berkarya Wujudkan Transformasi Berkemajuan"

Hallo Semuanya Perkenalkan, saya ${cleanName} dari Prodi ${cleanProgram} Fakultas ${cleanFaculty}, Universitas Ahmad Dahlan.

Penuh rasa bangga dan antusias, saya siap bertumbuh di Program Pengenalan Kampus (P2K) PRAKARSA 2026

Bersama seluruh Dahlan Muda dari berbagai penjuru, saya percaya bahwa asa yang disatukan akan menumbuhkan karya-karya yang bermakna.

🗣️ "Satukan Asa, Ciptakan Karya, Dahlan Muda Bertalenta"

Wassalamualaikum Warahmatullahi Wabarakatuh.

@p2k_uad
@klik_uad
@[Akun sosial media P2K Fakultas]

#weareuad
#P2KUAD2026
#P2KPRAKARSA2026
#DahlanMudaBertalenta
#UAD2026`;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}
