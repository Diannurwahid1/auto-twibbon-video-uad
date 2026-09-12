import {
  BlobSource,
  BufferTarget,
  CanvasSource,
  EncodedAudioPacketSource,
  EncodedPacketSink,
  Input,
  MP4,
  Mp4OutputFormat,
  Output,
  Quality,
  VideoSampleSink,
} from "mediabunny";

const MODES = {
  preview: {
    variants: [
      { width: 360, height: 450, bitrate: 700_000, hardwareAcceleration: "no-preference" },
    ],
  },
  hd: {
    variants: [
      { width: 1080, height: 1350, bitrate: 6_000_000, hardwareAcceleration: "no-preference", fullCodecString: "avc1.42e028" },
      { width: 1080, height: 1350, bitrate: 4_500_000, hardwareAcceleration: "prefer-software", fullCodecString: "avc1.42e028" },
      { width: 720, height: 900, bitrate: 3_200_000, hardwareAcceleration: "no-preference", fullCodecString: "avc1.42e01f" },
    ],
  },
};

let templateBufferPromise;
const DEFAULT_CHROMA = {
  start: 17,
  end: Number.POSITIVE_INFINITY,
  keyColor: "#62ff53",
  sensitivity: 0.11,
  smoothness: 0.16,
};

self.onmessage = async ({ data }) => {
  if (data.type !== "render") return;

  try {
    const result = await renderVideo(data.photo, data.mode, data.placement, data.template, data.chroma);
    self.postMessage({ type: "complete", mode: data.mode, buffer: result }, [result]);
  } catch (error) {
    console.error(error);
    self.postMessage({
      type: "error",
      message: readableError(error),
    });
  }
};

async function renderVideo(photoBuffer, mode, placement = {}, customTemplateBuffer = null, chroma = {}) {
  const modeConfig = MODES[mode];
  if (!modeConfig) throw new Error("Mode render tidak valid.");
  if (!("VideoEncoder" in self) || !("VideoDecoder" in self)) {
    throw new Error("Browser belum mendukung WebCodecs. Gunakan Chrome atau Edge terbaru.");
  }

  postProgress(2, "Membuka template langsung di perangkat...");
  const templateBuffer = customTemplateBuffer ?? await getTemplateBuffer();
  const variants = customTemplateBuffer
    ? modeConfig.variants.map((variant) => ({ ...variant, preserveTemplateSize: true }))
    : modeConfig.variants;
  let lastError = null;

  for (let index = 0; index < variants.length; index += 1) {
    const config = variants[index];
    try {
      if (index > 0) {
        postProgress(4, "Encoder HP belum cocok, mencoba mode kompatibel...");
      }
      return await renderAttempt(templateBuffer, photoBuffer, config, placement, chroma);
    } catch (error) {
      lastError = error;
      if (!isRecoverableRenderError(error) || index === variants.length - 1) throw error;
    }
  }

  throw lastError ?? new Error("Render gagal. Coba gunakan Chrome atau Edge terbaru.");
}

async function renderAttempt(templateBuffer, photoBuffer, config, placement, chroma) {
  const photoBitmap = await createImageBitmap(new Blob([photoBuffer]));
  const input = new Input({ source: new BlobSource(new Blob([templateBuffer])), formats: [MP4] });
  let renderer = null;

  try {
    const videoTrack = await input.getPrimaryVideoTrack();
    const audioTrack = await input.getPrimaryAudioTrack();
    if (!videoTrack) throw new Error("Track video template tidak ditemukan.");
    if (!(await videoTrack.canDecode())) throw new Error("Codec template tidak dapat didekode browser ini.");

    const duration = (await input.getDurationFromMetadata()) ?? (await input.computeDuration());
    const renderConfig = await resolveRenderConfig(videoTrack, config);
    const canvas = new OffscreenCanvas(renderConfig.width, renderConfig.height);
    renderer = createWebGlRenderer(canvas, photoBitmap, renderConfig.width, renderConfig.height, placement, chroma);
    const target = new BufferTarget();
    const output = new Output({
      format: new Mp4OutputFormat({ fastStart: "in-memory" }),
      target,
    });
    const videoSource = new CanvasSource(canvas, {
      codec: "avc",
      quality: new Quality({ bitrate: renderConfig.bitrate }),
      hardwareAcceleration: config.hardwareAcceleration,
      fullCodecString: config.fullCodecString,
      latencyMode: "realtime",
      keyFrameInterval: 2,
    });
    output.addVideoTrack(videoSource, { frameRate: 30 });

    let audioSource = null;
    if (audioTrack && (await audioTrack.getCodec()) === "aac") {
      audioSource = new EncodedAudioPacketSource("aac");
      output.addAudioTrack(audioSource);
    }

    await output.start();
    postProgress(5, "Mediabunny dan WebCodecs mulai merender...");

    const videoTask = pumpVideo(videoTrack, videoSource, renderer, duration);
    const audioTask = audioSource
      ? copyAudio(audioTrack, audioSource)
      : Promise.resolve();
    await Promise.all([videoTask, audioTask]);
    postProgress(97, "Mediabunny sedang menyusun MP4 final...");
    await output.finalize();

    if (!target.buffer) throw new Error("File MP4 tidak berhasil dibuat.");
    return target.buffer;
  } finally {
    renderer?.dispose();
    photoBitmap.close();
    input.dispose();
  }
}

