"use client";

/* oxlint-disable i18next/no-literal-string */

/**
 * PDF annotation layer — SVG overlay (knife-2 slice 1)
 *
 * Why SVG over canvas bitmap: coordinates ARE the data (normalized 0-1),
 * individual annotations are selectable/deletable, and DPR scaling stays
 * crisp. Strokes use vector-effect="non-scaling-stroke" so pen width is
 * zoom-independent.
 *
 * Redlines:
 * - All coordinates normalized 0-1 relative to the rendered page box.
 * - Text annotations render with notranslate (Chrome auto-translate kills
 *   React DOM tracking — known issue).
 * - Create = pointer gesture → payload; edit history is never rewritten
 *   (PATCH replaces payload server-side with a new updatedAt).
 */
import { useCallback, useRef, useState } from "react";

import type {
  AnnotationItem,
  AnnotationPayload,
  NormalizedPoint,
} from "./use-pdfs";

export type AnnotationTool = "none" | "pen" | "highlight" | "text";

interface AnnotationLayerProps {
  /** Annotations belonging to the currently rendered page. */
  annotations: AnnotationItem[];
  tool: AnnotationTool;
  /** Create handler — payload already normalized + validated by caller path. */
  onCreate: (payload: AnnotationPayload) => void;
  onDelete: (id: string) => void;
  disabled?: boolean;
}

const PEN_COLOR = "#f59e0b"; // amber-500
const HIGHLIGHT_COLOR = "#facc15"; // yellow-400
const TEXT_COLOR = "#38bdf8"; // sky-400

/** Convert a pointer event to normalized page coordinates (clamped 0-1). */
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

function toNormalized(
  e: { clientX: number; clientY: number },
  box: DOMRect,
): NormalizedPoint {
  return {
    x: clamp01((e.clientX - box.left) / box.width),
    y: clamp01((e.clientY - box.top) / box.height),
  };
}

function pointsToAttr(points: NormalizedPoint[]): string {
  return points.map((p) => `${p.x},${p.y}`).join(" ");
}

