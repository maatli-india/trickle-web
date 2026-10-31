"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { USE_CASE_SLIDES } from "@/lib/use-case-slides";

const AUTOPLAY_MS = 5500;

export function UseCaseCarousel() {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const touchStartX = useRef<number | null>(null);

  const total = USE_CASE_SLIDES.length;
  const goTo = (next: number) => setIndex(((next % total) + total) % total);

  useEffect(() => {
    if (paused) return;
    if (typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setInterval(() => setIndex((current) => (current + 1) % total), AUTOPLAY_MS);
    return () => window.clearInterval(timer);
  }, [paused, total]);

  const onTouchStart = (event: React.TouchEvent) => {
    touchStartX.current = event.touches[0]?.clientX ?? null;
  };
  const onTouchEnd = (event: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const delta = event.changedTouches[0]?.clientX - touchStartX.current;
    if (Math.abs(delta) > 40) goTo(index + (delta < 0 ? 1 : -1));
    touchStartX.current = null;
  };

  return (
    <section
      aria-roledescription="carousel"
      aria-label="How people use Trickle"
      className="relative overflow-hidden rounded-3xl border border-[#ded8ce] bg-white"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <div
        className="flex transition-transform duration-700 ease-out"
        style={{ transform: `translateX(-${index * 100}%)` }}
      >
        {USE_CASE_SLIDES.map((slide, slideIndex) => {
          const Icon = slide.icon;
          return (
            <div
              key={slide.title}
              className="grid w-full shrink-0 grid-cols-1 items-center gap-6 p-8 sm:gap-10 sm:p-10 lg:grid-cols-[1.1fr_0.9fr] lg:p-14"
              aria-hidden={slideIndex !== index}
            >
              <div className={slideIndex === index ? "" : "pointer-events-none"}>
                <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#e85b43]">{slide.eyebrow}</p>
                <h2 className="mt-3 max-w-xl text-2xl font-semibold leading-tight tracking-[-0.03em] text-[#183b3a] sm:text-3xl">
                  {slide.title}
                </h2>
                <p className="mt-4 max-w-lg text-base leading-7 text-[#62645f]">{slide.description}</p>
              </div>
              <div
                className="relative flex h-40 items-center justify-center overflow-hidden rounded-2xl sm:h-52 lg:h-60"
                style={{ backgroundColor: slide.tint.bg }}
              >
                <span
                  className="absolute size-28 rounded-full opacity-40 sm:size-36"
                  style={{ backgroundColor: slide.tint.fg }}
                />
                <span
                  className="relative grid size-20 place-items-center rounded-full bg-white shadow-md sm:size-24 animate-trickle-float"
                  style={{ color: slide.tint.fg }}
                >
                  <Icon size={36} strokeWidth={1.75} />
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <button
        type="button"
        onClick={() => goTo(index - 1)}
        aria-label="Previous story"
        className="absolute left-3 top-1/2 hidden -translate-y-1/2 rounded-full border border-[#ded8ce] bg-white/90 p-2 text-[#183b3a] shadow-sm transition hover:bg-white sm:flex"
      >
        <ChevronLeft size={18} />
      </button>
      <button
        type="button"
        onClick={() => goTo(index + 1)}
        aria-label="Next story"
        className="absolute right-3 top-1/2 hidden -translate-y-1/2 rounded-full border border-[#ded8ce] bg-white/90 p-2 text-[#183b3a] shadow-sm transition hover:bg-white sm:flex"
      >
        <ChevronRight size={18} />
      </button>

      <div className="flex items-center justify-center gap-2 pb-6">
        {USE_CASE_SLIDES.map((slide, dotIndex) => (
          <button
            key={slide.title}
            type="button"
            onClick={() => goTo(dotIndex)}
            aria-label={`Go to story ${dotIndex + 1} of ${total}`}
            aria-current={dotIndex === index}
            className={`h-1.5 rounded-full transition-all ${dotIndex === index ? "w-6 bg-[#e85b43]" : "w-1.5 bg-[#ded8ce]"}`}
          />
        ))}
      </div>
    </section>
  );
}
