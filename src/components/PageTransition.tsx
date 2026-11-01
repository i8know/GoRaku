import { motion } from "framer-motion";
import { ReactNode, useEffect, useState } from "react";
import { useLocation, useOutlet } from "react-router-dom";

const TOP_LEVEL_ORDER: Record<string, number> = {
  "/beranda": 0,
  "/deck": 1,
  "/mining": 2,
  "/library": 3,
  "/progress": 4,
  "/settings": 5,
  "/profile": 6,
};

function getRouteMeta(pathname: string): { tabIndex: number; depth: number } {
  if (/^\/deck\/[^/]+\/review$/.test(pathname)) {
    return { tabIndex: 1, depth: 2 };
  }
  if (/^\/deck\/[^/]+$/.test(pathname)) {
    return { tabIndex: 1, depth: 1 };
  }
  if (/^\/library\/[^/]+$/.test(pathname)) {
    return { tabIndex: 3, depth: 2 };
  }
  for (const [prefix, idx] of Object.entries(TOP_LEVEL_ORDER)) {
    if (pathname === prefix || pathname.startsWith(`${prefix}/`)) {
      return { tabIndex: idx, depth: 0 };
    }
  }
  return { tabIndex: 0, depth: 0 };
}

let previousPathname = "/beranda";

export function computeTransitionDirection(currentPathname: string): {
  initialX: number;
  initialY: number;
  initialScale: number;
  exitX: number;
  exitY: number;
  exitScale: number;
} {
  const prev = getRouteMeta(previousPathname);
  const curr = getRouteMeta(currentPathname);

  // Entering a deeper sub-page (e.g. Deck Detail, Review, or Novel Reader)
  if (curr.depth > prev.depth) {
    return {
      initialX: 0,
      initialY: 12,
      initialScale: 0.984,
      exitX: 0,
      exitY: -6,
      exitScale: 0.992,
    };
  }

  // Returning from a deeper sub-page back to list/dashboard
  if (curr.depth < prev.depth) {
    return {
      initialX: 0,
      initialY: -10,
      initialScale: 1.012,
      exitX: 0,
      exitY: 8,
      exitScale: 0.988,
    };
  }

  // Moving horizontally between top-level navigation items
  const delta = curr.tabIndex - prev.tabIndex;
  const dir = delta === 0 ? 0 : delta > 0 ? 1 : -1;

  return {
    initialX: dir * 14,
    initialY: 8,
    initialScale: 0.995,
    exitX: dir * -10,
    exitY: -4,
    exitScale: 0.996,
  };
}

/**
 * Mengunci instance `<Outlet />` selama fase animasi keluar sehingga React Router
 * tidak mengganti isi halaman lama secara prematur sebelum animasi selesai.
 */
export function FrozenOutlet() {
  const outlet = useOutlet();
  const [frozen] = useState(outlet);
  return <>{frozen}</>;
}

interface PageTransitionProps {
  children: ReactNode;
  routeKey?: string;
}

export default function PageTransition({
  children,
  routeKey,
}: PageTransitionProps) {
  const location = useLocation();
  const activeKey = routeKey ?? location.pathname;
  const vector = computeTransitionDirection(activeKey);

  useEffect(() => {
    previousPathname = activeKey;
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [activeKey]);

  return (
    <motion.div
      className="page-transition-wrapper"
      initial={{
        opacity: 0,
        x: vector.initialX,
        y: vector.initialY,
        scale: vector.initialScale,
        filter: "blur(3px)",
      }}
      animate={{
        opacity: 1,
        x: 0,
        y: 0,
        scale: 1,
        filter: "blur(0px)",
        transitionEnd: {
          // Pastikan transform & filter dihapus setelah selesai agar elemen position: fixed (modal/popup) tetap mengacu ke viewport
          transform: "none",
          filter: "none",
        },
      }}
      exit={{
        opacity: 0,
        x: vector.exitX,
        y: vector.exitY,
        scale: vector.exitScale,
        filter: "blur(2px)",
        transition: {
          duration: 0.14,
          ease: [0.4, 0, 1, 1],
        },
      }}
      transition={{
        duration: 0.36,
        ease: [0.22, 1, 0.36, 1],
      }}
    >
      {children}
    </motion.div>
  );
}
