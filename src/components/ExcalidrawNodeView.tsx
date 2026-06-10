import { NodeViewWrapper } from "@tiptap/react";
import type { NodeViewProps } from "@tiptap/react";
import { useState, useCallback, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import "@excalidraw/excalidraw/index.css";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ExcalidrawAPI = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ExcalidrawMod = any;

let excalidrawMod: ExcalidrawMod | null = null;
let modLoadPromise: Promise<void> | null = null;

function useExcalidrawMod() {
  const [mod, setMod] = useState<ExcalidrawMod | null>(excalidrawMod);
  useEffect(() => {
    if (excalidrawMod) { setMod(excalidrawMod); return; }
    if (!modLoadPromise) {
      modLoadPromise = import("@excalidraw/excalidraw").then((m) => {
        excalidrawMod = m;
      });
    }
    void modLoadPromise.then(() => setMod(excalidrawMod));
  }, []);
  return mod;
}

interface ParsedData {
  elements: unknown[];
  appState: Record<string, unknown>;
  svgPreview?: string;
}

function parseSafe(data: string): ParsedData {
  try {
    return JSON.parse(data) as ParsedData;
  } catch {
    return { elements: [], appState: {} };
  }
}

export function ExcalidrawNodeView({ node, updateAttributes, selected }: NodeViewProps) {
  const [isOpen, setIsOpen] = useState(false);
  // Increment on each open to force a completely fresh Excalidraw mount
  const [openCount, setOpenCount] = useState(0);
  const mod = useExcalidrawMod();
  const apiRef = useRef<ExcalidrawAPI>(null);

  const parsed = parseSafe(node.attrs.data as string);

  const handleOpen = useCallback(() => {
    setOpenCount((c) => c + 1);
    setIsOpen(true);
  }, []);

  const handleChange = useCallback(
    (elements: readonly unknown[], appState: Record<string, unknown>) => {
      updateAttributes({ data: JSON.stringify({ elements, appState, svgPreview: parsed.svgPreview }) });
    },
    [updateAttributes, parsed.svgPreview],
  );

  // After modal opens, give Excalidraw 200ms to mount + measure container, then refresh
  useEffect(() => {
    if (!isOpen) return;
    const t = setTimeout(() => {
      try {
        apiRef.current?.refresh?.();
        apiRef.current?.scrollToContent?.();
      } catch {/* ignore */}
    }, 200);
    return () => clearTimeout(t);
  }, [isOpen, openCount]);

  const handleDone = useCallback(async () => {
    // Generate SVG preview before closing
    if (mod?.exportToSvg && parsed.elements.length > 0) {
      try {
        const svg = await mod.exportToSvg({
          elements: parsed.elements,
          appState: { ...parsed.appState, exportBackground: true, exportWithDarkMode: false },
          files: null,
        }) as SVGSVGElement;
        svg.setAttribute("width", "100%");
        svg.setAttribute("height", "100%");
        const svgPreview = svg.outerHTML;
        updateAttributes({
          data: JSON.stringify({ ...parsed, svgPreview }),
        });
      } catch {/* preview generation failed, skip */}
    }
    setIsOpen(false);
  }, [mod, parsed, updateAttributes]);

  const ExcalidrawComp = mod?.Excalidraw;

  const modal = isOpen
    ? createPortal(
        <div className="fixed inset-0 z-[9999] flex flex-col" style={{ background: "rgba(0,0,0,0.5)" }}>
          <div
            className="relative m-auto flex flex-col overflow-hidden rounded-2xl border border-border shadow-2xl"
            style={{ width: "95vw", height: "90vh", background: "#fff" }}
          >
            {/* Header */}
            <div
              className="flex shrink-0 items-center justify-between border-b px-4 py-2"
              style={{ borderColor: "#e5e7eb", background: "#f9fafb" }}
            >
              <span className="text-sm font-medium" style={{ color: "#374151" }}>Drawing</span>
              <button
                type="button"
                onClick={() => void handleDone()}
                style={{
                  padding: "4px 12px",
                  fontSize: "12px",
                  borderRadius: "6px",
                  border: "1px solid #d1d5db",
                  background: "#fff",
                  cursor: "pointer",
                  color: "#374151",
                }}
              >
                Done
              </button>
            </div>

            {/* Canvas area — explicit pixel dimensions so Excalidraw can measure correctly */}
            <div style={{ flex: 1, position: "relative", minHeight: 0 }}>
              {ExcalidrawComp ? (
                <ExcalidrawComp
                  key={openCount}
                  excalidrawAPI={(api: ExcalidrawAPI) => { apiRef.current = api; }}
                  initialData={{
                    elements: parsed.elements,
                    appState: {
                      viewBackgroundColor: "#ffffff",
                      theme: "light",
                    },
                    scrollToContent: true,
                  }}
                  onChange={handleChange}
                  theme="light"
                />
              ) : (
                <div style={{ display: "flex", height: "100%", alignItems: "center", justifyContent: "center", color: "#9ca3af", fontSize: "14px" }}>
                  Loading drawing canvas…
                </div>
              )}
            </div>
          </div>
        </div>,
        document.body,
      )
    : null;

  return (
    <NodeViewWrapper>
      {/* Inline preview block */}
      <div
        onClick={handleOpen}
        className={`relative my-4 cursor-pointer overflow-hidden rounded-xl border ${
          selected ? "border-accent" : "border-border"
        } bg-surface hover:bg-surface-hover`}
        style={{ minHeight: "80px" }}
      >
        {parsed.svgPreview && parsed.elements.length > 0 ? (
          /* SVG thumbnail */
          <div
            className="flex h-full min-h-[120px] items-center justify-center p-2"
            dangerouslySetInnerHTML={{ __html: parsed.svgPreview }}
            style={{ pointerEvents: "none", maxHeight: "200px", overflow: "hidden" }}
          />
        ) : (
          /* Placeholder */
          <div className="flex items-center justify-center gap-3 py-6">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
            </svg>
            <span className="text-sm text-text-muted">
              {parsed.elements.length > 0
                ? `Drawing · ${parsed.elements.length} element${parsed.elements.length === 1 ? "" : "s"} — click to edit`
                : "Click to open drawing canvas"}
            </span>
          </div>
        )}

        {/* Edit hint overlay */}
        <div className="absolute inset-0 flex items-end justify-end p-2 opacity-0 hover:opacity-100 transition-opacity">
          <span className="rounded bg-black/50 px-2 py-0.5 text-xs text-white">Edit</span>
        </div>
      </div>

      {modal}
    </NodeViewWrapper>
  );
}
