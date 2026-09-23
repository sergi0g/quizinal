"use client";

import { useMemo, useState } from "react";

function getURL(src: string): string {
  const target = new URL(src);

  if (target.protocol !== "https:") {
    throw new Error("Only HTTPS image URLs are supported");
  }

  return (
    `/img/${target.hostname}` +
    `${target.pathname || "/"}` +
    `${target.search}`
  );
}

/** Renders an optional question image, hiding itself if the URL fails to load. */
export function QuestionImage({ src, alt }: { src: string; alt: string }) {
  const [failed, setFailed] = useState(false);
  const url = useMemo(() => getURL(src), [src])

  return (
    <img
      src={url}
      alt={alt}
      loading="lazy"
      referrerPolicy="strict-origin-when-cross-origin"
      onError={() => setFailed(true)}
      className="mx-auto max-h-52 w-auto border border-border object-contain"
    />
  );
}
