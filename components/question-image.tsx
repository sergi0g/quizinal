"use client";

import { useMemo, useState } from "react";

function canUseImageProxy() {
  if (typeof window === "undefined") return false;
  if (!window.isSecureContext) return false;
  if (!('serviceWorker' in navigator)) return false;
  return !!navigator.serviceWorker.controller;
}

export function getHostedImageUrl(src: string) {
  if (!src) return src;
  if (typeof window === "undefined") return "";

  try {
    const parsed = new URL(src, window.location.origin);
    if (parsed.protocol === "data:" || parsed.protocol === "blob:") return src;
    if (parsed.origin === window.location.origin) return parsed.toString();
    if (!canUseImageProxy()) return parsed.toString();
    return `/proxy/image?url=${encodeURIComponent(parsed.toString())}`;
  } catch {
    return src;
  }
}

/** Renders an optional question image, hiding itself if the URL fails to load. */
export function QuestionImage({ src, alt }: { src: string; alt: string }) {
  const [failed, setFailed] = useState(false);
  const hostedSrc = useMemo(() => getHostedImageUrl(src), [src]);
  if (failed || !hostedSrc) return null;

  return (
    <img
      src={hostedSrc}
      alt={alt}
      loading="lazy"
      referrerPolicy="strict-origin-when-cross-origin"
      onError={() => setFailed(true)}
      className="mx-auto max-h-52 w-auto border border-border object-contain"
    />
  );
}