async function pumpVideo(track, source, renderer, duration) {
  const sink = new VideoSampleSink(track, { hardwareAcceleration: "no-preference" });
  let frameIndex = 0;
  let firstTimestamp = null;

  for await (const sample of sink.samples()) {
    firstTimestamp ??= sample.timestamp;
    const outputTimestamp = Math.max(0, sample.timestamp - firstTimestamp);
    const outputDuration = Math.max(0.001, sample.duration || 1 / 30);
    const frame = sample.toVideoFrame();
    renderer.draw(frame, Math.max(0, sample.timestamp));
    frame.close();
    await source.add(outputTimestamp, outputDuration, {
      keyFrame: frameIndex % 60 === 0,
    });
    frameIndex += 1;
    const percent = 5 + Math.round((outputTimestamp / duration) * 90);
    if (frameIndex % 10 === 0) postProgress(Math.min(95, percent));
    sample.close();
  }

  source.close();
}

async function copyAudio(track, source) {
  const sink = new EncodedPacketSink(track);
  const decoderConfig = await track.getDecoderConfig();
  const metadata = { decoderConfig: decoderConfig ?? undefined };
  let firstTimestamp = null;
  for await (const packet of sink.packets()) {
    firstTimestamp ??= packet.timestamp;
    const outputTimestamp = Math.max(0, packet.timestamp - firstTimestamp);
    await source.add(packet.clone({ timestamp: outputTimestamp }), metadata);
  }
  source.close();
}

function getTemplateBuffer() {
  templateBufferPromise ??= fetch("/twibbon.mp4", { cache: "force-cache" }).then((response) => {
    if (!response.ok) throw new Error("Template video gagal dimuat.");
    return response.arrayBuffer();
  }).catch((error) => {
    templateBufferPromise = undefined;
    throw error;
  });
  return templateBufferPromise;
}

async function resolveRenderConfig(videoTrack, config) {
  if (!config.preserveTemplateSize) {
    return config;
  }

  const width = normalizeEven(await videoTrack.getDisplayWidth());
  const height = normalizeEven(await videoTrack.getDisplayHeight());
  const p2kPixels = 1080 * 1350;
  const pixelRatio = (width * height) / p2kPixels;
  const bitrate = clamp(Math.round(config.bitrate * pixelRatio), 1_500_000, 12_000_000);

  return {
    ...config,
    width,
    height,
    bitrate,
  };
}

function normalizeEven(value) {
  const rounded = Math.max(2, Math.round(Number(value) || 2));
  return rounded % 2 === 0 ? rounded : rounded - 1;
}

