import type { Metadata } from "next";
import "./globals.css";
import "@/components/EmailEditorStyles.css";
import SessionProvider from '@/components/SessionProvider';

export const metadata: Metadata = {
  title: "Partner Reports - Vsprint",
  description: "System raportów dla partnerów agencji marketingowej",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pl">
      <body className="antialiased">
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}
