import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { HeroBanner } from '../../types/ecommerce';

interface HeroBannerCarouselProps {
  banners: HeroBanner[];
}

export function HeroBannerCarousel({ banners }: HeroBannerCarouselProps) {
  const activeBanners = [...banners]
    .filter((b) => b.is_active && b.image_url)
    .sort((a, b) => a.sort_order - b.sort_order);

  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (activeBanners.length <= 1 || paused) return;
    const timer = window.setInterval(() => {
      setIndex((prev) => (prev + 1) % activeBanners.length);
    }, 5200);
    return () => window.clearInterval(timer);
  }, [activeBanners.length, paused]);

  useEffect(() => {
    if (index >= activeBanners.length) {
      setIndex(0);
    }
  }, [activeBanners.length, index]);

  if (activeBanners.length === 0) return null;

  const goPrev = () => setIndex((prev) => (prev - 1 + activeBanners.length) % activeBanners.length);
  const goNext = () => setIndex((prev) => (prev + 1) % activeBanners.length);

  return (
    <section
      aria-label="Seasonal collection banners"
      className="w-full bg-white"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* Pure 16:9 Banner Container — Strictly zero text, buttons, or overlays on the image */}
      <div className="max-w-[1440px] mx-auto">
        <div className="relative w-full aspect-video overflow-hidden bg-[#141210]">
          <div
            className="flex h-full w-full transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]"
            style={{ transform: `translate3d(-${index * 100}%, 0, 0)` }}
          >
            {activeBanners.map((banner, idx) => (
              <div key={banner.id} className="w-full h-full shrink-0 relative">
                <img
                  src={banner.image_url}
                  alt={banner.alt || `Inaya Fashion Collection Banner ${idx + 1}`}
                  referrerPolicy="no-referrer"
                  loading={idx === 0 ? 'eager' : 'lazy'}
                  className="w-full h-full object-cover object-center select-none"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Controls cleanly placed below the 16:9 frame so zero overlays cover the hero photography */}
        {activeBanners.length > 1 && (
          <div className="flex items-center justify-between px-4 sm:px-6 lg:px-8 py-3 border-b border-[#EAE4DA]/70">
            <div className="flex items-center gap-2" role="tablist" aria-label="Choose campaign banner">
              {activeBanners.map((b, i) => (
                <button
                  key={b.id}
                  type="button"
                  role="tab"
                  aria-selected={i === index}
                  aria-label={`View banner ${i + 1}`}
                  onClick={() => setIndex(i)}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    i === index ? 'w-8 bg-[#B6862C]' : 'w-2.5 bg-[#D8D0C5] hover:bg-[#9A6F20]'
                  }`}
                />
              ))}
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-mono tabular-nums text-[#575148] mr-1">
                {String(index + 1).padStart(2, '0')} / {String(activeBanners.length).padStart(2, '0')}
              </span>
              <button
                type="button"
                onClick={goPrev}
                aria-label="Previous banner"
                className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-md border border-[#EAE4DA] text-[#141210] hover:border-[#B6862C] transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={goNext}
                aria-label="Next banner"
                className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-md border border-[#EAE4DA] text-[#141210] hover:border-[#B6862C] transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
