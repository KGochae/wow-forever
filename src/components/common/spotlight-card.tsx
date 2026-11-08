"use client";

import { useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface SpotlightCardProps {
  children: ReactNode;
  className?: string;
  spotlightColor?: string;
}

export function SpotlightCard({
  children,
  className,
  spotlightColor,
}: SpotlightCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ x: "50%", y: "50%" });
  const [hovering, setHovering] = useState(false);

  const onMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    setPos({ x: `${e.clientX - rect.left}px`, y: `${e.clientY - rect.top}px` });
  };

  return (
    <div
      ref={ref}
      onMouseMove={onMove}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      className={cn("relative isolate overflow-hidden", className)}
    >
      <div className="relative z-[1] h-full">{children}</div>
      <div
        className="pointer-events-none absolute inset-0 z-0 rounded-[inherit] transition-opacity duration-300"
        style={{
          opacity: hovering ? 1 : 0,
          background: `radial-gradient(500px circle at ${pos.x} ${pos.y}, ${
            spotlightColor || "var(--spotlight-color)"
          }, transparent 40%)`,
        }}
      />
    </div>
  );
}
