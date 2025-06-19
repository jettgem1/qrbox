import "./globals.css";
import { GeistSans } from "geist/font/sans";
import { Toaster } from "sonner";
import { cn } from "@/lib/utils";
import { Metadata } from "next";
import { AuthProvider } from "@/lib/auth-context";

export const metadata: Metadata = {
  title: "PackLog - Smart Moving Inventory with QR Codes",
  description: "Organize your moving inventory with QR codes. Scan to see what's in each box.",
  keywords: ["moving", "inventory", "qr codes", "organization", "packing"],
  authors: [{ name: "PackLog" }],
  openGraph: {
    title: "PackLog",
    description: "Smart Moving Inventory with QR Codes",
    type: "website",
    url: "/og?title=PackLog - Smart Moving Inventory",
    images: [
      {
        url: "/og?title=PackLog - Smart Moving Inventory",
        width: 1200,
        height: 630,
        alt: "PackLog - Smart Moving Inventory",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "PackLog - Smart Moving Inventory",
    description: "Organize your moving inventory with QR codes",
    images: ["/og?title=PackLog - Smart Moving Inventory"],
  },
  robots: {
    index: true,
    follow: true,
  },
  viewport: {
    width: "device-width",
    initialScale: 1,
  },
  icons: {
    icon: "/favicon.ico",
  },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "PackLog",
  },
  other: {
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "default",
    "apple-mobile-web-app-title": "PackLog",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
        <meta name="theme-color" content="#3B82F6" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="QRBox" />
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body className={cn(GeistSans.className, "antialiased")}>
        <AuthProvider>
          <Toaster position="top-center" richColors />
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
