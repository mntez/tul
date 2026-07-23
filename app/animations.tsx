"use client";

import { useState, useEffect, useRef } from "react";

export function Skeleton({ width, height, style }: { width?: string | number; height?: string | number; style?: React.CSSProperties }) {
  return <div className="skeleton" style={{ width, height, ...style }} />;
}

export function ImageWithSkeleton({ src, alt, className, style, imgStyle }: {
  src: string;
  alt: string;
  className?: string;
  style?: React.CSSProperties;
  imgStyle?: React.CSSProperties;
}) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  return (
    <div className="img-skeleton-wrap" style={{ position: "relative", ...style }}>
      {!loaded && !error && <Skeleton width="100%" height="100%" style={{ position: "absolute", inset: 0 }} />}
      {error && <div className="preview-empty" style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>Failed to load</div>}
      <img
        src={src}
        alt={alt}
        className={`${className || ""} ${loaded ? "img-loaded" : "img-loading"}`}
        style={{ ...imgStyle }}
        onLoad={() => setLoaded(true)}
        onError={() => setError(true)}
      />
    </div>
  );
}

export function Spinner({ size = 20 }: { size?: number }) {
  return (
    <svg className="spinner" width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.2" />
      <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export function FadeIn({ children, show = true, duration = 300 }: { children: React.ReactNode; show?: boolean; duration?: number }) {
  const [visible, setVisible] = useState(show);
  const [animating, setAnimating] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (show) {
      setVisible(true);
      requestAnimationFrame(() => setAnimating(true));
    } else {
      setAnimating(false);
      const timer = setTimeout(() => setVisible(false), duration);
      return () => clearTimeout(timer);
    }
  }, [show, duration]);

  if (!visible) return null;

  return (
    <div
      ref={ref}
      style={{
        transition: `opacity ${duration}ms ease, transform ${duration}ms ease`,
        opacity: animating ? 1 : 0,
        transform: animating ? "translateY(0)" : "translateY(4px)",
      }}
    >
      {children}
    </div>
  );
}
