import { Geist, Geist_Mono } from "next/font/google";
import "../globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { I18nProvider } from "@/context/I18nContext";
import { getDictionary } from "@/lib/i18n";
import PwaInstallPrompt from "@/components/PwaInstallPrompt";
import SplashScreen from "@/components/SplashScreen";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport = {
  themeColor: '#000000',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export async function generateMetadata({ params }) {
  const { lang } = await params;
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://maxai.com';
  
  return {
    title: lang === 'es' ? "MAX AI — Generación de Videos e Imágenes con IA" : "MAX AI — Geração de Vídeos e Imagens com IA",
    description: lang === 'es' ? "Plataforma SaaS para generación de videos e imágenes usando modelos de IA como Grok-3, Veo 3.1 y GPT Image-2." : "Plataforma SaaS para geração de vídeos e imagens usando modelos de IA como Grok-3, Veo 3.1 e GPT Image-2.",
    manifest: "/manifest.json",
    icons: {
      icon: "/favicon.png",
      apple: "/icons/max-ai-icon.png",
    },
    openGraph: {
      images: ['/icons/max-ai-preview.png'],
    },
    appleWebApp: {
      capable: true,
      statusBarStyle: "black-translucent",
      title: "MAX AI",
    },
    other: {
      "mobile-web-app-capable": "yes",
    },
    alternates: {
      canonical: `${baseUrl}/${lang}`,
      languages: {
        'pt-BR': `${baseUrl}/pt`,
        'es': `${baseUrl}/es`,
      },
    },
  };
}

export default async function RootLayout({ children, params }) {
  const { lang } = await params;
  const dict = await getDictionary(lang);
  
  return (
    <html
      lang={lang === 'es' ? 'es' : 'pt-BR'}
      className={`${geistSans.variable} ${geistMono.variable} h-full`}
    >
      <body className="h-full bg-[#212121] text-[#e3e3e8] antialiased">
        <AuthProvider>
          <I18nProvider dict={dict} lang={lang}>
            <SplashScreen>
              {children}
            </SplashScreen>
            <PwaInstallPrompt />
          </I18nProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
