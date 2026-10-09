import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ATLAS | Private Market Intelligence",
  description: "Private trading intelligence and CPA operations workspace."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