function createWebGlRenderer(canvas, photo, width, height, placement, chroma = {}) {
  const contextOptions = {
    alpha: false,
    antialias: false,
    depth: false,
    preserveDrawingBuffer: true,
    powerPreference: "high-performance",
  };
  const gl2 = canvas.getContext("webgl2", contextOptions);
  const gl = gl2 ?? canvas.getContext("webgl", contextOptions) ?? canvas.getContext("experimental-webgl", contextOptions);
  if (!gl) throw new Error("WebGL tidak tersedia di browser ini. Buka lewat Chrome terbaru.");

  const isWebGl2 = Boolean(gl2);
  const program = createProgram(
    gl,
    isWebGl2 ? VERTEX_SHADER_WEBGL2 : VERTEX_SHADER_WEBGL1,
    isWebGl2 ? FRAGMENT_SHADER_WEBGL2 : FRAGMENT_SHADER_WEBGL1,
  );
  gl.useProgram(program);
  const vertices = new Float32Array([
    -1, -1, 0, 0, 1, -1, 1, 0, -1, 1, 0, 1,
    -1, 1, 0, 1, 1, -1, 1, 0, 1, 1, 1, 1,
  ]);
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
  const position = gl.getAttribLocation(program, "a_position");
  const uv = gl.getAttribLocation(program, "a_uv");
  gl.enableVertexAttribArray(position);
  gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 16, 0);
  gl.enableVertexAttribArray(uv);
  gl.vertexAttribPointer(uv, 2, gl.FLOAT, false, 16, 8);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);

  const photoCanvas = new OffscreenCanvas(width, height);
  const photoContext = photoCanvas.getContext("2d", { alpha: false });
  const userScale = clamp(Number(placement.scale) || 1, 0.8, 1.45);
  const offsetX = clamp(Number(placement.x) || 0, -0.28, 0.28) * width;
  const offsetY = clamp(Number(placement.y) || 0, -0.28, 0.28) * height;
  const rotation = clamp(Number(placement.rotation) || 0, -8, 8) * (Math.PI / 180);
  const shouldContainPhoto = placement.fit === "contain";
  if (shouldContainPhoto) {
    const backgroundScale = Math.max(width / photo.width, height / photo.height);
    const backgroundWidth = photo.width * backgroundScale;
    const backgroundHeight = photo.height * backgroundScale;
    photoContext.save();
    photoContext.filter = "blur(24px) saturate(1.08)";
    photoContext.globalAlpha = 0.55;
    photoContext.drawImage(photo, (width - backgroundWidth) / 2, (height - backgroundHeight) / 2, backgroundWidth, backgroundHeight);
    photoContext.restore();
    photoContext.fillStyle = "rgba(255,255,255,0.18)";
    photoContext.fillRect(0, 0, width, height);
  }
  const baseScale = shouldContainPhoto
    ? Math.min(width / photo.width, height / photo.height)
    : Math.max(width / photo.width, height / photo.height);
  const scale = baseScale * userScale;
  const drawWidth = photo.width * scale;
  const drawHeight = photo.height * scale;
  photoContext.translate(width / 2 + offsetX, height / 2 + offsetY);
  photoContext.rotate(rotation);
  photoContext.drawImage(photo, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);

  const photoTexture = createTexture(gl, 0);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, photoCanvas);
  gl.uniform1i(gl.getUniformLocation(program, "u_photo"), 0);
  const videoTexture = createTexture(gl, 1);
  gl.uniform1i(gl.getUniformLocation(program, "u_video"), 1);
  const timeLocation = gl.getUniformLocation(program, "u_time");
  const chromaConfig = normalizeChromaConfig(chroma);
  gl.uniform1f(gl.getUniformLocation(program, "u_key_start"), chromaConfig.start);
  gl.uniform1f(gl.getUniformLocation(program, "u_key_end"), chromaConfig.end);
  gl.uniform3fv(gl.getUniformLocation(program, "u_key_color"), chromaConfig.keyColor);
  gl.uniform1f(gl.getUniformLocation(program, "u_threshold_min"), chromaConfig.sensitivity);
  gl.uniform1f(gl.getUniformLocation(program, "u_threshold_max"), chromaConfig.sensitivity + chromaConfig.smoothness);
  gl.viewport(0, 0, width, height);
  const frameCanvas = new OffscreenCanvas(width, height);
  const frameContext = frameCanvas.getContext("2d", { alpha: false });

  return {
    draw(frame, timestamp) {
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, videoTexture);
      try {
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, frame);
      } catch {
        frameContext.drawImage(frame, 0, 0, width, height);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, frameCanvas);
      }
      gl.uniform1f(timeLocation, timestamp);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      gl.finish();
    },
    dispose() {
      gl.deleteTexture(photoTexture);
      gl.deleteTexture(videoTexture);
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
    },
  };
}

function createTexture(gl, unit) {
  const texture = gl.createTexture();
  gl.activeTexture(gl.TEXTURE0 + unit);
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  return texture;
}

function createProgram(gl, vertexSource, fragmentSource) {
  const vertex = compileShader(gl, gl.VERTEX_SHADER, vertexSource);
  const fragment = compileShader(gl, gl.FRAGMENT_SHADER, fragmentSource);
  const program = gl.createProgram();
  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.linkProgram(program);
  gl.deleteShader(vertex);
  gl.deleteShader(fragment);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program));
  return program;
}

function compileShader(gl, type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader));
  return shader;
}

