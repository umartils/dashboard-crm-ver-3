"use client";

import { useRef, MouseEvent } from "react";
import { Blast_Conversion_Summary } from "@/lib/types";
import { ChevronLeft, ChevronRight } from "lucide-react";

function formatRupiah(value: number) {
  return `Rp${Math.round(value).toLocaleString("id-ID")}`;
}
 
export default function BlastConversionSummary({
  summary,
}: {
  summary: Blast_Conversion_Summary;
}) {
  const sliderRef = useRef<HTMLDivElement>(null);
  const dragState = useRef({ isDown: false, startX: 0, startScroll: 0 });

  // Tambah card baru cukup dengan menambah item di array ini
  const cards = [
    { label: "Total Prospek", value: summary.total_prospek.toLocaleString("id-ID") },
    { label: "Konversi", value: summary.total_konversi.toLocaleString("id-ID") },
    { label: "Conversion Rate", value: `${summary.conversion_rate}%` },
    { label: "Total Biaya Blast", value: formatRupiah(summary.total_biaya) },
    { label: "Donasi (bulan blast)", value: formatRupiah(summary.total_donasi) },
    { label: "ROAS", value: `${summary.roas}x` },
    { label: "Rasio Biaya (%)", value: `${summary.rasio_biaya}%` },
  ];

  function scrollSlider(dir: number) {
    sliderRef.current?.scrollBy({ left: dir * 220, behavior: "smooth" });
  }

  function onMouseDown(e: MouseEvent) {
    dragState.current = {
      isDown: true,
      startX: e.pageX,
      startScroll: sliderRef.current?.scrollLeft || 0,
    };
    sliderRef.current?.classList.add("dragging");
  }

  function onMouseMove(e: MouseEvent) {
    if (!dragState.current.isDown || !sliderRef.current) return;
    const dx = e.pageX - dragState.current.startX;
    sliderRef.current.scrollLeft = dragState.current.startScroll - dx;
  }

  function endDrag() {
    dragState.current.isDown = false;
    sliderRef.current?.classList.remove("dragging");
  }

  return (
    <div className="summary-slider-wrap">
      <button
        className="summary-slider-arrow left"
        onClick={() => scrollSlider(-1)}
        aria-label="Sebelumnya"
      >
        <ChevronLeft size={18} />
      </button>

      <div
        className="summary-slider"
        ref={sliderRef}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={endDrag}
        onMouseLeave={endDrag}
      >
        {cards.map((c) => (
          <div className="wablast-summary-card" key={c.label}>
            <span className="summary-label">{c.label}</span>
            <span className="summary-value">{c.value}</span>
          </div>
        ))}
      </div>

      <button
        className="summary-slider-arrow right"
        onClick={() => scrollSlider(1)}
        aria-label="Berikutnya"
      >
        <ChevronRight size={18} />
      </button>
    </div>
  );
}