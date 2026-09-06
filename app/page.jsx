"use client";

import { useState } from "react";
import Image from "next/image";
import { AtSign, Download, Gift, PlayCircle, ShieldCheck, UserRound, Zap } from "lucide-react";
import VideoGenerator from "@/components/video-generator";

const benefits = [
  {
    icon: Gift,
    title: "Gratis",
    body: "Untuk maba UAD 2026.",
  },
  {
    icon: Zap,
    title: "Cepat",
    body: "Preview otomatis setelah foto diatur.",
  },
  {
    icon: Download,
    title: "Full HD",
    body: "Unduhan 1080x1350 dengan suara asli.",
  },
  {
    icon: ShieldCheck,
    title: "Privat",
    body: "Foto diproses di perangkat kamu.",
  },
];

const technologies = [
  {
    logo: "/tech/mediabunny.svg",
    name: "Mediabunny",
    body: "Render video cepat langsung di browser.",
  },
  {
    logo: "/tech/webcodecs.svg",
    name: "WebCodecs",
    body: "Preview dan encoding memakai dukungan browser modern.",
  },
  {
    logo: "/tech/cloudflare.svg",
    name: "Cloudflare",
    body: "Disiapkan untuk deploy cepat dan aman.",
  },
  {
    logo: "/tech/nextjs.svg",
    name: "Next.js",
    body: "Antarmuka web ringan dan responsif.",
  },
];

