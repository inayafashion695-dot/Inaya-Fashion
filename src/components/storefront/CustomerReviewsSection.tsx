import { Star } from 'lucide-react';
import { SAMPLE_BANGLISH_REVIEWS } from '../../data/catalogSeed';

interface CustomerReviewsSectionProps {
  visible: boolean;
}

export function CustomerReviewsSection({ visible }: CustomerReviewsSectionProps) {
  if (!visible) return null;

  const trackItems = [...SAMPLE_BANGLISH_REVIEWS, ...SAMPLE_BANGLISH_REVIEWS];

  return (
    <section
      id="reviews"
      className="bg-[#FAF8F5] border-y border-[#EAE4DA] py-14 sm:py-16 overflow-hidden"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-8 border-b border-[#EAE4DA]">
          <div>
            <h2 className="font-display text-3xl sm:text-4xl font-semibold text-[#141210]">
              Customer Style Impressions
            </h2>
            <p className="mt-1.5 text-sm text-[#575148]">
              Sample fit &amp; fabric notes in natural Banglish to help guide sizing and styling choices.
            </p>
          </div>
          <p className="text-xs text-[#7D756B]">
            Sample customer style impressions · Varied 3★–5★ feedback
          </p>
        </div>
      </div>

      {/* Continuous Right-to-Left Marquee */}
      <div className="mt-8 w-full overflow-hidden">
        <div className="animate-marquee flex gap-5 px-4">
          {trackItems.map((review, idx) => (
            <article
              key={`${review.id}-${idx}`}
              aria-hidden={idx >= SAMPLE_BANGLISH_REVIEWS.length}
              className="w-[290px] sm:w-[350px] shrink-0 bg-white border border-[#EAE4DA] rounded-xl p-5 sm:p-6 flex flex-col justify-between gap-4 whitespace-normal"
            >
              <div>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-0.5" aria-label={`${review.rating} out of 5 stars`}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`w-4 h-4 ${
                          star <= review.rating
                            ? 'fill-[#B6862C] text-[#B6862C]'
                            : 'text-[#DCD4C8]'
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-xs text-[#7D756B]">{review.date_label}</span>
                </div>

                <p className="mt-3 text-sm text-[#141210] leading-relaxed">
                  “{review.comment}”
                </p>
              </div>

              <div className="pt-3 border-t border-[#F1ECE4] text-xs text-[#575148]">
                <div className="font-semibold text-[#141210]">
                  {review.author} <span className="font-normal text-[#7D756B]">· {review.city}</span>
                </div>
                <div className="mt-0.5 text-[#8C6218] truncate">{review.product_name}</div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
