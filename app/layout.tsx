import type { Metadata } from "next";
import { TRIP } from "@/lib/trip";
import "./globals.css";

export const metadata: Metadata = {
  title: `Quando? — when can we all go to ${TRIP.name}?`,
  description: "Tap the days you're free. The brightest dates are when the most of us can make it. No login, no app.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600;9..144,900&family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