export function AnnotationLayer({
  annotations,
  tool,
  onCreate,
  onDelete,
  disabled,
}: AnnotationLayerProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [draftPen, setDraftPen] = useState<NormalizedPoint[] | null>(null);
  const [draftRect, setDraftRect] = useState<{
    start: NormalizedPoint;
    current: NormalizedPoint;
  } | null>(null);
  const [textDraft, setTextDraft] = useState<{
    anchor: NormalizedPoint;
    value: string;
  } | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const boxOf = () => svgRef.current?.getBoundingClientRect() ?? null;

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      if (disabled || tool === "none") return;
      const box = boxOf();
      if (!box) return;
      const p = toNormalized(e, box);
      if (tool === "pen") {
        setDraftPen([p]);
        e.currentTarget.setPointerCapture(e.pointerId);
      } else if (tool === "highlight") {
        setDraftRect({ start: p, current: p });
        e.currentTarget.setPointerCapture(e.pointerId);
      } else if (tool === "text") {
        setTextDraft({ anchor: p, value: "" });
      }
    },
    [disabled, tool],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      const box = boxOf();
      if (!box) return;
      const p = toNormalized(e, box);
      if (draftPen) {
        setDraftPen((prev) => (prev ? [...prev, p] : null));
      } else if (draftRect) {
        setDraftRect({ start: draftRect.start, current: p });
      }
    },
    [draftPen, draftRect],
  );

  const handlePointerUp = useCallback(() => {
    if (draftPen && draftPen.length >= 2) {
      onCreate({ kind: "pen", paths: [draftPen], color: PEN_COLOR });
    }
    setDraftPen(null);

    if (draftRect) {
      const { start, current } = draftRect;
      const rect = {
        x: Math.min(start.x, current.x),
        y: Math.min(start.y, current.y),
        width: Math.abs(current.x - start.x),
        height: Math.abs(current.y - start.y),
      };
      // Ignore accidental taps (tiny rects).
      if (rect.width > 0.005 && rect.height > 0.005) {
        onCreate({ kind: "highlight", rects: [rect], color: HIGHLIGHT_COLOR });
      }
    }
    setDraftRect(null);
  }, [draftPen, draftRect, onCreate]);

  const commitText = useCallback(() => {
    if (textDraft && textDraft.value.trim().length > 0) {
      onCreate({
        kind: "text",
        anchor: textDraft.anchor,
        text: textDraft.value.trim(),
        color: TEXT_COLOR,
      });
    }
    setTextDraft(null);
  }, [textDraft, onCreate]);

  const interactive = !disabled && tool !== "none";

  return (
    <div className="absolute inset-0">
      <svg
        ref={svgRef}
        className={`h-full w-full ${
          interactive ? "touch-none select-none" : "pointer-events-none"
        }`}
        style={{ cursor: tool === "none" ? undefined : "crosshair" }}
        viewBox="0 0 1 1"
        preserveAspectRatio="none"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        {annotations.map((a) => (
          <g
            key={a.id}
            className="pointer-events-auto cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              setSelectedId(a.id === selectedId ? null : a.id);
            }}
            onDoubleClick={() => onDelete(a.id)}
          >
            {a.payload.kind === "highlight" &&
              a.payload.rects.map((r, i) => (
                <rect
                  key={i}
                  x={r.x}
                  y={r.y}
                  width={r.width}
                  height={r.height}
                  fill={a.payload.color ?? HIGHLIGHT_COLOR}
                  opacity={selectedId === a.id ? 0.6 : 0.35}
                  stroke={selectedId === a.id ? "#fff" : "none"}
                  strokeWidth={0.002}
                />
              ))}
            {a.payload.kind === "pen" &&
              a.payload.paths.map((path, i) => (
                <polyline
                  key={i}
                  points={pointsToAttr(path)}
                  fill="none"
                  stroke={a.payload.color ?? PEN_COLOR}
                  strokeWidth={selectedId === a.id ? 4 : 2.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  vectorEffect="non-scaling-stroke"
                  opacity={0.9}
                />
              ))}
            {a.payload.kind === "text" && (
              <g
                transform={`translate(${a.payload.anchor.x}, ${a.payload.anchor.y})`}
              >
                <circle
                  r={0.006}
                  fill={a.payload.color ?? TEXT_COLOR}
                  opacity={0.9}
                />
              </g>
            )}
          </g>
        ))}

        {/* In-progress pen stroke */}
        {draftPen && draftPen.length >= 2 && (
          <polyline
            points={pointsToAttr(draftPen)}
            fill="none"
            stroke={PEN_COLOR}
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
            opacity={0.7}
          />
        )}

        {/* In-progress highlight rect */}
        {draftRect && (
          <rect
            x={Math.min(draftRect.start.x, draftRect.current.x)}
            y={Math.min(draftRect.start.y, draftRect.current.y)}
            width={Math.abs(draftRect.current.x - draftRect.start.x)}
            height={Math.abs(draftRect.current.y - draftRect.start.y)}
            fill={HIGHLIGHT_COLOR}
            opacity={0.25}
          />
        )}
      </svg>

      {/* Text annotations rendered as HTML (crisp at any zoom) */}
      {annotations
        .filter((a) => a.payload.kind === "text")
        .map((a) => {
          const payload = a.payload as Extract<
            AnnotationPayload,
            { kind: "text" }
          >;
          return (
            <div
              key={`label-${a.id}`}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  setSelectedId(a.id === selectedId ? null : a.id);
                }
                if (e.key === "Delete" || e.key === "Backspace") {
                  onDelete(a.id);
                }
              }}
              className={`notranslate pointer-events-auto absolute max-w-[40%] cursor-pointer rounded px-1.5 py-0.5 text-xs ${
                selectedId === a.id
                  ? "bg-sky-500/90 text-white"
                  : "bg-sky-500/20 text-sky-700 dark:text-sky-300"
              }`}
              style={{
                left: `${payload.anchor.x * 100}%`,
                top: `${payload.anchor.y * 100}%`,
                transform: "translate(6px, -50%)",
              }}
              translate="no"
              onClick={() => setSelectedId(a.id === selectedId ? null : a.id)}
              onDoubleClick={() => onDelete(a.id)}
            >
              {payload.text}
            </div>
          );
        })}

      {/* Text input draft */}
      {textDraft && (
        <input
          // eslint-disable-next-line jsx-a11y/no-autofocus -- intentional: user just tapped to place a note
          autoFocus
          className="notranslate bg-background absolute z-10 rounded border px-2 py-1 text-sm shadow-lg"
          style={{
            left: `${textDraft.anchor.x * 100}%`,
            top: `${textDraft.anchor.y * 100}%`,
          }}
          translate="no"
          placeholder="批注…"
          value={textDraft.value}
          onChange={(e) =>
            setTextDraft({ ...textDraft, value: e.target.value })
          }
          onBlur={commitText}
          onKeyDown={(e) => {
            if (e.key === "Enter") commitText();
            if (e.key === "Escape") setTextDraft(null);
          }}
        />
      )}

      {/* Selected annotation actions */}
      {selectedId && (
        <div className="absolute top-2 right-2 z-10 flex gap-1">
          <button
            type="button"
            className="bg-destructive text-destructive-foreground rounded px-2 py-1 text-xs shadow"
            onClick={() => {
              onDelete(selectedId);
              setSelectedId(null);
            }}
          >
            删除标注
          </button>
        </div>
      )}
    </div>
  );
}
