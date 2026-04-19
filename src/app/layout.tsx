import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Prompt to Component",
  description:
    "Natural language to React component generator with live preview",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
