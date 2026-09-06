import "./globals.css";
import { Plus_Jakarta_Sans } from "next/font/google";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  display: "swap",
});

export const metadata = {
  title: "Tools Auto Editor | Twibbon Prakarsa UAD 2026",
  description:
    "Upload foto sekarang, Twibbon Video P2K langsung jadi otomatis untuk P2K Prakarsa UAD 2026.",
  icons: {
    icon: "/logo-baru.png",
    shortcut: "/logo-baru.png",
    apple: "/logo-baru.png",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="id" className={jakarta.className}>
      <body>{children}</body>
    </html>
  );
}
