import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Eraser, Signature } from 'lucide-react';

interface SignaturePadProps {
  value?: string;
  onChange: (dataUrl: string) => void;
  hasError?: boolean;
}

const CANVAS_HEIGHT = 200;
const STROKE_COLOR = '#1e2b66';
const STROKE_WIDTH = 2.5;

const SignaturePad: React.FC<SignaturePadProps> = ({ value, onChange, hasError }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const lastPoint = useRef<{ x: number; y: number } | null>(null);
  // Última imagen dibujada: distingue cambios externos (cargar un registro) de los propios
  const contentRef = useRef<string>(value || '');
  const [hasContent, setHasContent] = useState<boolean>(Boolean(value));

  const applyStrokeStyle = (ctx: CanvasRenderingContext2D) => {
    ctx.lineWidth = STROKE_WIDTH;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = STROKE_COLOR;
  };

  // Ajusta el tamaño real del canvas al contenedor y vuelve a pintar la firma guardada
  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const width = container.clientWidth;
    if (width === 0) return;

    const ratio = window.devicePixelRatio || 1;
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(CANVAS_HEIGHT * ratio);

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.clearRect(0, 0, width, CANVAS_HEIGHT);
    applyStrokeStyle(ctx);

    if (contentRef.current) {
      const image = new Image();
      image.onload = () => {
        ctx.clearRect(0, 0, width, CANVAS_HEIGHT);
        ctx.drawImage(image, 0, 0, width, CANVAS_HEIGHT);
      };
      image.src = contentRef.current;
    }
  }, []);

  useEffect(() => {
    redraw();
    const container = containerRef.current;
    if (!container || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(() => redraw());
    observer.observe(container);
    return () => observer.disconnect();
  }, [redraw]);

  // Cambios de `value` que no provienen de este componente (p. ej. al cargar un registro)
  useEffect(() => {
    const next = value || '';
    if (next === contentRef.current) return;
    contentRef.current = next;
    setHasContent(Boolean(next));
    redraw();
  }, [value, redraw]);

  const pointerPosition = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  };

  const commit = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    contentRef.current = dataUrl;
    setHasContent(true);
    onChange(dataUrl);
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    event.preventDefault();
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;

    drawing.current = true;
    const point = pointerPosition(event);
    lastPoint.current = point;

    // Un toque sin desplazamiento debe dejar un punto visible
    applyStrokeStyle(ctx);
    ctx.beginPath();
    ctx.arc(point.x, point.y, STROKE_WIDTH / 2, 0, Math.PI * 2);
    ctx.fillStyle = STROKE_COLOR;
    ctx.fill();

    canvasRef.current?.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return;
    event.preventDefault();
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx || !lastPoint.current) return;

    const point = pointerPosition(event);
    ctx.beginPath();
    ctx.moveTo(lastPoint.current.x, lastPoint.current.y);
    ctx.lineTo(point.x, point.y);
    ctx.stroke();
    lastPoint.current = point;
  };

  const handlePointerEnd = () => {
    if (!drawing.current) return;
    drawing.current = false;
    lastPoint.current = null;
    commit();
  };

  const clear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const ratio = window.devicePixelRatio || 1;
      ctx.clearRect(0, 0, canvas.width / ratio, canvas.height / ratio);
    }
    contentRef.current = '';
    setHasContent(false);
    onChange('');
  };

  return (
    <div className="space-y-2">
      <div
        ref={containerRef}
        className={`relative overflow-hidden rounded-lg border bg-white ${
          hasError ? 'border-red-300 bg-red-50' : 'border-slate-200'
        }`}
        style={{ height: CANVAS_HEIGHT }}
      >
        <canvas
          ref={canvasRef}
          className="block w-full cursor-crosshair touch-none"
          style={{ height: CANVAS_HEIGHT }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerEnd}
          onPointerLeave={handlePointerEnd}
          onPointerCancel={handlePointerEnd}
        />
        {!hasContent && (
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-1 text-slate-300">
            <Signature className="h-7 w-7" />
            <span className="text-sm font-medium">Firma aquí</span>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-slate-500">Dibuja tu firma con el mouse o el dedo.</p>
        <button
          type="button"
          onClick={clear}
          disabled={!hasContent}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Eraser className="h-3.5 w-3.5" />
          Limpiar
        </button>
      </div>
    </div>
  );
};

export default SignaturePad;
