import { Mail, MapPin, Phone } from 'lucide-react';
import type { SiteSettings } from '../../types/ecommerce';

interface StoreFooterProps {
  settings: SiteSettings;
  onNavigate: (path: string) => void;
}

export function StoreFooter({ settings, onNavigate }: StoreFooterProps) {
  const socials = [
    { label: 'Facebook', href: settings.social_links.facebook },
    { label: 'Instagram', href: settings.social_links.instagram },
    { label: 'WhatsApp', href: settings.social_links.whatsapp },
    { label: 'TikTok', href: settings.social_links.tiktok },
  ].filter((s) => s.href && s.href.trim().length > 0);

  return (
    <footer className="bg-white border-t border-[#EAE4DA] text-[#141210]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10">
          <div className="md:col-span-5 space-y-4">
            <img
              src={settings.logo_url}
              alt={settings.brand_name}
              referrerPolicy="no-referrer"
              className="h-11 w-auto object-contain"
            />
            <p className="text-sm text-[#575148] max-w-sm leading-relaxed">
              {settings.footer_about}
            </p>
            <div className="flex flex-wrap items-center gap-4 pt-1">
              {socials.map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-semibold uppercase tracking-wider text-[#575148] hover:text-[#8C6218] transition-colors"
                >
                  {s.label}
                </a>
              ))}
            </div>
          </div>

          <div className="md:col-span-3 space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[#575148]">
              Navigation
            </h3>
            <ul className="space-y-2.5 text-sm">
              {settings.footer_links.map((link, idx) => (
                <li key={`${link.label}-${idx}`}>
                  <a
                    href={link.href}
                    onClick={(e) => {
                      if (link.href.startsWith('/')) {
                        e.preventDefault();
                        onNavigate(link.href);
                      }
                    }}
                    className="text-[#141210] hover:text-[#8C6218] transition-colors"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div className="md:col-span-4 space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[#575148]">
              Contact &amp; Studio
            </h3>
            <div className="space-y-2.5 text-sm text-[#575148]">
              {settings.contact_phone && (
                <a
                  href={`tel:${settings.contact_phone.replace(/\s+/g, '')}`}
                  className="flex items-center gap-2.5 hover:text-[#141210]"
                >
                  <Phone className="w-4 h-4 text-[#8C6218] shrink-0" />
                  <span className="tabular-nums">{settings.contact_phone}</span>
                </a>
              )}
              {settings.contact_email && (
                <a
                  href={`mailto:${settings.contact_email}`}
                  className="flex items-center gap-2.5 hover:text-[#141210]"
                >
                  <Mail className="w-4 h-4 text-[#8C6218] shrink-0" />
                  <span>{settings.contact_email}</span>
                </a>
              )}
              {settings.contact_address && (
                <div className="flex items-start gap-2.5">
                  <MapPin className="w-4 h-4 text-[#8C6218] shrink-0 mt-0.5" />
                  <span>{settings.contact_address}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-[#EAE4DA] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#7D756B]">
          <span>
            © {new Date().getFullYear()} {settings.brand_name}. All rights reserved.
          </span>
          <span>Cash on Delivery via Steadfast Courier · Bangladesh</span>
        </div>
      </div>
    </footer>
  );
}
