"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ImageOff,
  RefreshCw,
  ZoomIn,
  ZoomOut,
  Maximize2,
  X,
  RotateCcw,
  Plus,
  Minus,
} from "lucide-react";
import {
  resolveMemoryImageUrl,
  resolveMemoryImageUrlAsync,
  extractStoragePath,
  MEMORY_IMAGE_BUCKET,
} from "@/lib/image-utils";

interface SmartImageViewerProps {
  memoryOrPath?: any;
  alt?: string;
  zoomLevel?: number;
  onToggleZoom?: () => void;
  className?: string;
}

export function SmartImageViewer({
  memoryOrPath,
  alt = "Memory Image",
  zoomLevel = 1,
  onToggleZoom,
  className = "",
}: SmartImageViewerProps) {
  const [resolvedUrl, setResolvedUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [hasError, setHasError] = useState<boolean>(false);
  const [reloadKey, setReloadKey] = useState<number>(0);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Full-screen Image Viewer & Zoom/Pan state
  const [isFullScreen, setIsFullScreen] = useState<boolean>(false);
  const [fsScale, setFsScale] = useState<number>(1);
  const [fsPan, setFsPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const lastTouchDistRef = useRef<number | null>(null);
  const lastTapRef = useRef<number>(0);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    setHasError(false);

    const relPath =
      extractStoragePath(typeof memoryOrPath === "string" ? memoryOrPath : memoryOrPath?.cover_image) ||
      "unknown";

    console.log(`[IMAGE_PIPELINE] Fetch Started | Bucket: ${MEMORY_IMAGE_BUCKET} | Storage Path: ${relPath}`);

    // 1. Synchronous initial resolution
    const syncUrl = resolveMemoryImageUrl(memoryOrPath);
    if (syncUrl && isMounted) {
      setResolvedUrl(syncUrl);
    }

    // 2. Strict 8-second safety timeout
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      if (isMounted && isLoading) {
        console.error(`[IMAGE_PIPELINE] IMAGE LOAD TIMEOUT (>8s) | Bucket: ${MEMORY_IMAGE_BUCKET} | Storage Path: ${relPath}`);
        setIsLoading(false);
        setHasError(true);
      }
    }, 8000);

    // 3. Asynchronous resolution via Supabase SDK
    resolveMemoryImageUrlAsync(memoryOrPath)
      .then((res) => {
        if (!isMounted) return;
        if (res.url) {
          console.log(`[STORAGE_DIAGNOSTIC] Generated URL: ${res.url} | HTTP Status: ${res.httpStatus || 200}`);
          setResolvedUrl(res.url);
        } else {
          console.error(`[STORAGE_DIAGNOSTIC] Failure Reason: ${res.failureReason || "Could not resolve storage URL"}`);
          if (timeoutRef.current) clearTimeout(timeoutRef.current);
          setIsLoading(false);
          setHasError(true);
        }
      })
      .catch((err) => {
        if (!isMounted) return;
        console.error(`[IMAGE_PIPELINE] Image Failed: true | Exception:`, err);
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        setIsLoading(false);
        setHasError(true);
      });

    return () => {
      isMounted = false;
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [memoryOrPath, reloadKey]);

  // Check if img is already cached & complete on mount / URL change
  useEffect(() => {
    if (imgRef.current && imgRef.current.complete && imgRef.current.naturalWidth > 0 && isLoading) {
      console.log("[IMAGE_PIPELINE] Image Loaded: true | HTTP Status: 200 (Cached)");
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      setIsLoading(false);
      setHasError(false);
    }
  }, [resolvedUrl, isLoading]);

  // Keyboard shortcut ESC to close full screen
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isFullScreen) {
        closeFullScreen();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isFullScreen]);

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    const target = e.currentTarget;
    setIsLoading(false);
    setHasError(false);
    console.log("[IMAGE_PIPELINE] Image Loaded: true | HTTP Status: 200", {
      url: target.currentSrc || target.src,
      width: target.naturalWidth,
      height: target.naturalHeight,
    });
  };

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    const target = e.currentTarget;
    setIsLoading(false);
    setHasError(true);
    console.warn("[IMAGE_PIPELINE] Image Notice: Fallback triggered for target URL:", target.currentSrc || target.src || resolvedUrl);
  };

  const handleRetry = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsLoading(true);
    setHasError(false);
    setReloadKey((prev) => prev + 1);
  };

  const openFullScreen = () => {
    setFsScale(1);
    setFsPan({ x: 0, y: 0 });
    setIsFullScreen(true);
    if (onToggleZoom) {
      onToggleZoom();
    }
  };

  const closeFullScreen = () => {
    setIsFullScreen(false);
    setFsScale(1);
    setFsPan({ x: 0, y: 0 });
    setIsDragging(false);
  };

  // Zoom controls
  const handleZoomIn = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setFsScale((prev) => Math.min(5, Math.round((prev + 0.5) * 10) / 10));
  };

  const handleZoomOut = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setFsScale((prev) => {
      const next = Math.max(1, Math.round((prev - 0.5) * 10) / 10);
      if (next === 1) setFsPan({ x: 0, y: 0 });
      return next;
    });
  };

  const handleResetZoom = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setFsScale(1);
    setFsPan({ x: 0, y: 0 });
  };

  // Mouse wheel zoom in full screen
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const delta = e.deltaY < 0 ? 0.25 : -0.25;
    setFsScale((prev) => {
      const next = Math.max(1, Math.min(5, Math.round((prev + delta) * 100) / 100));
      if (next === 1) setFsPan({ x: 0, y: 0 });
      return next;
    });
  };

  // Double click / Double tap to zoom
  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (fsScale > 1) {
      handleResetZoom();
    } else {
      setFsScale(2.5);
    }
  };

  // Mouse drag panning
  const handleMouseDown = (e: React.MouseEvent) => {
    if (fsScale <= 1) return;
    e.stopPropagation();
    setIsDragging(true);
    dragStartRef.current = { x: e.clientX - fsPan.x, y: e.clientY - fsPan.y };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || fsScale <= 1) return;
    e.stopPropagation();
    setFsPan({
      x: e.clientX - dragStartRef.current.x,
      y: e.clientY - dragStartRef.current.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Touch handlers for mobile (pinch to zoom & drag)
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      lastTouchDistRef.current = dist;
    } else if (e.touches.length === 1) {
      const now = Date.now();
      if (now - lastTapRef.current < 300) {
        // Double tap on mobile
        if (fsScale > 1) {
          handleResetZoom();
        } else {
          setFsScale(2.5);
        }
      }
      lastTapRef.current = now;

      if (fsScale > 1) {
        setIsDragging(true);
        dragStartRef.current = {
          x: e.touches[0].clientX - fsPan.x,
          y: e.touches[0].clientY - fsPan.y,
        };
      }
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && lastTouchDistRef.current !== null) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const delta = (dist - lastTouchDistRef.current) * 0.008;
      setFsScale((prev) => {
        const next = Math.max(1, Math.min(5, Math.round((prev + delta) * 100) / 100));
        if (next === 1) setFsPan({ x: 0, y: 0 });
        return next;
      });
      lastTouchDistRef.current = dist;
    } else if (e.touches.length === 1 && isDragging && fsScale > 1) {
      setFsPan({
        x: e.touches[0].clientX - dragStartRef.current.x,
        y: e.touches[0].clientY - dragStartRef.current.y,
      });
    }
  };

  const handleTouchEnd = () => {
    lastTouchDistRef.current = null;
    setIsDragging(false);
  };

  return (
    <div className={`relative w-full h-full flex items-center justify-center bg-[#070b16] overflow-hidden ${className}`}>
      {/* 1. SKELETON LOADER OVERLAY WHILE LOADING */}
      {isLoading && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-[#070b16]/90 backdrop-blur-md p-6">
          <div className="w-14 h-14 rounded-2xl bg-white/10 border border-white/15 flex items-center justify-center text-aurora-cyan animate-bounce shadow-lg">
            <RefreshCw className="w-6 h-6 animate-spin text-aurora-cyan" />
          </div>
          <p className="mt-3 text-xs font-mono font-medium text-white/70">Loading memory image...</p>
        </div>
      )}

      {/* 2. ERROR / UNABLE TO LOAD IMAGE PLACEHOLDER */}
      {hasError || !resolvedUrl ? (
        <div className="flex flex-col items-center justify-center p-8 text-center space-y-3 max-w-sm z-10">
          <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 shadow-lg">
            <ImageOff className="w-8 h-8 stroke-[1.5]" />
          </div>
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-white">Unable to load image.</h4>
            <p className="text-xs text-white/50 leading-relaxed font-sans">
              The requested image could not be retrieved from storage.
            </p>
          </div>
          <button
            type="button"
            onClick={handleRetry}
            className="px-4 py-2 rounded-xl bg-white/[0.08] hover:bg-white/[0.15] border border-white/15 text-xs text-white font-semibold inline-flex items-center gap-2 transition-all cursor-pointer shadow-md"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Retry Loading</span>
          </button>
        </div>
      ) : (
        /* 3. ACTUAL HIGH RESOLUTION IMAGE */
        <motion.img
          ref={imgRef}
          key={resolvedUrl}
          src={resolvedUrl}
          alt={alt}
          animate={{ scale: zoomLevel }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          onLoad={handleImageLoad}
          onError={handleImageError}
          onClick={openFullScreen}
          className={`w-full h-full object-contain max-h-[75vh] cursor-zoom-in transition-opacity duration-300 ${
            isLoading ? "opacity-0" : "opacity-100"
          }`}
        />
      )}

      {/* Zoom Control Toggle Button */}
      {!isLoading && !hasError && resolvedUrl && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            openFullScreen();
          }}
          className="absolute bottom-4 right-4 z-30 p-2.5 rounded-full bg-black/70 backdrop-blur-md border border-white/20 text-white/80 hover:text-white transition-all cursor-pointer shadow-lg hover:scale-105"
          title="Open Fullscreen Viewer & Zoom"
        >
          <Maximize2 className="w-4 h-4" />
        </button>
      )}

      {/* 4. FULL-SCREEN LIGHTBOX VIEWER MODAL */}
      <AnimatePresence>
        {isFullScreen && resolvedUrl && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-2xl select-none overflow-hidden touch-none"
            onWheel={handleWheel}
            onClick={closeFullScreen}
          >
            {/* Top Bar Controls */}
            <div
              className="absolute top-4 left-4 right-4 z-[110] flex items-center justify-between pointer-events-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Image Title Badge */}
              <div className="px-4 py-2 rounded-full bg-black/60 backdrop-blur-md border border-white/15 text-xs font-semibold text-white/90 shadow-xl max-w-xs sm:max-w-md truncate">
                {alt}
              </div>

              {/* Zoom & Close Toolbar */}
              <div className="flex items-center gap-2 bg-black/60 backdrop-blur-md border border-white/15 rounded-full p-1.5 shadow-2xl">
                <button
                  type="button"
                  onClick={handleZoomOut}
                  className="p-2 rounded-full hover:bg-white/15 text-white/80 hover:text-white transition-colors cursor-pointer"
                  title="Zoom Out (-)"
                >
                  <Minus className="w-4 h-4" />
                </button>

                <span className="px-2 font-mono text-xs font-bold text-aurora-cyan min-w-[50px] text-center">
                  {Math.round(fsScale * 100)}%
                </span>

                <button
                  type="button"
                  onClick={handleZoomIn}
                  className="p-2 rounded-full hover:bg-white/15 text-white/80 hover:text-white transition-colors cursor-pointer"
                  title="Zoom In (+)"
                >
                  <Plus className="w-4 h-4" />
                </button>

                {fsScale !== 1 && (
                  <button
                    type="button"
                    onClick={handleResetZoom}
                    className="p-2 rounded-full hover:bg-white/15 text-white/80 hover:text-white transition-colors cursor-pointer"
                    title="Reset Zoom (100%)"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                )}

                <div className="w-[1px] h-5 bg-white/20 mx-1" />

                <button
                  type="button"
                  onClick={closeFullScreen}
                  className="p-2 rounded-full bg-rose-500/20 hover:bg-rose-500/40 text-rose-300 hover:text-white transition-colors cursor-pointer"
                  title="Close Viewer (ESC)"
                >
                  <X className="w-4.5 h-4.5" />
                </button>
              </div>
            </div>

            {/* Main Interactive Zoomable & Pannable Image Canvas */}
            <div
              className="relative w-full h-full flex items-center justify-center p-4 sm:p-8 overflow-hidden cursor-default"
              onClick={closeFullScreen}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
            >
              <div
                className="relative flex items-center justify-center max-w-full max-h-full transition-transform duration-100 ease-out"
                style={{
                  transform: `translate3d(${fsPan.x}px, ${fsPan.y}px, 0px) scale(${fsScale})`,
                  cursor: fsScale > 1 ? (isDragging ? "grabbing" : "grab") : "zoom-in",
                }}
                onClick={(e) => e.stopPropagation()}
                onDoubleClick={handleDoubleClick}
              >
                <img
                  src={resolvedUrl}
                  alt={alt}
                  className="max-w-full max-h-[85vh] sm:max-h-[90vh] object-contain rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.8)] pointer-events-auto"
                />
              </div>
            </div>

            {/* Bottom Helper Hint */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-[110] pointer-events-none hidden sm:block">
              <p className="px-4 py-1.5 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-[11px] font-medium text-white/60 shadow-lg">
                Double-click or scroll to zoom • Drag to pan when zoomed • Press ESC or click outside to close
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
