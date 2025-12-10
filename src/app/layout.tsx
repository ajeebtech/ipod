import type { Metadata } from "next";
import "./globals.css";
import { HistoryDrawer } from "@/components/HistoryDrawer";
import { UpNextDrawer } from "@/components/UpNextDrawer";



export const metadata: Metadata = {
  title: "an iPod",
  description: "play your songs here please",
};

import { Providers } from "@/components/Providers";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <Providers>
      <html lang="en">
        <body
          className={`antialiased`}
        >
          {children}
          <div className="fixed bottom-8 w-full flex justify-center gap-4 z-50">
            <HistoryDrawer />
            <UpNextDrawer />
          </div>
          <div className="fixed bottom-2 w-full text-center">
            <span className="text-gray-400 text-xs">
              made by{" "}
              <a
                href="https://x.com/ajeebtech"
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-gray-600 inline-block transition-all duration-200 hover:scale-110 hover:font-black hover:text-black"
              >
                ajeebtech
              </a>
            </span>
          </div>
        </body>
      </html>
    </Providers>
  );
}
