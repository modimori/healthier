import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Healthier — Everyday health, made clearer",
  description:
    "A calm AI doctor, fitness calculator, and daily health guide in English and Egyptian Arabic.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#f1efe7",
};

const localeScript = `
try {
  var locale = localStorage.getItem("healthier-locale");
  if (locale === "ar") {
    document.documentElement.lang = "ar";
    document.documentElement.dir = "rtl";
  }
} catch (error) {}
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" dir="ltr">
      <head>
        <script dangerouslySetInnerHTML={{ __html: localeScript }} />
      </head>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