export default function Home() {
  const [isInstagramOpen, setIsInstagramOpen] = useState(false);

  return (
    <main className="app-shell">
      <header className="site-header glass-panel">
        <a className="brand" href="#home" aria-label="Twibbon Video P2K">
          <span className="brand-mark">
            <Image src="/logo-baru.png" alt="" width={84} height={84} priority />
          </span>
          <span>
            <strong>Tools Auto Editor</strong>
            <small>Twibbon Prakarsa UAD 2026</small>
          </span>
        </a>
        <nav className="nav-links" aria-label="Navigasi utama">
          <a href="#generator">Buat Video</a>
          <a href="#tutorial">Tutorial</a>
          <a href="#fitur">Fitur</a>
          <a href="#teknologi">Teknologi</a>
          <a href="#privasi">Privasi</a>
          <a href="#developer">Developer</a>
        </nav>
        <a className="nav-cta" href="#generator">Gratis</a>
      </header>

      <section className="hero" id="home">
        <div className="hero-copy">
          <div className="hero-brandline">
            {technologies.map((item) => (
              <span className="hero-stack-logo" key={item.name} title={item.name}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={item.logo} alt={`${item.name} logo`} />
                <span>{item.name}</span>
              </span>
            ))}
          </div>
          <h1>
            Upload foto, twibbon video P2K <span>langsung jadi</span> tanpa CapCut.
          </h1>
          <p>
            Pilih foto terbaikmu, geser posisinya di frame, lihat preview,
            lalu unduh video P2K Full HD yang siap dibagikan.
          </p>
          <div className="hero-meta">
            <span>
              <UserRound size={15} />
              Developer Dian Nurwahid
            </span>
            <a href="https://diannurwahid.com">diannurwahid.com</a>
          </div>
        </div>
        <VideoGenerator />
      </section>

      <section className="benefit-strip glass-panel" id="fitur" aria-label="Fitur utama">
        {benefits.map((item) => {
          const Icon = item.icon;
          return (
            <article key={item.title}>
              <Icon size={25} />
              <div>
                <h2>{item.title}</h2>
                <p>{item.body}</p>
              </div>
            </article>
          );
        })}
      </section>

      <section className="tutorial-section glass-panel" id="tutorial">
        <div className="tutorial-copy">
          <span className="eyebrow small-eyebrow">Tutorial</span>
          <h2>Lihat alur cepat sebelum bikin video.</h2>
          <p>
            Tutorial singkat ini menunjukkan langkah utama: upload foto, atur
            posisi wajah di frame, cek preview, unduh Full HD, lalu bagikan.
          </p>
          <a className="tutorial-download" href="/tutorial-p2k.webm" download="tutorial-tools-auto-editor-p2k.webm">
            <Download size={17} />
            Unduh Tutorial
          </a>
        </div>
        <div className="tutorial-video-wrap">
          <video src="/tutorial-p2k.webm" controls playsInline preload="metadata" />
          <span>
            <PlayCircle size={17} />
            Tutorial 15 detik
          </span>
        </div>
      </section>

      <section className="technology-section glass-panel" id="teknologi">
        <div className="technology-head">
          <span className="eyebrow small-eyebrow">Teknologi</span>
          <h2>Dibangun dengan stack modern untuk video P2K yang cepat.</h2>
        </div>
        <div className="technology-grid">
          {technologies.map((item) => (
            <article key={item.name}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={item.logo} alt={`${item.name} logo`} />
              <div>
                <h3>{item.name}</h3>
                <p>{item.body}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="developer-section glass-panel" id="developer">
        <div>
          <span className="eyebrow small-eyebrow">Developer</span>
          <h2>Dibuat oleh Dian Nurwahid, maba Prodi Manajemen UAD 2026.</h2>
          <p>
            Format video dibuat mengikuti pengumuman P2K Prakarsa UAD. Tool ini
            hanya membantu memudahkan proses yang awalnya perlu edit manual di
            CapCut: upload foto, atur posisi, preview, lalu unduh video siap
            dibagikan.
          </p>
        </div>
        <div className="developer-actions">
          <a href="https://www.instagram.com/p2k_uad/?hl=id" target="_blank" rel="noopener noreferrer">
            Info P2K UAD
          </a>
          <a href="https://diannurwahid.com">diannurwahid.com</a>
          <a href="https://instagram.com/denzhang1">
            <AtSign size={17} />
            @denzhang1
          </a>
        </div>
      </section>

      <section className="policy-section" id="privasi" aria-label="Kebijakan dan syarat layanan">
        <article className="glass-panel">
          <h2>Kebijakan Privasi</h2>
          <p>
            Foto kamu diproses langsung di browser. File tidak dikirim ke server,
            tidak disimpan, dan hanya dipakai untuk membuat preview serta video
            yang kamu unduh.
          </p>
        </article>
        <article className="glass-panel" id="tos">
          <h2>Syarat Layanan</h2>
          <p>
            Gunakan tool ini untuk kebutuhan twibbon P2K Prakarsa UAD 2026.
            Pastikan foto yang dipakai milikmu sendiri dan hasil video dibagikan
            dengan tetap menjaga nama baik kampus.
          </p>
        </article>
      </section>

      <footer className="site-footer">
        <span>Copyright © 2026 diannurwahid.com.</span>
        <span>
          Made with love 🧡 by Dian Nurwahid - <a href="#privasi">Privasi</a> / <a href="#tos">TOS</a>
        </span>
      </footer>

      <div className={isInstagramOpen ? "instagram-widget expanded" : "instagram-widget"}>
        <button
          className="instagram-follow-toggle"
          type="button"
          onClick={() => setIsInstagramOpen((current) => !current)}
          aria-expanded={isInstagramOpen}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="https://static.cdninstagram.com/rsrc.php/yr/r/rzWiSjZRxk5.webp" alt="" />
          Follow yuk
        </button>
        <a
          className="instagram-float"
          href="https://www.instagram.com/denzhang1/p/DNlKTOAhGIS/"
          target="_blank"
          rel="noopener noreferrer"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="https://static.cdninstagram.com/rsrc.php/yr/r/rzWiSjZRxk5.webp" alt="" />
          <span>
            <small>Instagram - Dian Nurwahid di Instagram: "加油!"</small>
            <strong>Dian Nurwahid (@denzhang1) - Foto dan video Instagram</strong>
            <em>53 likes, 3 comments - denzhang1 pada August 20, 2025: "加油!".</em>
          </span>
        </a>
      </div>
    </main>
  );
}
