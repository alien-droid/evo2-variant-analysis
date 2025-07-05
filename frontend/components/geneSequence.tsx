"use client";

import { GeneBounds, GeneDetails } from "@/lib/api/genome-api";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { useRef, useCallback, useMemo, useState, useEffect, JSX } from "react";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { getNucleotideColorClass } from "@/lib/utils";

const GeneSequence = ({
  geneBounds,
  geneDetails,
  startPos,
  endPos,
  onStartPosChange,
  onEndPosChange,
  sequence,
  range,
  maxRange,
  isLoading,
  error,
  onSequenceLoad,
  onSequenceClick,
}: {
  geneBounds: GeneBounds | null;
  geneDetails: GeneDetails | null;
  startPos: string;
  endPos: string;
  onStartPosChange: (start: string) => void;
  onEndPosChange: (end: string) => void;
  sequence: string;
  range: { start: number; end: number } | null;
  maxRange: number;
  isLoading: boolean;
  error: string | null;
  onSequenceLoad: () => void;
  onSequenceClick: (position: number, nucleotide: string) => void;
}) => {
  // calculate's current range
  const currentRange = useMemo(() => {
    const start = parseInt(startPos);
    const end = parseInt(endPos);
    return isNaN(start) || isNaN(end) || end < start ? 0 : end - start + 1;
  }, [startPos, endPos]);

  // sliding range handler
  const [sliderValues, setSliderValues] = useState({ start: 0, end: 100 });
  const [isDraggingStart, setIsDraggingStart] = useState(false);
  const [isDraggingEnd, setIsDraggingEnd] = useState(false);
  const [isDraggingRange, setIsDraggingRange] = useState(false);
  const sliderRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!geneBounds) return;
    const minBound = Math.min(geneBounds.max, geneBounds.min);
    const maxBound = Math.max(geneBounds.max, geneBounds.min);
    const geneSize = maxBound - minBound;
    const startNum = parseInt(startPos);
    const endNum = parseInt(endPos);

    if (isNaN(startNum) || isNaN(endNum) || geneSize <= 0) {
      setSliderValues({ start: 0, end: 100 });
      return;
    }

    const startPercent = ((startNum - minBound) / geneSize) * 100;
    const endPercent = ((endNum - minBound) / geneSize) * 100;

    setSliderValues({
      start: Math.max(0, Math.min(100, startPercent)),
      end: Math.max(0, Math.min(100, endPercent)),
    });
  }, [startPos, endPos, geneBounds]);

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

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingStart && !isDraggingEnd && !isDraggingRange) return;
      if (!sliderRef.current || !geneBounds) return;

      const sliderRect = sliderRef.current.getBoundingClientRect();
      const relativeX = e.clientX - sliderRect.left;
      const rangeWidth = sliderRect.width;

      let newPercent = (relativeX / rangeWidth) * 100;
      newPercent = Math.max(0, Math.min(100, newPercent));

      const minBound = Math.min(geneBounds.max, geneBounds.min);
      const maxBound = Math.max(geneBounds.max, geneBounds.min);

      const geneSize = maxBound - minBound;

      const newPos = Math.round(minBound + geneSize * (newPercent / 100));
      const currentPosStart = parseInt(startPos);
      const currentPosEnd = parseInt(endPos);

      if (isDraggingStart) {
        if (!isNaN(currentPosEnd)) {
          if (currentPosEnd - newPos + 1 > maxRange) {
            onStartPosChange((currentPosEnd - maxRange + 1).toString());
          } else if (newPos < currentPosEnd) {
            onStartPosChange(newPos.toString());
          }
        }
      } else if (isDraggingEnd) {
        if (!isNaN(currentPosStart)) {
          if (newPos - currentPosStart > maxRange) {
            onEndPosChange((currentPosStart + maxRange + 1).toString());
          } else if (newPos > currentPosStart) {
            onEndPosChange(newPos.toString());
          }
        }
      } else if (isDraggingRange) {
        if (!dragStartX.current) return;
        const pixelsPerBase = rangeWidth / geneSize;
        const dragDelta = relativeX - dragStartX.current.x;
        const dragDeltaBases = Math.round(dragDelta / pixelsPerBase);

        let newStart = dragStartX.current.startPos + dragDeltaBases;
        let newEnd = dragStartX.current.endPos + dragDeltaBases;
        const rangeSize =
          dragStartX.current.endPos - dragStartX.current.startPos;

        if (newStart < minBound) {
          newStart = minBound;
          newEnd = newStart + rangeSize;
        }
        if (newEnd > maxBound) {
          newEnd = maxBound;
          newStart = maxBound - rangeSize;
        }

        onStartPosChange(newStart.toString());
        onEndPosChange(newEnd.toString());
      }
    };

    const handleMouseUp = () => {
      if (
        (isDraggingStart || isDraggingEnd || isDraggingRange) &&
        startPos &&
        endPos
      ) {
        onSequenceLoad();
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
    startPos,
    endPos,
    maxRange,
    onStartPosChange,
    onEndPosChange,
    onSequenceLoad,
  ]);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent, handle: "start" | "end") => {
      e.preventDefault();
      if (handle === "start") setIsDraggingStart(true);
      else setIsDraggingEnd(true);
    },
    []
  );

  const handleRangeMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();

      if (!sliderRef.current) return;
      const startNum = parseInt(startPos);
      const endNum = parseInt(endPos);
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
    [endPos, startPos]
  );

  const formattedSequence = useMemo(() => {
    if (!sequence || !range) return null;

    const start = range.start;
    const BASES_PER_LINE = 150;

    const lines: JSX.Element[] = [];
    for (let i = 0; i < sequence.length; i += BASES_PER_LINE) {
      const startPos = start + i;
      const chunk = sequence.substring(i, i + BASES_PER_LINE);

      const colorizedChars: JSX.Element[] = [];
      for (let j = 0; j < chunk.length; j++) {
        const nucleotide = chunk[j] || "";
        const pos = startPos + j;
        const color = getNucleotideColorClass(nucleotide);

        colorizedChars.push(
          <span
            key={j}
            className={`${color} group relative cursor-pointer`}
            onClick={() => onSequenceClick(pos, nucleotide)}
            onMouseEnter={(e) => {
              setHoverPosition(pos);
              setMousePosition({ x: e.clientX, y: e.clientY });
            }}
            onMouseLeave={() => {
              setHoverPosition(null);
              setMousePosition(null);
            }}
          >
            {nucleotide}
          </span>
        );
      }
      lines.push(
        <div key={i} className="flex">
          <div className="text-right mr-2 w-20 text-gray-500 select-none">
            {startPos.toLocaleString()}
          </div>
          <div className="flex-1 tracking-wide">{colorizedChars}</div>
        </div>
      );
    }
    return lines;
  }, [sequence, range, onSequenceClick]);

  return (
    <Card className="gap-0 border-none bg-white py-0 shadow-sm">
      <CardHeader className="pt-4 pb-2">
        <CardTitle className="text-sm font-normal text-[#707b7c]/70">
          Gene Sequence
        </CardTitle>
      </CardHeader>
      <CardContent className="pb-4">
        {geneBounds && (
          <div className="mb-4 flex flex-col">
            <div className="mb-2 flex flex-col items-center justify-between text-xs sm:flex-row">
              <span className="flex items-center gap-1 text-[#707b7c]/70">
                <p className="sm:hidden">From: </p>
                <p>
                  {Math.min(geneBounds.max, geneBounds.min).toLocaleString()}
                </p>{" "}
              </span>
              <span className="text-[#707b7c]/70">
                Selected: {parseInt(startPos || "0").toLocaleString()} -{" "}
                {parseInt(endPos || "0").toLocaleString()} (
                {currentRange.toLocaleString()} bp)
              </span>
              <span className="flex items-center gap-1 text-[#707b7c]/70">
                <p className="sm:hidden">To: </p>
                <p>
                  {Math.max(geneBounds.max, geneBounds.min).toLocaleString()}
                </p>{" "}
              </span>
            </div>
            {/** Range Slider */}
            <div className="space-y-4">
              <div className="relative">
                <div
                  className="relative h-6 w-full cursor-pointer"
                  ref={sliderRef}
                >
                  {/* Track background*/}
                  <div className="absolute h-2 w-full top-1/2 rounded-full -translate-y-1/2 bg-gray-100"></div>
                  {/* Range Slider */}
                  <div
                    className="absolute h-2 top-1/2 -translate-y-1/2 cursor-grab rounded-full bg-[#3c4f3d] active:cursor-grabbing"
                    style={{
                      left: `${sliderValues.start}%`,
                      width: `${sliderValues.end - sliderValues.start}%`,
                    }}
                    onMouseDown={handleRangeMouseDown}
                  ></div>
                  {/* Range Slider Handle (Start) */}
                  <div
                    className="absolute top-1/2 flex h-6 w-6 -translate-x-1/2 -translate-y-1/2 cursor-grab items-center justify-center rounded-full border-2 border-[#3d4f3d] bg-white shadow active:cursor-grabbing"
                    style={{
                      left: `${sliderValues.start}%`,
                    }}
                    onMouseDown={(e) => handleMouseDown(e, "start")}
                  >
                    <div className="h-3 w-1 rounded-full bg-[#3d4f3d]"></div>
                  </div>
                  {/* Range Slider Handle (End) */}
                  <div
                    className="absolute top-1/2 flex h-6 w-6 -translate-x-1/2 -translate-y-1/2 cursor-grab items-center justify-center rounded-full border-2 border-[#3d4f3d] bg-white shadow active:cursor-grabbing"
                    style={{
                      left: `${sliderValues.end}%`,
                    }}
                    onMouseDown={(e) => handleMouseDown(e, "end")}
                  >
                    <div className="h-3 w-1 rounded-full bg-[#3d4f3d]"></div>
                  </div>
                </div>
              </div>
              {/* Position Controls: */}
              <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-[#707b7c]/70">Start</span>
                  <Input
                    value={startPos}
                    onChange={(e) => onStartPosChange(e.target.value)}
                    className="h-7 text-xs w-full sm:w-auto border-[#3d4f3d]"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                  />
                </div>
                <Button
                  size={"sm"}
                  disabled={isLoading}
                  onClick={onSequenceLoad}
                  className="h-7 w-full cursor-pointer bg-[#3c4f3d] text-xs text-white hover:bg-[#3b3b3b]/90 sm:w-auto"
                >
                  {!isLoading && isLoading ? "Loading ..." : "Load Sequence"}
                </Button>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-[#707b7c]/70">End</span>
                  <Input
                    value={endPos}
                    onChange={(e) => onEndPosChange(e.target.value)}
                    className="h-7 text-xs w-full sm:w-auto border-[#3d4f3d]"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                  />
                </div>
              </div>
            </div>
          </div>
        )}
        <div className="mb-2 flex items-center justify-between text-xs">
          <span className="text-[#3c4f3d]">
            {geneDetails?.genomicinfo?.[0].strand === "+"
              ? "Forward Strand (5' -> 3')"
              : geneDetails?.genomicinfo?.[0].strand === "-"
              ? "Reverse Strand (3' <- 5')"
              : "Strand information not available"}
          </span>
          <span className="text-[#3c4f3d]">
            Maxiumum window size: {maxRange.toLocaleString()} bp
          </span>
        </div>
        {error && (
          <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-600">
            {error}
          </div>
        )}

        <div className="w-full rounded-md bg-[#707b7c]/10 p-3">
          {isLoading ? (
            <div className="flex items-center justify-center py-8 ">
              <div className="h-5 w-5 animate-spin border-2 border-gray-300 rounded-full"></div>
            </div>
          ) : sequence ? (
            <div className="h-64 overflow-x-auto overflow-y-auto">
              <pre className="font-mono text-xs leading-relaxed">
                {formattedSequence}
              </pre>
            </div>
          ) : (
            <p className="text-center text-sm text-[#707b7c]/60">
              {error ? "Error: Loading sequence" : "No sequence available"}
            </p>
          )}
          {hoverPosition && mousePosition && (
            <div
              className="pointer-events-none fixed z-50 rounded bg-[#3c4f3d] px-2 py-1 text-xs text-white shadow-md"
              style={{
                top: mousePosition.y - 30,
                left: mousePosition.x,
                transform: "translateX(-50%)",
              }}
            >
              Position: {hoverPosition.toLocaleString()}
            </div>
          )}
          <div className="mt-3 flex items-center gap-3">
            <div className="flex items-center gap-1">
              <div className="h-3 w-3 rounded-full bg-red-500"></div>
              <span className="text-sm text-[#3c4f3d]/70">A</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="h-3 w-3 rounded-full bg-blue-500"></div>
              <span className="text-sm text-[#3c4f3d]/70">T</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="h-3 w-3 rounded-full bg-amber-500"></div>
              <span className="text-sm text-[#3c4f3d]/70">C</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="h-3 w-3 rounded-full bg-green-500"></div>
              <span className="text-sm text-[#3c4f3d]/70">G</span>
            </div>

          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default GeneSequence;
