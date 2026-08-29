import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Memory Analysis Lab",
  description: "Cognitive-psychology-oriented autobiographical memory analysis with MongoDB persistence."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
