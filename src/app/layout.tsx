import type { Metadata, Viewport } from "next";
import { GFS_Didot, Rubik } from "next/font/google";
import "./globals.css";

const rubik = Rubik({
  variable: "--font-rubik",
  subsets: ["latin"],
});

const gfsDidot = GFS_Didot({
  weight: "400",
  variable: "--font-gfs-didot",
  subsets: ["greek"], // GFS Didot is primarily Greek but supports Latin
});

export const metadata: Metadata = {
  title: "Ember",
  description: "Connect with your voice",
};

export const viewport: Viewport = {
  themeColor: "#eb7c5e",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${rubik.variable} ${gfsDidot.variable} antialiased font-sans`}
      >
        {children}
      </body>
    </html>
  );
}
