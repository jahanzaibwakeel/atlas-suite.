import type { Metadata } from "next";
import { Providers } from "./providers";
import "../styles.css";

export const metadata: Metadata = {
  title: "AtlasSuite",
  description: "Enterprise collaboration operations console"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
