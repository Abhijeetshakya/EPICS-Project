"use client";

import type { GeneBounds, GeneDetailsFromSearch } from "~/utils/genome-api";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import {
  startTransition,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type JSX,
} from "react";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { getNucleotideColorClass } from "~/utils/coloring-utils";
import { Fingerprint } from "lucide-react";

export function GeneSequence({
  geneBounds,
  geneDetail,
  startPosition,
  endPosition,
  onStartPositionChange,
  onEndPositionChange,
  sequenceData,
  sequenceRange,
  isLoading,
  error,
  onSequenceLoadRequest,
  onSequenceClick,
  maxViewRange,
}: {
  geneBounds: GeneBounds | null;
  geneDetail: GeneDetailsFromSearch | null;
  startPosition: string;
  endPosition: string;
  onStartPositionChange: (value: string) => void;
  onEndPositionChange: (value: string) => void;
  sequenceData: string;
  sequenceRange: { start: number; end: number } | null;
  isLoading: boolean;
  error: string | null;
  onSequenceLoadRequest: () => void;
  onSequenceClick: (position: number, nucleotide: string) => void;
  maxViewRange: number;
}) {
  const [sliderValues, setSliderValues] = useState({ start: 60, end: 70 });
  const [isDraggingStart, setIsDraggingStart] = useState(false);
  const [isDraggingEnd, setIsDraggingEnd] = useState(false);
  const [isDraggingRange, setIsDraggingRange] = useState(false);
  const sliderRef = useRef<HTMLDivElement>(null);
  const dragStartX = useRef<{
    x: number;
    startPos: number;
    endPos: number;
  } | null>(null);
  const [hoverPosition, setHoverPosition] = useState<number | null>(null);
  const [mousePosition, setMousePosition] = useState<{
    x: number;
    y: number;
  } | null>(null);

  const currentRangeSize = useMemo(() => {
    const start = parseInt(startPosition);
    const end = parseInt(endPosition);
    return isNaN(start) || isNaN(end) || end < start ? 0 : end - start + 1;
  }, [startPosition, endPosition]);

  useEffect(() => {
    if (!geneBounds) return;

    const minBound = Math.min(geneBounds.min, geneBounds.max);
    const maxBound = Math.max(geneBounds.min, geneBounds.max);
    const totalSize = maxBound - minBound;

    const startNum = parseInt(startPosition);
    const endNum = parseInt(endPosition);

    if (isNaN(startNum) || isNaN(endNum) || totalSize <= 0) {
      setSliderValues({ start: 0, end: 100 });
      return;
    }

    const startPercent = ((startNum - minBound) / totalSize) * 100;
    const endPercent = ((endNum - minBound) / totalSize) * 100;

    setSliderValues({
      start: Math.max(0, Math.min(startPercent, 100)),
      end: Math.max(0, Math.min(endPercent, 100)),
    });
  }, [startPosition, endPosition, geneBounds]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingStart && !isDraggingEnd && !isDraggingRange) return;
      if (!sliderRef.current || !geneBounds) return;

      const sliderRect = sliderRef.current.getBoundingClientRect();
      const relativeX = e.clientX - sliderRect.left;
      const sliderWidth = sliderRect.width;
      let newPercent = (relativeX / sliderWidth) * 100;
      newPercent = Math.max(0, Math.min(newPercent, 100));

      const minBound = Math.min(geneBounds.min, geneBounds.max);
      const maxBound = Math.max(geneBounds.min, geneBounds.max);
      const geneSize = maxBound - minBound;

      const newPosition = Math.round(minBound + (geneSize * newPercent) / 100);
      const currentStartNum = parseInt(startPosition);
      const currentEndNum = parseInt(endPosition);

      if (isDraggingStart) {
        if (!isNaN(currentEndNum)) {
          if (currentEndNum - newPosition + 1 > maxViewRange) {
            onStartPositionChange(String(currentEndNum - maxViewRange + 1));
          } else if (newPosition < currentEndNum) {
            onStartPositionChange(String(newPosition));
          }
        }
      } else if (isDraggingEnd) {
        if (!isNaN(currentStartNum)) {
          if (newPosition - currentStartNum + 1 > maxViewRange) {
            onEndPositionChange(String(currentStartNum + maxViewRange - 1));
          } else if (newPosition > currentStartNum) {
            onEndPositionChange(String(newPosition));
          }
        }
      } else if (isDraggingRange) {
        if (!dragStartX.current) return;
        const pixelsPerBase = sliderWidth / geneSize;
        const dragDeltaPixels = relativeX - dragStartX.current.x;
        const dragDeltaBases = Math.round(dragDeltaPixels / pixelsPerBase);

        let newStart = dragStartX.current.startPos + dragDeltaBases;
        let newEnd = dragStartX.current.endPos + dragDeltaBases;
        const rangeSize =
          dragStartX.current.endPos - dragStartX.current.startPos;

        if (newStart < minBound) {
          newStart = minBound;
          newEnd = minBound + rangeSize;
        }
        if (newEnd > maxBound) {
          newEnd = maxBound;
          newStart = maxBound - rangeSize;
        }

        onStartPositionChange(String(newStart));
        onEndPositionChange(String(newEnd));
      }
    };

    const handleMouseUp = () => {
      if (
        (isDraggingStart || isDraggingEnd || isDraggingRange) &&
        startPosition &&
        endPosition
      ) {
        onSequenceLoadRequest();
      }
      setIsDraggingStart(false);
      setIsDraggingEnd(false);
      setIsDraggingRange(false);
      dragStartX.current = null;
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [
    isDraggingStart,
    isDraggingEnd,
    isDraggingRange,
    geneBounds,
    startPosition,
    endPosition,
    onStartPositionChange,
    onEndPositionChange,
    maxViewRange,
    onSequenceLoadRequest,
  ]);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent, handle: "start" | "end") => {
      e.preventDefault();
      if (handle === "start") setIsDraggingStart(true);
      else setIsDraggingEnd(true);
    },
    [],
  );

  const handleRangeMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();

      if (!sliderRef.current) return;

      const startNum = parseInt(startPosition);
      const endNum = parseInt(endPosition);
      if (isNaN(startNum) || isNaN(endNum)) return;

      setIsDraggingRange(true);
      const sliderRect = sliderRef.current.getBoundingClientRect();
      const relativeX = e.clientX - sliderRect.left;
      dragStartX.current = {
        x: relativeX,
        startPos: startNum,
        endPos: endNum,
      };
    },
    [startPosition, endPosition],
  );

  const formattedSequence = useMemo(() => {
    if (!sequenceData || !sequenceRange) return null;

    const start = sequenceRange.start;
    const BASES_PER_LINE = 200;
    const lines: JSX.Element[] = [];

    for (let i = 0; i < sequenceData.length; i += BASES_PER_LINE) {
      const lineStartPos = start + i;
      const chunk = sequenceData.substring(i, i + BASES_PER_LINE);
      const colorizedChars: JSX.Element[] = [];

      for (let j = 0; j < chunk.length; j++) {
        const nucleotide = chunk[j] || "";
        const nucleotidePosition = lineStartPos + j;
        const color = getNucleotideColorClass(nucleotide);
        colorizedChars.push(
          <span
            key={j}
            onClick={() => onSequenceClick(nucleotidePosition, nucleotide)}
            onMouseEnter={(e) => {
              setHoverPosition(nucleotidePosition);
              setMousePosition({ x: e.clientX, y: e.clientY });
            }}
            onMouseLeave={() => {
              setHoverPosition(null);
              setMousePosition(null);
            }}
            className={`${color} group relative cursor-pointer hover:bg-slate-700/50 hover:px-0.5 -mx-0.5 rounded transition-colors`}
          >
            {nucleotide}
          </span>,
        );
      }

      lines.push(
        <div key={i} className="flex">
          <div className="mr-4 w-24 text-right text-slate-500/70 select-none">
            {lineStartPos.toLocaleString()}
          </div>
          <div className="flex-1 tracking-widest">{colorizedChars}</div>
        </div>,
      );
    }

    return lines;
  }, [sequenceData, sequenceRange, onSequenceClick]);

  return (
    <div className="glass-card rounded-2xl">
      <div className="p-6 pb-3">
        <div className="flex items-center gap-2">
          <Fingerprint className="h-4 w-4 text-teal-400" />
          <h3 className="text-sm font-medium text-slate-300">Gene Sequence</h3>
        </div>
      </div>

      <div className="px-6 pb-6">
        {geneBounds && (
          <div className="mb-6 flex flex-col rounded-xl bg-slate-800/40 border border-slate-700/20 p-5">
            <div className="mb-4 flex flex-col items-center justify-between text-xs sm:flex-row">
              <span className="flex items-center gap-1 text-slate-400 font-mono">
                <p className="sm:hidden text-slate-500">From: </p>
                {Math.min(geneBounds.min, geneBounds.max).toLocaleString()}
              </span>
              <span className="text-slate-300 font-medium bg-slate-800/80 px-3 py-1 rounded-full border border-slate-700/50">
                Selected: {parseInt(startPosition || "0").toLocaleString()} –{" "}
                {parseInt(endPosition || "0").toLocaleString()} (
                <span className="text-teal-400">{currentRangeSize.toLocaleString()} bp</span>)
              </span>
              <span className="flex items-center gap-1 text-slate-400 font-mono">
                <p className="sm:hidden text-slate-500">To: </p>
                {Math.max(geneBounds.min, geneBounds.max).toLocaleString()}
              </span>
            </div>

            {/* Slider component */}
            <div className="space-y-6">
              <div className="relative pt-2 pb-2">
                <div
                  ref={sliderRef}
                  className="relative h-6 w-full cursor-pointer"
                >
                  {/* Track background */}
                  <div className="absolute top-1/2 h-2.5 w-full -translate-y-1/2 rounded-full bg-slate-800 border border-slate-700/50"></div>

                  {/* Selected range */}
                  <div
                    className="absolute top-1/2 h-2.5 -translate-y-1/2 cursor-grab rounded-full bg-teal-500/80 active:cursor-grabbing shadow-[0_0_10px_rgba(45,212,191,0.3)]"
                    style={{
                      left: `${sliderValues.start}%`,
                      width: `${sliderValues.end - sliderValues.start}%`,
                    }}
                    onMouseDown={handleRangeMouseDown}
                  ></div>

                  {/* Start handle */}
                  <div
                    className="absolute top-1/2 flex h-5 w-5 -translate-x-1/2 -translate-y-1/2 cursor-grab items-center justify-center rounded-full border-2 border-teal-400 bg-slate-900 shadow-[0_0_8px_rgba(45,212,191,0.5)] active:cursor-grabbing hover:scale-110 transition-transform"
                    style={{ left: `${sliderValues.start}%` }}
                    onMouseDown={(e) => handleMouseDown(e, "start")}
                  />

                  {/* End handle */}
                  <div
                    className="absolute top-1/2 flex h-5 w-5 -translate-x-1/2 -translate-y-1/2 cursor-grab items-center justify-center rounded-full border-2 border-teal-400 bg-slate-900 shadow-[0_0_8px_rgba(45,212,191,0.5)] active:cursor-grabbing hover:scale-110 transition-transform"
                    style={{ left: `${sliderValues.end}%` }}
                    onMouseDown={(e) => handleMouseDown(e, "end")}
                  />
                </div>
              </div>

              {/* Position controls */}
              <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500 uppercase tracking-widest">Start</span>
                  <Input
                    value={startPosition}
                    onChange={(e) => onStartPositionChange(e.target.value)}
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    className="h-8 w-full border-slate-700/50 bg-slate-900/50 text-xs text-slate-300 font-mono sm:w-28 focus:border-teal-500/50"
                  />
                </div>
                <Button
                  size="sm"
                  disabled={isLoading}
                  onClick={onSequenceLoadRequest}
                  className="h-8 w-full cursor-pointer bg-slate-700/80 text-xs text-slate-200 hover:bg-slate-700 sm:w-auto border border-slate-600/50"
                >
                  {isLoading ? (
                    <><span className="mr-2 inline-block h-3 w-3 animate-spin rounded-full border-2 border-slate-400/30 border-t-slate-200" />Loading...</>
                  ) : "Load sequence"}
                </Button>
                <div className="flex items-center gap-2 flex-row-reverse sm:flex-row">
                  <span className="text-xs text-slate-500 uppercase tracking-widest sm:order-first">End</span>
                  <Input
                    value={endPosition}
                    onChange={(e) => onEndPositionChange(e.target.value)}
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    className="h-8 w-full border-slate-700/50 bg-slate-900/50 text-xs text-slate-300 font-mono sm:w-28 focus:border-teal-500/50"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Legend & Limits */}
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <div className="h-2 w-2 rounded-full bg-red-400"></div>
              <span className="text-[10px] text-slate-400 font-mono">A</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="h-2 w-2 rounded-full bg-sky-400"></div>
              <span className="text-[10px] text-slate-400 font-mono">T</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="h-2 w-2 rounded-full bg-emerald-400"></div>
              <span className="text-[10px] text-slate-400 font-mono">G</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="h-2 w-2 rounded-full bg-amber-400"></div>
              <span className="text-[10px] text-slate-400 font-mono">C</span>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <span className="text-[10px] text-slate-500 uppercase tracking-wider">
              {geneDetail?.genomicinfo?.[0]?.strand === "+"
                ? "Forward strand (5' → 3')"
                : geneDetail?.genomicinfo?.[0]?.strand === "-"
                  ? "Reverse strand (3' ← 5')"
                  : "Strand unavailable"}
            </span>
            <span className="text-[10px] text-slate-500 border-l border-slate-700 pl-4 hidden sm:inline-block">
              Max window: {maxViewRange.toLocaleString()} bp
            </span>
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded-lg bg-red-500/10 border border-red-500/20 p-3 text-xs text-red-400">
            {error}
          </div>
        )}

        <div className="w-full rounded-xl bg-[#0b0f1a] border border-slate-700/50 p-4 shadow-inner relative overflow-hidden group">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <div className="flex flex-col items-center gap-3">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-700 border-t-teal-500"></div>
                <span className="text-xs text-slate-500">Fetching sequence...</span>
              </div>
            </div>
          ) : sequenceData ? (
            <div className="h-80 overflow-x-auto overflow-y-auto custom-scrollbar pr-2">
              <pre className="font-mono text-xs leading-loose text-slate-400 antialiased">
                {formattedSequence}
              </pre>
            </div>
          ) : (
            <div className="flex items-center justify-center py-16">
              <p className="text-sm text-slate-600">
                {error ? "Error loading sequence" : "Select a range to view sequence data."}
              </p>
            </div>
          )}
          
          {/* Subtle gradient overlay to indicate scrollable content */}
          {sequenceData && !isLoading && (
            <div className="absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-[#0b0f1a] to-transparent pointer-events-none opacity-50 group-hover:opacity-0 transition-opacity"></div>
          )}
        </div>

        {/* Floating tooltip for position */}
        {hoverPosition !== null && mousePosition !== null && (
          <div
            className="pointer-events-none fixed z-50 rounded bg-slate-800 border border-slate-700/80 px-2.5 py-1.5 text-xs text-slate-200 shadow-xl backdrop-blur-sm"
            style={{
              top: mousePosition.y - 40,
              left: mousePosition.x,
              transform: "translateX(-50%)",
            }}
          >
            <span className="text-slate-500 mr-1.5">Pos:</span>
            <span className="font-mono text-teal-300">{hoverPosition.toLocaleString()}</span>
          </div>
        )}
      </div>
    </div>
  );
}
