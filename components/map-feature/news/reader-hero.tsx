"use client";

import { useState } from "react";

// The reader hero image, isolated as a client component so ArticleReader stays
// server-renderable (/news/[id]). og-scraped image URLs rot; when one 404s the
// CSS aspect-ratio would otherwise reserve a permanent blank box, so unmount the
// image on load error. Same DOM as before on the happy path.
export function ReaderHero({ src }: { src: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      className="cs-reader-hero"
      src={src}
      alt=""
      decoding="async"
      onError={() => setFailed(true)}
    />
  );
}
