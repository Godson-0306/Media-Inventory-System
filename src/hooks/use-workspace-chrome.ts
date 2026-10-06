"use client";

import { useEffect, useRef, useState } from "react";

const SCROLL_SHADOW_AT = 6;
const MOBILE_QUERY = "(max-width: 639px)";
const DOWN_DELTA = 10;
const UP_DELTA = 10;

export function useWorkspaceChrome({ pinned }: { pinned?: boolean } = {}) {
  const chromeRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLElement>(null);
  const lastY = useRef(0);
  const [scrolled, setScrolled] = useState(false);
  const [headerCollapsed, setHeaderCollapsed] = useState(false);

  useEffect(() => {
    const el = chromeRef.current;
    if (!el) return;

    function applyOffset() {
      const node = chromeRef.current;
      if (!node) return;
      const height = Math.ceil(node.getBoundingClientRect().height);
      document.documentElement.style.setProperty("--workspace-sticky-offset", `${height}px`);
    }

    applyOffset();
    const observer = new ResizeObserver(applyOffset);
    observer.observe(el);
    return () => {
      observer.disconnect();
      document.documentElement.style.removeProperty("--workspace-sticky-offset");
    };
  }, []);

  useEffect(() => {
    lastY.current = window.scrollY;

    function onScroll() {
      const y = window.scrollY;
      setScrolled(y > SCROLL_SHADOW_AT);

      const mobile = window.matchMedia(MOBILE_QUERY).matches;
      if (!mobile || pinned) {
        setHeaderCollapsed(false);
        lastY.current = y;
        return;
      }

      const active = document.activeElement;
      if (headerRef.current && active instanceof Node && headerRef.current.contains(active)) {
        setHeaderCollapsed(false);
        lastY.current = y;
        return;
      }

      const delta = y - lastY.current;
      if (y < 16) setHeaderCollapsed(false);
      else if (delta > DOWN_DELTA) setHeaderCollapsed(true);
      else if (delta < -UP_DELTA) setHeaderCollapsed(false);
      lastY.current = y;
    }

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [pinned]);

  return { chromeRef, headerRef, scrolled, headerCollapsed };
}
