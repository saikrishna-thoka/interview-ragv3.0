import type { Metadata } from "next";
import { Outfit, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { Navbar } from "@/components/shared/navbar";
import { Toaster } from "sonner";

const fontDisplay = Outfit({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["500", "600", "700", "800"],
  display: "swap",
});

const fontSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "InterviewAI | RAG-Grounded AI/ML Technical Interview Suite",
  description:
    "Production-grade AI/ML interview preparation grounded in verified pgvector question banks, Groq LPU evaluations, and ATS resume alignment.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${fontDisplay.variable} ${fontSans.variable}`}
      suppressHydrationWarning
    >
      <body className="font-sans min-h-screen flex flex-col relative overflow-x-hidden">
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          {/* Ambient Mesh Gradient Blobs for Glass Refraction */}
          <div
            className="fixed inset-0 -z-10 pointer-events-none overflow-hidden"
            aria-hidden="true"
          >
            {/* Top-left Cyan Orb */}
            <div className="absolute -top-32 -left-32 h-[500px] w-[500px] rounded-full bg-cyan-500/15 blur-[120px] dark:bg-cyan-500/10" />
            {/* Top-right Violet Orb */}
            <div className="absolute top-1/4 -right-32 h-[550px] w-[550px] rounded-full bg-violet-600/15 blur-[130px] dark:bg-violet-600/12" />
            {/* Bottom-center Indigo Glow */}
            <div className="absolute -bottom-40 left-1/3 h-[600px] w-[600px] rounded-full bg-blue-600/15 blur-[140px] dark:bg-blue-600/10" />
          </div>

          <Navbar />
          <main className="flex-1 relative z-10">{children}</main>
          <Toaster position="top-right" richColors theme="system" />
        </ThemeProvider>
      </body>
    </html>
  );
}
