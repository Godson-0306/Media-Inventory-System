import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Inter } from "next/font/google";
import { ThemeProvider } from "@/components/theme/theme-provider";
import { ThemeToaster } from "@/components/theme/theme-toaster";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "Asset Operations Platform",
  description:
    "Serialized control for production teams and equipment-intensive organizations.",
};

const themeScript = `(function(){try{var t=localStorage.getItem("aop-theme");document.documentElement.classList.toggle("dark",t!=="light");}catch(e){document.documentElement.classList.add("dark");}})();`;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} h-full dark`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-full bg-background font-sans text-foreground antialiased">
        <ThemeProvider>
          {children}
          <ThemeToaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
