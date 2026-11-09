import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Poppins } from "next/font/google";
import "./globals.css";
import { PwaSetup } from "@/components/pwa-setup";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Regular weight only — just for the "trickle" wordmark in the logo, same
// typeface the mobile app already bundles (Poppins-Regular) for the same mark.
const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["400"],
});

export const metadata: Metadata = {
  title: "Trickle | Delivery that follows the journey",
  description: "People-powered parcel delivery that follows the journey.",
  applicationName: "Trickle",
  // Installed-app (PWA) behaviour on iPhone/iPad; the manifest
  // (src/app/manifest.ts) covers everything else.
  appleWebApp: {
    capable: true,
    title: "Trickle",
    statusBarStyle: "default",
  },
  icons: {
    apple: "/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#fbfaf7",
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${poppins.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        <PwaSetup />
      </body>
    </html>
  );
}
