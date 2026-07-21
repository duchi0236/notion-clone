import type { Metadata, Viewport } from "next";
import { Manrope } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { PWARegister } from "@/components/PWARegister";
import { SessionProvider } from "@/components/auth/SessionProvider";

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
  display: "swap",
});

export const metadata: Metadata = {
  title: "ClawNote · 超级文档空间",
  description: "文档、表格、日历与 AI 助手的个人知识工作台",
  manifest: "/manifest.webmanifest",
  applicationName: "ClawNote",
  appleWebApp: {
    capable: true,
    title: "ClawNote",
    statusBarStyle: "default",
  },
  icons: {
    icon: "/icon.svg",
    apple: "/icon.svg",
  },
};

export const viewport: Viewport = {
  themeColor: "#0f172a",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode; }>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <head>
        {/* 在水合前应用主题，避免深色模式闪白 */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('clawnote.theme');var d=t==='dark';document.documentElement.classList.toggle('dark',d);var g=localStorage.getItem('clawnote.glass');document.documentElement.classList.toggle('glass',g===null?true:g==='1');var a=JSON.parse(localStorage.getItem('clawnote.appearance')||'{}');var s=document.documentElement.style;if(a.blur!=null)s.setProperty('--glass-blur',a.blur+'px');if(a.alpha!=null){s.setProperty('--glass-alpha',String(a.alpha));s.setProperty('--glass-alpha-dark',String(Math.max(0,a.alpha-0.06)));}if(a.radius!=null)s.setProperty('--claw-radius',a.radius+'px');}catch(e){}})();`,
          }}
        />
      </head>
      <body className={cn(manrope.variable, manrope.className, "min-h-screen antialiased")}>
        <SessionProvider>{children}</SessionProvider>
        <PWARegister />
      </body>
    </html>
  );
}
