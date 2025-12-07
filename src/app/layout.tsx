import type { Metadata } from "next";
import "./globals.css";



export const metadata: Metadata = {
  title: "an iPod",
  description: "play your songs here please",
};

import { ClerkProvider } from "@clerk/nextjs";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body
          className={`antialiased`}
        >
          {children}
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
    </ClerkProvider>
  );
}
