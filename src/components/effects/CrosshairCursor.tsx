"use client";

import { useEffect, useState } from "react";
import { motion, useMotionValue, useSpring } from "motion/react";
import { SPRING_SNAPPY } from "@/lib/motion";

interface CrosshairCursorProps {
  size?: number;
  color?: string;
  strokeWidth?: number;
}

export function CrosshairCursor({
  size = 32,
  color = "var(--text-secondary)",
  strokeWidth = 1,
}: CrosshairCursorProps) {
  const [visible, setVisible] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [isTouch, setIsTouch] = useState(true);

  const mouseX = useMotionValue(-100);
  const mouseY = useMotionValue(-100);
  const springX = useSpring(mouseX, SPRING_SNAPPY);
  const springY = useSpring(mouseY, SPRING_SNAPPY);

  useEffect(() => {
    const isTouchDevice = window.matchMedia("(pointer: coarse)").matches;
    setIsTouch(isTouchDevice);
    if (isTouchDevice) return;

    // Hide default cursor globally, but preserve text cursor on inputs
    const style = document.createElement("style");
    style.textContent = `
      * { cursor: none !important; }
      input, textarea, [contenteditable] { cursor: text !important; }
      a, button, [role="button"] { cursor: none !important; }
    `;
    document.head.appendChild(style);

    function handleMouseMove(e: MouseEvent) {
      mouseX.set(e.clientX);
      mouseY.set(e.clientY);
      setVisible(true);
    }

    function handleMouseLeave() {
      setVisible(false);
    }

    function handlePointerOver(e: PointerEvent) {
      const target = e.target as HTMLElement;
      if (target.closest("[data-magnetic]")) {
        setExpanded(true);
      }
    }

    function handlePointerOut(e: PointerEvent) {
      const target = e.target as HTMLElement;
      if (target.closest("[data-magnetic]")) {
        setExpanded(false);
      }
    }

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseleave", handleMouseLeave);
    document.addEventListener("pointerover", handlePointerOver);
    document.addEventListener("pointerout", handlePointerOut);

    return () => {
      style.remove();
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseleave", handleMouseLeave);
      document.removeEventListener("pointerover", handlePointerOver);
      document.removeEventListener("pointerout", handlePointerOut);
    };
  }, [mouseX, mouseY]);

  if (isTouch) return null;

  const half = size / 2;
  const expandedSize = size * 1.5;
  const currentSize = expanded ? expandedSize : size;

  return (
    <motion.div
      className="pointer-events-none fixed top-0 left-0 z-[9999]"
      style={{
        x: springX,
        y: springY,
        translateX: "-50%",
        translateY: "-50%",
        opacity: visible ? 1 : 0,
      }}
    >
      <svg
        width={expandedSize}
        height={expandedSize}
        viewBox={`0 0 ${expandedSize} ${expandedSize}`}
        fill="none"
      >
        <line
          x1={expandedSize / 2 - currentSize / 2}
          y1={expandedSize / 2}
          x2={expandedSize / 2 + currentSize / 2}
          y2={expandedSize / 2}
          stroke={color}
          strokeWidth={strokeWidth}
          style={{ transition: "all 0.15s var(--ease-out)" }}
        />
        <line
          x1={expandedSize / 2}
          y1={expandedSize / 2 - currentSize / 2}
          x2={expandedSize / 2}
          y2={expandedSize / 2 + currentSize / 2}
          stroke={color}
          strokeWidth={strokeWidth}
          style={{ transition: "all 0.15s var(--ease-out)" }}
        />
        {expanded && (
          <circle
            cx={expandedSize / 2}
            cy={expandedSize / 2}
            r={half * 0.8}
            stroke={color}
            strokeWidth={strokeWidth}
            fill="none"
            style={{ transition: "all 0.15s var(--ease-out)" }}
          />
        )}
      </svg>
    </motion.div>
  );
}
