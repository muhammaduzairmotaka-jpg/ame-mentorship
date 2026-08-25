import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AME Mentorship Platform",
  description: "Mentorship scheduling and workforce-development tracker",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="bg-cream text-ink antialiased">{children}</body>
    </html>
  );
}
