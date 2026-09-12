"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import {
  AtSign,
  Copy,
  Download,
  ExternalLink,
  Gift,
  MoveDownRight,
  PlayCircle,
  ShieldCheck,
  UserRound,
  X,
  Zap,
} from "lucide-react";
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
    body: "Generate HD setelah foto diatur.",
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
    body: "Encoding memakai dukungan browser modern.",
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

const instagramReelUrl = "https://www.instagram.com/denzhang1/reel/Dc7poZUAfGv/";
const instagramIconUrl = "https://static.cdninstagram.com/rsrc.php/yr/r/rzWiSjZRxk5.webp";
const instagramReelFallbackThumb = "/student-preview.png";
const instagramReelThumb =
  "https://scontent.cdninstagram.com/v/t51.71878-15/796641279_1388252672753971_1669868412018179825_n.jpg?stp=cmp1_dst-jpg_e35_s640x640_tt6&_nc_cat=111&ccb=7-5&_nc_sid=18de74&efg=eyJlZmdfdGFnIjoiQ0xJUFMuYmVzdF9pbWFnZV91cmxnZW4uQzMifQ%3D%3D&_nc_ohc=jIfw4FBc5ioQ7kNvwEzdCzY&_nc_oc=Adp5COPwmrt5hUQj1FHftHWQLH1hk3Gei2GiUeJoUA3JpgNDQmpSx737xhjAkqvyHUI&_nc_zt=23&_nc_ht=scontent.cdninstagram.com&_nc_gid=PCDuC0wpVOkJnB3YvfDCVg&_nc_ss=70689&oh=00_AQKLcPJ0CtUnwIlsBErHHkNKyCvVMxrCdNoepZoX2kt1_A&oe=6AAAF84D";

