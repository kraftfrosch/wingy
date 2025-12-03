import type { Metadata } from "next";
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
  title: "VoiceDate",
  description: "Connect with your voice",
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
