"use client";

import Link from "next/link";
import CommanderStack from "@/components/CommanderStack";
import { PointerEvent as ReactPointerEvent, ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";

export type WorkshopMapItem = {
  id: string;
  set: string;
  name: string;
  images: { name: string; image: string }[];
  details: ReactNode;
};

type Point = { x: number; y: number };
type Camera = Point & { zoom: number };
const MIN_ZOOM = 0.12;
const MAX_ZOOM = 1.6;
const DETAIL_ZOOM = 0.75;

export default function WorkshopMap({ items }: { items: WorkshopMapItem[] }) {
  const viewport = useRef<HTMLDivElement>(null);
  const [camera, setCamera] = useState<Camera>({ x: 40, y: 40, zoom: 1 });
  const [offsets, setOffsets] = useState<Record<string, Point>>({});
  const [dragging, setDragging] = useState(false);
  const [frontDeck, setFrontDeck] = useState<string | null>(null);
  const drag = useRef<{ pointerId: number; start: Point; camera: Camera; id?: string; offset: Point; moved: boolean } | null>(null);
  const suppressClick = useRef(false);

  const layout = useMemo(() => {
    const groups = new Map<string, WorkshopMapItem[]>();
    for (const item of items) groups.set(item.set, [...(groups.get(item.set) || []), item]);
    const clusters = [...groups.entries()].sort(([a], [b]) => a.localeCompare(b));
    const goldenAngle = Math.PI * (3 - Math.sqrt(5));
    const placed: { x: number; y: number; width: number; height: number }[] = [];
    return clusters.map(([set, entries], groupIndex) => {
      const local: { item: WorkshopMapItem; x: number; y: number }[] = [];
      entries.forEach((item, index) => {
        let step = index;
        let point: Point;
        do {
          const angle = step * goldenAngle + groupIndex * 0.7;
          point = { x: Math.cos(angle) * Math.sqrt(step) * 530, y: Math.sin(angle) * Math.sqrt(step) * 350 };
          step++;
        } while (local.some(other => Math.abs(other.x - point.x) < 740 && Math.abs(other.y - point.y) < 460));
        local.push({ item, ...point });
      });
      const minX = Math.min(...local.map(node => node.x));
      const minY = Math.min(...local.map(node => node.y));
      const width = Math.max(...local.map(node => node.x)) - minX + 780;
      const height = Math.max(...local.map(node => node.y)) - minY + 540;
      let step = groupIndex;
      let position: Point;
      do {
        const angle = step * goldenAngle;
        position = { x: Math.cos(angle) * Math.sqrt(step) * 750, y: Math.sin(angle) * Math.sqrt(step) * 600 };
        step++;
      } while (placed.some(other => position.x < other.x + other.width + 100 && position.x + width + 100 > other.x && position.y < other.y + other.height + 100 && position.y + height + 100 > other.y));
      placed.push({ ...position, width, height });
      return { set, ...position, width, height, nodes: local.map(node => ({ ...node, x: node.x - minX + position.x + 40, y: node.y - minY + position.y + 90 })) };
    });
  }, [items]);

  const fit = useCallback(() => {
    const element = viewport.current;
    if (!element || !layout.length) return;
    const minX = Math.min(...layout.map(group => group.x));
    const minY = Math.min(...layout.map(group => group.y));
    const width = Math.max(...layout.map(group => group.x + group.width)) - minX;
    const height = Math.max(...layout.map(group => group.y + group.height)) - minY;
    const zoom = Math.max(MIN_ZOOM, Math.min(1, (element.clientWidth - 80) / width, (element.clientHeight - 80) / height));
    setCamera({ zoom, x: (element.clientWidth - width * zoom) / 2 - minX * zoom, y: (element.clientHeight - height * zoom) / 2 - minY * zoom });
    setOffsets({});
  }, [layout]);

  useEffect(() => { fit(); }, [fit]);

  const zoomAt = useCallback((factor: number, point?: Point) => {
    const element = viewport.current;
    if (!element) return;
    const origin = point || { x: element.clientWidth / 2, y: element.clientHeight / 2 };
    setCamera(current => {
      const zoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, current.zoom * factor));
      const ratio = zoom / current.zoom;
      return { zoom, x: origin.x - (origin.x - current.x) * ratio, y: origin.y - (origin.y - current.y) * ratio };
    });
  }, []);

  useEffect(() => {
    const element = viewport.current;
    if (!element) return;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const rect = element.getBoundingClientRect();
      const delta = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? element.clientHeight : 1);
      zoomAt(Math.exp(-Math.max(-200, Math.min(200, delta)) * 0.002), { x: event.clientX - rect.left, y: event.clientY - rect.top });
    };
    element.addEventListener("wheel", onWheel, { passive: false });
    return () => element.removeEventListener("wheel", onWheel);
  }, [zoomAt]);

  function startDrag(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.button !== 0) return;
    const node = (event.target as HTMLElement).closest<HTMLElement>("[data-brew-id]");
    const id = node?.dataset.brewId;
    if (id) setFrontDeck(id);
    suppressClick.current = false;
    drag.current = { pointerId: event.pointerId, start: { x: event.clientX, y: event.clientY }, camera, id, offset: (id && offsets[id]) || { x: 0, y: 0 }, moved: false };
    // Capture on the original target, preserving ordinary link clicks when no drag happens.
    (event.target as HTMLElement).setPointerCapture(event.pointerId);
  }

  function moveDrag(event: ReactPointerEvent<HTMLDivElement>) {
    const current = drag.current;
    if (!current || current.pointerId !== event.pointerId) return;
    const dx = event.clientX - current.start.x;
    const dy = event.clientY - current.start.y;
    if (!current.moved && Math.hypot(dx, dy) < 5) return;
    current.moved = true;
    suppressClick.current = true;
    setDragging(true);
    if (current.id) {
      setOffsets(previous => ({ ...previous, [current.id!]: { x: current.offset.x + dx / current.camera.zoom, y: current.offset.y + dy / current.camera.zoom } }));
    } else {
      setCamera({ ...current.camera, x: current.camera.x + dx, y: current.camera.y + dy });
    }
  }

  return (
    <section className="mt-6 overflow-hidden rounded-2xl border border-teal-700 bg-teal-950 shadow-2xl" aria-label="Workshop commander map">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-teal-800 px-4 py-3">
        <p className="text-xs text-teal-200">Grouped by commander set · Scroll to zoom · Drag the map or a brew</p>
        <div className="flex items-center gap-2 text-sm">
          <button type="button" aria-label="Zoom out" onClick={() => zoomAt(1 / 1.25)} className="rounded bg-teal-800 px-3 py-1 hover:bg-teal-700">−</button>
          <span className="w-12 text-center tabular-nums text-teal-100">{Math.round(camera.zoom * 100)}%</span>
          <button type="button" aria-label="Zoom in" onClick={() => zoomAt(1.25)} className="rounded bg-teal-800 px-3 py-1 hover:bg-teal-700">+</button>
          <button type="button" onClick={fit} className="rounded bg-teal-800 px-3 py-1 hover:bg-teal-700">Reset & fit</button>
        </div>
      </div>
      <div ref={viewport} role="region" aria-label="Pan and zoom map. Use arrow keys to pan, plus and minus to zoom, and zero to reset." tabIndex={0}
        className={`relative h-[72vh] min-h-96 touch-none select-none overflow-hidden outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-cyan-300 ${dragging ? "cursor-grabbing" : "cursor-grab"}`}
        style={{ background: "radial-gradient(ellipse at 20% 30%, #123e4a80, transparent 65%), radial-gradient(ellipse at 80% 75%, #164b4240, transparent 60%), #032b2b" }}
        onPointerDown={startDrag} onPointerMove={moveDrag}
        onPointerUp={() => { drag.current = null; setDragging(false); }}
        onPointerCancel={() => { drag.current = null; suppressClick.current = false; setDragging(false); }}
        onClickCapture={event => { if (suppressClick.current) { event.preventDefault(); event.stopPropagation(); suppressClick.current = false; } }}
        onDragStart={event => event.preventDefault()}
        onKeyDown={event => {
          if (event.target !== event.currentTarget) return;
          if (["+", "=", "-", "0", "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) event.preventDefault();
          if (event.key === "+" || event.key === "=") zoomAt(1.25);
          if (event.key === "-") zoomAt(1 / 1.25);
          if (event.key === "0") fit();
          const direction = { ArrowLeft: [60, 0], ArrowRight: [-60, 0], ArrowUp: [0, 60], ArrowDown: [0, -60] }[event.key];
          if (direction) setCamera(current => ({ ...current, x: current.x + direction[0], y: current.y + direction[1] }));
        }}>
        <div className="absolute left-0 top-0 origin-top-left" style={{ transform: `translate(${camera.x}px, ${camera.y}px) scale(${camera.zoom})` }}>
          {layout.map(group => (
            <div key={group.set}>
              <div className="pointer-events-none absolute" style={{ left: group.x - 100, top: group.y - 100, width: group.width + 200, height: group.height + 200, background: "radial-gradient(ellipse, rgba(45, 145, 130, 0.16), rgba(65, 75, 140, 0.06) 45%, transparent 72%)" }} />
              <h2 className="pointer-events-none absolute text-xl font-medium tracking-[0.3em] text-teal-200/65" style={{ left: group.x + 40, top: group.y + 24 }}>{group.set}</h2>
              {group.nodes.map(({ item, x, y }) => (
                <div key={item.id} data-brew-id={item.id} className={`absolute isolate ${camera.zoom < DETAIL_ZOOM ? "pointer-events-none" : ""}`} style={{ left: x + (offsets[item.id]?.x || 0), top: y + (offsets[item.id]?.y || 0), width: camera.zoom >= DETAIL_ZOOM ? 700 : 288, zIndex: frontDeck === item.id ? 2 : 1 }}>
                  {camera.zoom >= DETAIL_ZOOM ? item.details : (
                    <Link href={`/decks/${item.id}`} aria-label={`Open ${item.name}`} title={item.name} className="inline-flex flex-col overflow-hidden rounded-xl shadow-2xl outline-none ring-teal-400 hover:ring-2 focus-visible:ring-2">
                      {item.images.length ? <div className="w-72"><CommanderStack images={item.images} /></div> : <div className="pointer-events-auto flex aspect-[5/7] w-72 items-center justify-center bg-teal-900 p-4 text-center text-teal-200">{item.name}</div>}
                    </Link>
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
        <p className="pointer-events-none absolute bottom-4 left-4 rounded-full bg-teal-950/90 px-3 py-1 text-xs text-teal-300">{camera.zoom < DETAIL_ZOOM ? "Zoom in for deck details" : "Zoom out for image-only view"}</p>
      </div>
    </section>
  );
}
