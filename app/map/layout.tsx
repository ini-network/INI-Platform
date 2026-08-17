import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "Public Data Map",
  description: "Explore NYC community signals, public data, and civic districts."
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover"
};

export default function PublicDataMapLayout({
  children
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
