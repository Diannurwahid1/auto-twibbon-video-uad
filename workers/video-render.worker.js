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
  preview: { width: 360, height: 450, bitrate: 700_000 },
  hd: { width: 1080, height: 1350, bitrate: 8_000_000 },
};

let templateBufferPromise;

self.onmessage = async ({ data }) => {
  if (data.type !== "render") return;

  try {
    const result = await renderVideo(data.photo, data.mode, data.placement);
    self.postMessage({ type: "complete", mode: data.mode, buffer: result }, [result]);
  } catch (error) {
    console.error(error);
    self.postMessage({
      type: "error",
      message: readableError(error),
    });
  }
};

async function renderVideo(photoBuffer, mode, placement = {}) {
  const config = MODES[mode];
  if (!config) throw new Error("Mode render tidak valid.");
  if (!("VideoEncoder" in self) || !("VideoDecoder" in self)) {
    throw new Error("Browser belum mendukung WebCodecs. Gunakan Chrome atau Edge terbaru.");
  }

  postProgress(2, "Membuka template langsung di perangkat...");
  const [templateBuffer, photoBitmap] = await Promise.all([
    getTemplateBuffer(),
    createImageBitmap(new Blob([photoBuffer])),
  ]);
  const input = new Input({ source: new BlobSource(new Blob([templateBuffer])), formats: [MP4] });
  const videoTrack = await input.getPrimaryVideoTrack();
  const audioTrack = await input.getPrimaryAudioTrack();
  if (!videoTrack) throw new Error("Track video template tidak ditemukan.");
  if (!(await videoTrack.canDecode())) throw new Error("Codec template tidak dapat didekode browser ini.");

  const duration = (await input.getDurationFromMetadata()) ?? (await input.computeDuration());
  const canvas = new OffscreenCanvas(config.width, config.height);
  const renderer = createWebGlRenderer(canvas, photoBitmap, config.width, config.height, placement);
  const target = new BufferTarget();
  const output = new Output({
    format: new Mp4OutputFormat({ fastStart: "in-memory" }),
    target,
  });
  const videoSource = new CanvasSource(canvas, {
    codec: "avc",
    quality: new Quality({ bitrate: config.bitrate }),
    hardwareAcceleration: "prefer-hardware",
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
  postProgress(5, "WebCodecs hardware acceleration aktif...");

  const videoTask = pumpVideo(videoTrack, videoSource, renderer, duration);
  const audioTask = audioSource
    ? copyAudio(audioTrack, audioSource)
    : Promise.resolve();
  await Promise.all([videoTask, audioTask]);
  postProgress(97, "Mediabunny sedang menyusun MP4 final...");
  await output.finalize();

  renderer.dispose();
  photoBitmap.close();
  input.dispose();
  if (!target.buffer) throw new Error("File MP4 tidak berhasil dibuat.");
  return target.buffer;
}

async function pumpVideo(track, source, renderer, duration) {
  const sink = new VideoSampleSink(track, { hardwareAcceleration: "prefer-hardware" });
  let frameIndex = 0;

  for await (const sample of sink.samples()) {
    const frame = sample.toVideoFrame();
    renderer.draw(frame);
    frame.close();
    await source.add(sample.timestamp, sample.duration, {
      keyFrame: frameIndex % 60 === 0,
    });
    frameIndex += 1;
    const percent = 5 + Math.round((sample.timestamp / duration) * 90);
    if (frameIndex % 10 === 0) postProgress(Math.min(95, percent));
    sample.close();
  }

  source.close();
}

async function copyAudio(track, source) {
  const sink = new EncodedPacketSink(track);
  const decoderConfig = await track.getDecoderConfig();
  const metadata = { decoderConfig: decoderConfig ?? undefined };
  for await (const packet of sink.packets()) await source.add(packet, metadata);
  source.close();
}

function getTemplateBuffer() {
  templateBufferPromise ??= fetch("/twibbon.mp4").then((response) => {
    if (!response.ok) throw new Error("Template video gagal dimuat.");
    return response.arrayBuffer();
  });
  return templateBufferPromise;
}

function createWebGlRenderer(canvas, photo, width, height, placement) {
  const gl = canvas.getContext("webgl2", {
    alpha: false,
    antialias: false,
    depth: false,
    preserveDrawingBuffer: true,
    powerPreference: "high-performance",
  });
  if (!gl) throw new Error("WebGL 2 tidak tersedia di browser ini.");

  const program = createProgram(gl, VERTEX_SHADER, FRAGMENT_SHADER);
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
  const scale = Math.max(width / photo.width, height / photo.height) * userScale;
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
  gl.viewport(0, 0, width, height);

  return {
    draw(frame) {
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, videoTexture);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, frame);
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
  if (error instanceof Error && error.message) return error.message;
  return "Render gagal. Coba gunakan Chrome atau Edge terbaru.";
}

const VERTEX_SHADER = `#version 300 es
in vec2 a_position;
in vec2 a_uv;
out vec2 v_uv;
void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
  v_uv = a_uv;
}`;

const FRAGMENT_SHADER = `#version 300 es
precision mediump float;
uniform sampler2D u_photo;
uniform sampler2D u_video;
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
  vec3 key = vec3(0.384, 1.0, 0.325);
  float chromaDistance = distance(chroma(video), chroma(key));
  float templateAlpha = smoothstep(0.11, 0.27, chromaDistance);
  outColor = vec4(mix(photo, video, templateAlpha), 1.0);
}`;
