import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans, JetBrains_Mono, Bricolage_Grotesque } from "next/font/google";
import "./globals.css";
import { AppProvider } from "./context";
import { InBuiltAssistant } from "./components/InBuiltAssistant";

const fontDisplay = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
  weight: ["400", "600", "700", "800"],
});

const fontSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

const fontMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
  weight: ["400", "500", "600"],
});

export const viewport: Viewport = {
  themeColor: "#0B0D13",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export const metadata: Metadata = {
  title: "Layt · A Living Atlas of Light for Off-Grid West Africa",
  description:
    "AI platform keeping off-grid and weak-grid communities powered and safe from climate shocks via regional intelligence and site brain forecasting.",
  manifest: "/manifest.json",
  icons: {
    icon: "/icon.svg",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${fontDisplay.variable} ${fontSans.variable} ${fontMono.variable}`}>
        <AppProvider>
          {children}
          <InBuiltAssistant />
        </AppProvider>
      </body>
    </html>
  );
}
