"use client";
import { useRef, useState } from "react";

export default function SlideToCheck({ onComplete }:{ onComplete: ()=>void }){
  const knobRef = useRef<HTMLDivElement|null>(null);
  const [dragX, setDragX] = useState(0);

  function start(e:React.PointerEvent){
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }
  function move(e:React.PointerEvent){
    const wrap = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
    const x = Math.min(Math.max(e.clientX - wrap.left - 24, 0), wrap.width - 56);
    setDragX(x);
  }
  function end(e:React.PointerEvent){
    const wrap = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
    if(dragX > wrap.width * 0.65){ onComplete(); }
    setDragX(0);
  }

  return (
    <div className="slide-wrap" onPointerDown={start} onPointerMove={move} onPointerUp={end}>
      <div className="slide-text">Slide to check out →</div>
      <div ref={knobRef} className="slide-knob" style={{transform:`translateX(${dragX}px)`}}>→</div>
    </div>
  );
}
