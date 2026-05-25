import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { SessionProvider } from "@/components/auth/SessionProvider";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "ClawNote",
  description: "Commercial-grade collaborative knowledge workspace",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode; }>) {
  return (
    <html lang="en">
      <body className={cn(inter.className, "min-h-screen bg-white antialiased")}>
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}
