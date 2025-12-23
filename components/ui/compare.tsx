
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
"use client";
import React, { useState, useEffect, useRef, useCallback } from "react";
import { cn } from "../../lib/utils";
import { DotsVerticalIcon } from "../icons";
 
interface CompareProps {
  firstImage?: string;
  secondImage?: string;
  className?: string;
  firstImageClassName?: string;
  secondImageClassname?: string;
  initialSliderPercentage?: number;
  slideMode?: "hover" | "drag";
  showHandlebar?: boolean;
  autoplay?: boolean;
  autoplayDuration?: number;
}

export const Compare = ({
  firstImage = "",
  secondImage = "",
  className,
  firstImageClassName,
  secondImageClassname,
  initialSliderPercentage = 50,
  slideMode = "hover",
  showHandlebar = true,
  autoplay = false,
  autoplayDuration = 5000,
}: CompareProps) => {
  const [sliderXPercent, setSliderXPercent] = useState(initialSliderPercentage);
  const [isDragging, setIsDragging] = useState(false);
  const sliderRef = useRef<HTMLDivElement>(null);
  const autoplayRef = useRef<ReturnType<typeof setTimeout> | null>(null);
 
  const startAutoplay = useCallback(() => {
    if (!autoplay) return;
 
    const startTime = Date.now();
    const animate = () => {
      const elapsedTime = Date.now() - startTime;
      const progress = (elapsedTime % (autoplayDuration * 2)) / autoplayDuration;
      const percentage = progress <= 1 ? progress * 100 : (2 - progress) * 100;
 
      setSliderXPercent(percentage);
      autoplayRef.current = setTimeout(animate, 16);
    };
 
    animate();
  }, [autoplay, autoplayDuration]);
 
  const stopAutoplay = useCallback(() => {
    if (autoplayRef.current) {
      clearTimeout(autoplayRef.current);
      autoplayRef.current = null;
    }
  }, []);
 
  useEffect(() => {
    startAutoplay();
    return () => stopAutoplay();
  }, [startAutoplay, stopAutoplay]);
 
  const handleMove = useCallback(
    (clientX: number) => {
      if (!sliderRef.current) return;
      if (slideMode === "hover" || (slideMode === "drag" && isDragging)) {
        const rect = sliderRef.current.getBoundingClientRect();
        const x = clientX - rect.left;
        const percent = (x / rect.width) * 100;
        requestAnimationFrame(() => {
          setSliderXPercent(Math.max(0, Math.min(100, percent)));
        });
      }
    },
    [slideMode, isDragging]
  );
 
  return (
    <div
      ref={sliderRef}
      className={cn("relative overflow-hidden w-full h-full select-none bg-gray-100", className)}
      style={{
        cursor: slideMode === "drag" ? (isDragging ? "grabbing" : "grab") : "col-resize",
      }}
      onMouseMove={(e) => handleMove(e.clientX)}
      onMouseLeave={() => {
        if (slideMode === "hover") setSliderXPercent(initialSliderPercentage);
        if (slideMode === "drag") setIsDragging(false);
        startAutoplay();
      }}
      onMouseEnter={() => {
        stopAutoplay();
      }}
      onMouseDown={() => slideMode === "drag" && setIsDragging(true)}
      onMouseUp={() => slideMode === "drag" && setIsDragging(false)}
      onTouchStart={(e) => !autoplay && slideMode === "drag" && setIsDragging(true)}
      onTouchEnd={() => !autoplay && setIsDragging(false)}
      onTouchMove={(e) => !autoplay && handleMove(e.touches[0].clientX)}
    >
      {/* Handlebar Line */}
      <div
          className="h-full w-1 absolute top-0 m-auto z-50 bg-transparent pointer-events-none"
          style={{ left: `calc(${sliderXPercent}% - 2px)` }}
      >
          <div className="h-full w-0.5 bg-gradient-to-b from-transparent via-white to-transparent mx-auto shadow-[0_0_10px_rgba(0,0,0,0.2)]"></div>
          {showHandlebar && (
            <div className="h-9 w-9 rounded-full bg-white shadow-xl border border-gray-100 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center">
              <DotsVerticalIcon className="h-5 w-5 text-gray-400 rotate-90" />
            </div>
          )}
      </div>

      {/* First Image (Top Layer - Clipped) -> "Before" on Left */}
      <div 
        className={cn("absolute inset-0 z-40 w-full h-full select-none overflow-hidden", firstImageClassName)}
        style={{ clipPath: `inset(0 ${100 - sliderXPercent}% 0 0)` }}
      >
        {firstImage && (
           <img 
            alt="Before" 
            src={firstImage} 
            className="absolute inset-0 w-full h-full object-cover select-none" 
            draggable={false} 
           />
        )}
      </div>

      {/* Second Image (Bottom Layer - Full) -> "After" on Right */}
      <div className={cn("absolute inset-0 z-30 w-full h-full select-none overflow-hidden", secondImageClassname)}>
         {secondImage ? (
            <img 
              alt="After" 
              src={secondImage} 
              className="absolute inset-0 w-full h-full object-cover select-none" 
              draggable={false} 
            />
         ) : (
            <div className="w-full h-full flex items-center justify-center bg-gray-100">
                <span className="text-gray-400 text-xs">No After Image</span>
            </div>
         )}
      </div>
    </div>
  );
};
