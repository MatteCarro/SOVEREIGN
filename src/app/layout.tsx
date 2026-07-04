import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SOVEREIGN — Il mondo osserva ogni tua mossa",
  description:
    "Gioco di strategia geopolitica asincrono e multiplayer: diplomazia, intrighi, guerre, economia e conseguenze generate dall'AI.",
};

export const viewport: Viewport = {
  themeColor: "#0e1116",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it" className="dark">
      <body>{children}</body>
    </html>
  );
}