export default function Home() {
  const [isInstagramOpen, setIsInstagramOpen] = useState(false);
  const [showBrowserNotice, setShowBrowserNotice] = useState(false);
  const [showThankYouAnnouncement, setShowThankYouAnnouncement] = useState(false);
  const [isAndroidDevice, setIsAndroidDevice] = useState(false);
  const [isLinkCopied, setIsLinkCopied] = useState(false);

  useEffect(() => {
    const userAgent = navigator.userAgent || "";
    const isInAppBrowser = /Instagram|FBAN|FBAV|FB_IAB|Line|TikTok/i.test(userAgent);
    const dismissed = sessionStorage.getItem("browser-notice-dismissed") === "true";
    setIsAndroidDevice(/Android/i.test(userAgent));
    if (isInAppBrowser && !dismissed) setShowBrowserNotice(true);
    setShowThankYouAnnouncement(true);
  }, []);

  async function copyCurrentLink() {
    const url = window.location.href;
    try {
      await navigator.clipboard.writeText(url);
      setIsLinkCopied(true);
      window.setTimeout(() => setIsLinkCopied(false), 2200);
    } catch {
      window.prompt("Salin link ini lalu buka di Chrome/Safari:", url);
    }
  }

  function openInExternalBrowser() {
    const url = window.location.href;
    if (isAndroidDevice) {
      const parsed = new URL(url);
      const fallback = encodeURIComponent(url);
      window.location.href = `intent://${parsed.host}${parsed.pathname}${parsed.search}${parsed.hash}#Intent;scheme=${parsed.protocol.replace(":", "")};package=com.android.chrome;S.browser_fallback_url=${fallback};end`;
      return;
    }
    copyCurrentLink();
  }

  function dismissBrowserNotice() {
    sessionStorage.setItem("browser-notice-dismissed", "true");
    setShowBrowserNotice(false);
  }

  function dismissThankYouAnnouncement() {
    setShowThankYouAnnouncement(false);
  }

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
            Pilih foto terbaikmu, geser posisinya di frame, generate HD,
            lalu unduh video P2K Full HD yang siap dibagikan.
          </p>
          <div className="hero-meta">
            <span>
              <UserRound size={15} />
              Developer Dian Nurwahid
            </span>
            <div className="hero-instagram-slot">
              <div className="instagram-arrow-label">
                <MoveDownRight size={17} />
                Like & follow developer
              </div>
              <InstagramEmbed className="instagram-embed hero-instagram" />
            </div>
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
            posisi wajah di frame, generate Full HD, lalu bagikan.
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
            CapCut: upload foto, atur posisi, generate HD, lalu unduh video siap
            dibagikan.
          </p>
        </div>
        <div className="developer-actions">
          <a href="https://www.instagram.com/p2k_uad/?hl=id" target="_blank" rel="noopener noreferrer">
            Info P2K UAD
          </a>
          <a href="https://instagram.com/denzhang1">
            <AtSign size={17} />
            @denzhang1
          </a>
        </div>
        <div className="developer-instagram">
          <div className="instagram-arrow-label">
            <MoveDownRight size={17} />
            Like & follow developer
          </div>
          <InstagramEmbed />
        </div>
      </section>

      <section className="policy-section" id="privasi" aria-label="Kebijakan dan syarat layanan">
        <article className="glass-panel">
          <h2>Kebijakan Privasi</h2>
          <p>
            Foto kamu diproses langsung di browser. File tidak dikirim ke server,
            tidak disimpan, dan hanya dipakai untuk membuat video
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
          <img src={instagramIconUrl} alt="" />
          Like twibbon IG saya
        </button>
        <InstagramEmbed className="instagram-float" />
      </div>

      {showBrowserNotice ? (
        <div className="browser-notice" role="dialog" aria-label="Buka di browser utama">
          <button
            className="browser-notice-close"
            type="button"
            onClick={dismissBrowserNotice}
            aria-label="Tutup pemberitahuan"
          >
            <X size={16} />
          </button>
          <strong>Buka di Chrome/Safari dulu</strong>
          <p>
            Browser Instagram kadang memblokir download video. Untuk hasil paling
            lancar, buka halaman ini di browser utama.
          </p>
          <div className="browser-notice-actions">
            <button type="button" onClick={openInExternalBrowser}>
              <ExternalLink size={16} />
              {isAndroidDevice ? "Buka di Chrome" : "Buka di Browser"}
            </button>
            <button type="button" onClick={copyCurrentLink}>
              <Copy size={16} />
              {isLinkCopied ? "Link Tersalin" : "Salin Link"}
            </button>
          </div>
          <small>
            iPhone: tap menu Instagram, pilih buka di browser luar, atau salin
            link lalu buka di Safari/Chrome.
          </small>
        </div>
      ) : null}

      {showThankYouAnnouncement ? (
        <div className="feature-announcement-backdrop" role="dialog" aria-label="Update fitur template fakultas dan FEB">
          <div className="feature-announcement thank-you-announcement glass-panel">
            <button
              className="feature-announcement-close"
              type="button"
              onClick={dismissThankYouAnnouncement}
              aria-label="Tutup pengumuman"
            >
              <X size={16} />
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/thank-you-announcement.png" alt="" />
            <div>
              <span>Update fitur</span>
              <h2>Template fakultas sekarang lebih fleksibel.</h2>
              <p>
                Sekarang kamu bisa upload video twibbon mentah dengan green screen
                untuk fakultas masing-masing. Khusus Fakultas Ekonomi dan Bisnis,
                template FEB sudah tersedia langsung di mode Custom Template.
              </p>
              <div className="announcement-metrics" aria-label="Statistik satu hari">
                <strong>Custom template</strong>
                <strong>Template FEB tersedia</strong>
              </div>
              <button type="button" onClick={dismissThankYouAnnouncement}>
                Coba fitur baru
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}

function InstagramEmbed({ className = "instagram-embed" }) {
  return (
    <a
      className={className}
      href={instagramReelUrl}
      target="_blank"
      rel="noopener noreferrer"
    >
      <div className="instagram-thumb">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={instagramReelThumb}
          alt=""
          onError={(event) => {
            event.currentTarget.onerror = null;
            event.currentTarget.src = instagramReelFallbackThumb;
          }}
        />
      </div>
      <div className="instagram-content">
        <strong>Dian Nurwahid (@denzhang1) • Instagram reel</strong>
        <em>
          105 likes, 6 comments - denzhang1 on September 5, 2026:
          "Assalamualaikum Warahmatullahi Wabarakatuh, Dahlan Muda Berkarya
          Wujudkan Transformasi Berkemajuan."
        </em>
        <div className="instagram-source">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={instagramIconUrl} alt="" />
          <span>Dian Nurwahid</span>
          <span>5 Sep 2026</span>
        </div>
      </div>
    </a>
  );
}
