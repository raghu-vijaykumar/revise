import React from 'react';

type Props = {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (next: number) => void;
};

export function SplitHandle({ label, value, min, max, onChange }: Props) {
  const start = React.useRef<{ x: number; width: number } | null>(null);
  const clamp = React.useCallback((next: number) => Math.max(min, Math.min(max, next)), [min, max]);

  React.useEffect(() => {
    function move(event: PointerEvent) {
      if (start.current) onChange(clamp(start.current.width + event.clientX - start.current.x));
    }
    function stop() {
      start.current = null;
    }
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', stop);
    return () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', stop);
    };
  }, [clamp, onChange]);

  return (
    <div
      className="split-handle"
      role="separator"
      aria-label={label}
      aria-orientation="vertical"
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuenow={value}
      tabIndex={0}
      onPointerDown={(event) => {
        start.current = { x: event.clientX, width: value };
        event.currentTarget.setPointerCapture(event.pointerId);
      }}
      onKeyDown={(event) => {
        if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
          event.preventDefault();
          onChange(clamp(value + (event.key === 'ArrowRight' ? 16 : -16)));
        }
      }}
    />
  );
}
