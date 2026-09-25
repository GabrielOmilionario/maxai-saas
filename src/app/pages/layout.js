import { Inter } from "next/font/google";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata = {
  title: "MAX AI — Crie Imagens e Vídeos Incríveis com Inteligência Artificial",
  description: "Plataforma de IA para geração de imagens e vídeos profissionais. Modelos Gpt Image-2, Grok e Veo 3.1. Comece grátis.",
  icons: {
    icon: "/favicon.png",
    apple: "/icons/max-ai-icon.png",
  },
  openGraph: {
    title: "MAX AI — Crie Imagens e Vídeos Incríveis com IA",
    description: "Plataforma de IA para geração de imagens e vídeos profissionais. Comece grátis.",
    images: ["/icons/max-ai-preview.png"],
    type: "website",
  },
};

export const viewport = {
  themeColor: "#000000",
  width: "device-width",
  initialScale: 1,
};

export default function PagesLayout({ children }) {
  return (
    <html lang="pt-BR" className={inter.variable}>
      <head>
      </head>
      <body
        style={{
          margin: 0,
          padding: 0,
          background: "#06060A",
          color: "#FFFFFF",
          fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
          WebkitFontSmoothing: "antialiased",
          MozOsxFontSmoothing: "grayscale",
        }}
      >
        {children}
      </body>
    </html>
  );
}
