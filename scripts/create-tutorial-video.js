const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");

const root = path.resolve(__dirname, "..");
const videoDir = path.join(root, "qa", "tutorial-recording");
const outputPath = path.join(root, "public", "tutorial-p2k.webm");
const samplePhoto = path.join(root, "public", "student-preview.png");

async function main() {
  fs.rmSync(videoDir, { recursive: true, force: true });
  fs.mkdirSync(videoDir, { recursive: true });

  const browser = await chromium.launch({
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    headless: true,
  });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    recordVideo: {
      dir: videoDir,
      size: { width: 390, height: 844 },
    },
    acceptDownloads: true,
    isMobile: true,
  });
  const page = await context.newPage();

  await page.goto("http://127.0.0.1:3001/#generator", { waitUntil: "networkidle" });
  await page.waitForTimeout(900);

  await page.setInputFiles("#real-photo-upload", samplePhoto);
  await page.waitForSelector(".editor-backdrop", { state: "visible", timeout: 10_000 });
  await page.waitForTimeout(900);

  const frame = page.locator(".editor-frame");
  const box = await frame.boundingBox();
  if (!box) throw new Error("Editor frame tidak ditemukan.");
  const centerX = box.x + box.width / 2;
  const centerY = box.y + box.height / 2;
  await page.mouse.move(centerX, centerY);
  await page.mouse.down();
  await page.mouse.move(centerX + 34, centerY - 18, { steps: 18 });
  await page.mouse.move(centerX + 12, centerY + 22, { steps: 18 });
  await page.mouse.up();
  await page.waitForTimeout(800);

  await page.getByRole("button", { name: /Selesai, Buat Preview/i }).click();
  await page.waitForTimeout(900);

  await page.waitForFunction(
    () => document.querySelector(".preview-frame video")?.readyState >= 1,
    null,
    { timeout: 90_000 },
  );
  await page.waitForTimeout(1_400);

  const downloadPromise = page.waitForEvent("download", { timeout: 120_000 }).catch(() => null);
  await page.getByRole("button", { name: /Unduh Full HD/i }).click();
  await page.waitForTimeout(1_200);
  await downloadPromise;
  await page.waitForTimeout(1_000);

  const video = page.video();
  await page.close();
  await context.close();
  await browser.close();

  if (!video) throw new Error("Rekaman video tidak tersedia.");
  const recordedPath = await video.path();
  fs.copyFileSync(recordedPath, outputPath);
  console.log(`Created ${outputPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