function postProgress(progress, message) {
  self.postMessage({ type: "progress", progress, message });
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function readableError(error) {
  const message = error instanceof Error ? error.message : String(error ?? "");
  if (/fetch|network|template/i.test(message)) {
    return "Template video gagal dimuat. Coba buka lewat Chrome/browser utama dan pastikan koneksi stabil.";
  }
  if (/encoder configuration|not supported|VideoEncoder|avc1|codec/i.test(message)) {
    return "Encoder video di browser HP ini belum mendukung render HD. Sistem sudah mencoba mode kompatibel; coba buka lewat Chrome terbaru atau gunakan HP/laptop lain.";
  }
  if (/webgl/i.test(message)) {
    return "Browser ini belum mendukung WebGL untuk render cepat. Buka lewat Chrome terbaru atau browser utama.";
  }
  if (message) return message;
  return "Render gagal. Coba gunakan Chrome atau Edge terbaru.";
}

function normalizeChromaConfig(chroma) {
  const start = Math.max(0, Number(chroma.start ?? DEFAULT_CHROMA.start) || 0);
  const rawEnd = Number(chroma.end ?? DEFAULT_CHROMA.end);
  const end = Number.isFinite(rawEnd) ? Math.max(start, rawEnd) : DEFAULT_CHROMA.end;
  const sensitivity = clamp(Number(chroma.sensitivity ?? DEFAULT_CHROMA.sensitivity) || DEFAULT_CHROMA.sensitivity, 0.02, 0.32);
  const smoothness = clamp(Number(chroma.smoothness ?? DEFAULT_CHROMA.smoothness) || DEFAULT_CHROMA.smoothness, 0.02, 0.42);

  return {
    start,
    end,
    sensitivity,
    smoothness,
    keyColor: hexToRgb(chroma.keyColor ?? DEFAULT_CHROMA.keyColor),
  };
}

function hexToRgb(hex) {
  const normalized = String(hex).replace("#", "").trim();
  const value = /^[0-9a-fA-F]{6}$/.test(normalized) ? normalized : DEFAULT_CHROMA.keyColor.replace("#", "");
  const number = Number.parseInt(value, 16);
  return new Float32Array([
    ((number >> 16) & 255) / 255,
    ((number >> 8) & 255) / 255,
    (number & 255) / 255,
  ]);
}

function isRecoverableRenderError(error) {
  const message = error instanceof Error ? error.message : String(error ?? "");
  return /encoder configuration|not supported|VideoEncoder|avc1|codec|EncodingError|OperationError/i.test(message);
}

const VERTEX_SHADER_WEBGL2 = `#version 300 es
in vec2 a_position;
in vec2 a_uv;
out vec2 v_uv;
void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
  v_uv = a_uv;
}`;

const FRAGMENT_SHADER_WEBGL2 = `#version 300 es
precision mediump float;
uniform sampler2D u_photo;
uniform sampler2D u_video;
uniform float u_time;
uniform float u_key_start;
uniform float u_key_end;
uniform vec3 u_key_color;
uniform float u_threshold_min;
uniform float u_threshold_max;
in vec2 v_uv;
out vec4 outColor;
vec2 chroma(vec3 color) {
  return vec2(
    -0.168736 * color.r - 0.331264 * color.g + 0.5 * color.b,
     0.5 * color.r - 0.418688 * color.g - 0.081312 * color.b
  );
}
void main() {
  vec3 photo = texture(u_photo, v_uv).rgb;
  vec3 video = texture(u_video, v_uv).rgb;
  if (u_time < u_key_start || u_time > u_key_end) {
    outColor = vec4(video, 1.0);
    return;
  }
  float chromaDistance = distance(chroma(video), chroma(u_key_color));
  float templateAlpha = smoothstep(u_threshold_min, u_threshold_max, chromaDistance);
  outColor = vec4(mix(photo, video, templateAlpha), 1.0);
}`;

const VERTEX_SHADER_WEBGL1 = `
attribute vec2 a_position;
attribute vec2 a_uv;
varying vec2 v_uv;
void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
  v_uv = a_uv;
}`;

const FRAGMENT_SHADER_WEBGL1 = `
precision mediump float;
uniform sampler2D u_photo;
uniform sampler2D u_video;
uniform float u_time;
uniform float u_key_start;
uniform float u_key_end;
uniform vec3 u_key_color;
uniform float u_threshold_min;
uniform float u_threshold_max;
varying vec2 v_uv;
vec2 chroma(vec3 color) {
  return vec2(
    -0.168736 * color.r - 0.331264 * color.g + 0.5 * color.b,
     0.5 * color.r - 0.418688 * color.g - 0.081312 * color.b
  );
}
void main() {
  vec3 photo = texture2D(u_photo, v_uv).rgb;
  vec3 video = texture2D(u_video, v_uv).rgb;
  if (u_time < u_key_start || u_time > u_key_end) {
    gl_FragColor = vec4(video, 1.0);
    return;
  }
  float chromaDistance = distance(chroma(video), chroma(u_key_color));
  float templateAlpha = smoothstep(u_threshold_min, u_threshold_max, chromaDistance);
  gl_FragColor = vec4(mix(photo, video, templateAlpha), 1.0);
}`;
