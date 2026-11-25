import {
  ArrowDown,
  ArrowUp,
  Bell,
  Copy,
  Database,
  Download,
  Loader2,
  Plus,
  RefreshCw,
  Trash2,
  Upload,
} from 'lucide-react';
import { useState } from 'react';
import {
  adminSaveSiteSettings,
  getSteadfastBalance,
  pingSteadfast,
  uploadImageToCloudinary,
} from '../../lib/api';
import type { HeroBanner, SiteSettings } from '../../types/ecommerce';

interface AdminSettingsTabProps {
  settings: SiteSettings;
  onSettingsChanged: (settings: SiteSettings) => void;
  onToast: (msg: string, isError?: boolean) => void;
  pwa: {
    isInstallable: boolean;
    isInstalled: boolean;
    isIOS: boolean;
    notifPermission: NotificationPermission;
    installApp: () => Promise<boolean>;
    requestNotifications: () => Promise<NotificationPermission>;
  };
}

export function AdminSettingsTab({
  settings,
  onSettingsChanged,
  onToast,
  pwa,
}: AdminSettingsTabProps) {
  const [form, setForm] = useState<SiteSettings>(() => structuredClone(settings));
  const [saving, setSaving] = useState(false);
  const [uploadingField, setUploadingField] = useState<string | null>(null);
  const [newBannerUrl, setNewBannerUrl] = useState('');
  const [sfStatus, setSfStatus] = useState<string | null>(null);
  const [checkingSf, setCheckingSf] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const saved = await adminSaveSiteSettings(form);
      onSettingsChanged(saved);
      onToast('Website customization & settings published live');
    } catch (err) {
      onToast(err instanceof Error ? err.message : 'Failed to save settings', true);
    } finally {
      setSaving(false);
    }
  };

  const handleUploadAsset = async (
    file: File | undefined,
    target: 'logo' | 'favicon' | 'new_banner'
  ) => {
    if (!file) return;
    setUploadingField(target);
    try {
      const url = await uploadImageToCloudinary(file, 'inaya-fashion/branding');
      if (target === 'logo') setForm((f) => ({ ...f, logo_url: url }));
      if (target === 'favicon') setForm((f) => ({ ...f, favicon_url: url }));
      if (target === 'new_banner') {
        const nextBanner: HeroBanner = {
          id: `banner-${Date.now()}`,
          image_url: url,
          alt: 'Inaya Fashion Promotional Banner',
          sort_order: form.hero_banners.length + 1,
          is_active: true,
        };
        setForm((f) => ({ ...f, hero_banners: [...f.hero_banners, nextBanner] }));
      }
      onToast('Uploaded image to Cloudinary');
    } catch (err) {
      onToast(err instanceof Error ? err.message : 'Upload failed', true);
    } finally {
      setUploadingField(null);
    }
  };

  const moveBanner = (idx: number, dir: -1 | 1) => {
    const targetIdx = idx + dir;
    if (targetIdx < 0 || targetIdx >= form.hero_banners.length) return;
    const next = [...form.hero_banners];
    const [item] = next.splice(idx, 1);
    next.splice(targetIdx, 0, item);
    const reordered = next.map((b, i) => ({ ...b, sort_order: i + 1 }));
    setForm({ ...form, hero_banners: reordered });
  };

  const testSteadfast = async () => {
    setCheckingSf(true);
    setSfStatus(null);
    try {
      const ping = await pingSteadfast();
      const bal = await getSteadfastBalance().catch(() => null);
      setSfStatus(
        `Connected (${ping.message || 'OK'})${
          bal && typeof bal.current_balance !== 'undefined'
            ? ` · Balance: ৳${bal.current_balance}`
            : ''
        }`
      );
      onToast('Steadfast Courier API verified');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Steadfast check failed';
      setSfStatus(msg);
      onToast(msg, true);
    } finally {
      setCheckingSf(false);
    }
  };

  const copySqlInstructions = () => {
    navigator.clipboard.writeText(
      'Open /supabase/schema.sql in your project repository and run its full contents in Supabase Dashboard -> SQL Editor.'
    );
    onToast('SQL setup instruction copied');
  };

  return (
    <form onSubmit={handleSave} className="space-y-6">
      {/* PWA & Push Notifications Card */}
      <div className="bg-white border border-[#EAE4DA] rounded-2xl p-4 sm:p-5 space-y-3">
        <h3 className="text-sm font-semibold text-[#141210]">
          Admin Mobile App (PWA) &amp; Push Alerts
        </h3>
        <div className="flex flex-wrap items-center gap-3">
          {!pwa.isInstalled && pwa.isInstallable && (
            <button
              type="button"
              onClick={pwa.installApp}
              className="min-h-[42px] px-4 py-2 rounded-xl bg-[#141210] text-white text-xs font-semibold flex items-center gap-2"
            >
              <Download className="w-4 h-4 text-[#E6C885]" />
              <span>Install Admin App</span>
            </button>
          )}
          {pwa.isInstalled && (
            <span className="text-xs font-medium text-emerald-700">
              Installed as Standalone Admin App
            </span>
          )}
          {!pwa.isInstalled && pwa.isIOS && (
            <span className="text-xs text-[#575148]">
              iOS Safari: Tap Share → Add to Home Screen while on /admin.
            </span>
          )}

          <button
            type="button"
            onClick={async () => {
              const perm = await pwa.requestNotifications();
              onToast(
                perm === 'granted'
                  ? 'Order push notifications enabled'
                  : 'Notification permission not granted',
                perm !== 'granted'
              );
            }}
            className="min-h-[42px] px-4 py-2 rounded-xl border border-[#EAE4DA] text-xs font-semibold text-[#141210] flex items-center gap-2 hover:bg-[#FAF8F5]"
          >
            <Bell className="w-4 h-4 text-[#8C6218]" />
            <span>
              {pwa.notifPermission === 'granted'
                ? 'Order Push Alerts: Enabled'
                : 'Enable New Order Push Alerts'}
            </span>
          </button>
        </div>
      </div>

      {/* Announcement Bar */}
      <div className="bg-white border border-[#EAE4DA] rounded-2xl p-4 sm:p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-[#141210]">Top Announcement Marquee</h3>
          <label className="flex items-center gap-2 text-xs font-medium">
            <input
              type="checkbox"
              checked={form.announcement_enabled}
              onChange={(e) => setForm({ ...form, announcement_enabled: e.target.checked })}
              className="w-4 h-4 accent-[#141210]"
            />
            <span>Show Announcement Bar</span>
          </label>
        </div>

        <input
          type="text"
          value={form.announcement_text}
          onChange={(e) => setForm({ ...form, announcement_text: e.target.value })}
          className="w-full px-3.5 py-2.5 text-sm border border-[#EAE4DA] rounded-xl"
        />
      </div>

      {/* Hero Banners (16:9) */}
      <div className="bg-white border border-[#EAE4DA] rounded-2xl p-4 sm:p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold text-[#141210]">
              16:9 Hero Banners ({form.hero_banners.length})
            </h3>
            <p className="text-xs text-[#575148]">
              Add, reorder, toggle, or upload new 16:9 promotional banners.
            </p>
          </div>
          <label className="cursor-pointer min-h-[40px] px-3.5 py-2 rounded-xl bg-[#141210] text-white text-xs font-semibold inline-flex items-center gap-1.5">
            {uploadingField === 'new_banner' ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Upload className="w-3.5 h-3.5 text-[#E6C885]" />
            )}
            <span>Upload Banner</span>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => handleUploadAsset(e.target.files?.[0], 'new_banner')}
            />
          </label>
        </div>

        <div className="flex gap-2">
          <input
            type="url"
            value={newBannerUrl}
            onChange={(e) => setNewBannerUrl(e.target.value)}
            placeholder="Or paste 16:9 banner URL..."
            className="flex-1 px-3 py-2 text-xs border border-[#EAE4DA] rounded-xl"
          />
          <button
            type="button"
            onClick={() => {
              if (!newBannerUrl.trim()) return;
              setForm({
                ...form,
                hero_banners: [
                  ...form.hero_banners,
                  {
                    id: `banner-${Date.now()}`,
                    image_url: newBannerUrl.trim(),
                    alt: 'Inaya Fashion Collection Banner',
                    sort_order: form.hero_banners.length + 1,
                    is_active: true,
                  },
                ],
              });
              setNewBannerUrl('');
            }}
            className="px-3.5 py-2 rounded-xl border border-[#EAE4DA] text-xs font-semibold flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add</span>
          </button>
        </div>

        <div className="space-y-3">
          {form.hero_banners.map((banner, idx) => (
            <div
              key={banner.id}
              className="p-3 rounded-xl border border-[#EAE4DA] bg-[#FAF8F5] flex flex-col sm:flex-row items-start sm:items-center gap-3"
            >
              <img
                src={banner.image_url}
                alt={banner.alt}
                referrerPolicy="no-referrer"
                className="w-32 aspect-video object-cover rounded-lg border border-[#EAE4DA] shrink-0"
              />
              <div className="flex-1 min-w-0 w-full space-y-1.5">
                <input
                  type="text"
                  value={banner.alt}
                  onChange={(e) => {
                    const next = [...form.hero_banners];
                    next[idx] = { ...next[idx], alt: e.target.value };
                    setForm({ ...form, hero_banners: next });
                  }}
                  placeholder="Banner alt text"
                  className="w-full px-2.5 py-1.5 text-xs bg-white border border-[#EAE4DA] rounded-lg"
                />
                <label className="inline-flex items-center gap-1.5 text-xs text-[#575148]">
                  <input
                    type="checkbox"
                    checked={banner.is_active}
                    onChange={(e) => {
                      const next = [...form.hero_banners];
                      next[idx] = { ...next[idx], is_active: e.target.checked };
                      setForm({ ...form, hero_banners: next });
                    }}
                    className="accent-[#141210]"
                  />
                  <span>Visible on Storefront</span>
                </label>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => moveBanner(idx, -1)}
                  aria-label="Move banner up"
                  className="p-2 rounded-lg bg-white border border-[#EAE4DA]"
                >
                  <ArrowUp className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => moveBanner(idx, 1)}
                  aria-label="Move banner down"
                  className="p-2 rounded-lg bg-white border border-[#EAE4DA]"
                >
                  <ArrowDown className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setForm({
                      ...form,
                      hero_banners: form.hero_banners.filter((_, i) => i !== idx),
                    })
                  }
                  aria-label="Remove banner"
                  className="p-2 rounded-lg bg-white border border-red-200 text-red-700"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Brand Identity, Logo & Favicon */}
      <div className="bg-white border border-[#EAE4DA] rounded-2xl p-4 sm:p-5 space-y-4">
        <h3 className="text-sm font-semibold text-[#141210]">Brand Identity, Logo &amp; Favicon</h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-[#575148] mb-1">Logo URL</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={form.logo_url}
                onChange={(e) => setForm({ ...form, logo_url: e.target.value })}
                className="flex-1 px-3 py-2 text-xs border border-[#EAE4DA] rounded-xl"
              />
              <label className="cursor-pointer px-3 py-2 rounded-xl border border-[#EAE4DA] text-xs font-medium flex items-center gap-1">
                <Upload className="w-3.5 h-3.5 text-[#8C6218]" />
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleUploadAsset(e.target.files?.[0], 'logo')}
                />
              </label>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#575148] mb-1">Favicon URL</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={form.favicon_url}
                onChange={(e) => setForm({ ...form, favicon_url: e.target.value })}
                className="flex-1 px-3 py-2 text-xs border border-[#EAE4DA] rounded-xl"
              />
              <label className="cursor-pointer px-3 py-2 rounded-xl border border-[#EAE4DA] text-xs font-medium flex items-center gap-1">
                <Upload className="w-3.5 h-3.5 text-[#8C6218]" />
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleUploadAsset(e.target.files?.[0], 'favicon')}
                />
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Homepage Sections & SEO */}
      <div className="bg-white border border-[#EAE4DA] rounded-2xl p-4 sm:p-5 space-y-4">
        <h3 className="text-sm font-semibold text-[#141210]">
          Homepage Sections &amp; SEO Metadata
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-[#575148] mb-1">
              Featured Section Heading
            </label>
            <input
              type="text"
              value={form.homepage_sections.featured_title}
              onChange={(e) =>
                setForm({
                  ...form,
                  homepage_sections: { ...form.homepage_sections, featured_title: e.target.value },
                })
              }
              className="w-full px-3 py-2 text-sm border border-[#EAE4DA] rounded-xl"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[#575148] mb-1">
              Featured Section Subtitle
            </label>
            <input
              type="text"
              value={form.homepage_sections.featured_subtitle}
              onChange={(e) =>
                setForm({
                  ...form,
                  homepage_sections: {
                    ...form.homepage_sections,
                    featured_subtitle: e.target.value,
                  },
                })
              }
              className="w-full px-3 py-2 text-sm border border-[#EAE4DA] rounded-xl"
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-4">
          <label className="flex items-center gap-2 text-xs font-medium">
            <input
              type="checkbox"
              checked={form.homepage_sections.show_featured}
              onChange={(e) =>
                setForm({
                  ...form,
                  homepage_sections: { ...form.homepage_sections, show_featured: e.target.checked },
                })
              }
              className="accent-[#141210]"
            />
            <span>Show Product Catalog</span>
          </label>
          <label className="flex items-center gap-2 text-xs font-medium">
            <input
              type="checkbox"
              checked={form.homepage_sections.show_reviews}
              onChange={(e) =>
                setForm({
                  ...form,
                  homepage_sections: { ...form.homepage_sections, show_reviews: e.target.checked },
                })
              }
              className="accent-[#141210]"
            />
            <span>Show Customer Style Impressions</span>
          </label>
        </div>

        <div className="space-y-2 pt-2 border-t border-[#F1ECE4]">
          <input
            type="text"
            value={form.seo_title}
            onChange={(e) => setForm({ ...form, seo_title: e.target.value })}
            placeholder="Global SEO Title"
            className="w-full px-3 py-2 text-xs border border-[#EAE4DA] rounded-xl"
          />
          <textarea
            rows={2}
            value={form.seo_description}
            onChange={(e) => setForm({ ...form, seo_description: e.target.value })}
            placeholder="Global SEO Meta Description"
            className="w-full px-3 py-2 text-xs border border-[#EAE4DA] rounded-xl"
          />
        </div>
      </div>

      {/* Contact, Social & Footer Content */}
      <div className="bg-white border border-[#EAE4DA] rounded-2xl p-4 sm:p-5 space-y-4">
        <h3 className="text-sm font-semibold text-[#141210]">
          Contact Information, Social Links &amp; Footer
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <input
            type="text"
            value={form.contact_phone}
            onChange={(e) => setForm({ ...form, contact_phone: e.target.value })}
            placeholder="Contact Phone"
            className="px-3 py-2 text-sm border border-[#EAE4DA] rounded-xl"
          />
          <input
            type="email"
            value={form.contact_email}
            onChange={(e) => setForm({ ...form, contact_email: e.target.value })}
            placeholder="Contact Email"
            className="px-3 py-2 text-sm border border-[#EAE4DA] rounded-xl"
          />
          <input
            type="text"
            value={form.contact_address}
            onChange={(e) => setForm({ ...form, contact_address: e.target.value })}
            placeholder="Studio Address"
            className="px-3 py-2 text-sm border border-[#EAE4DA] rounded-xl"
          />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <input
            type="url"
            value={form.social_links.facebook}
            onChange={(e) =>
              setForm({ ...form, social_links: { ...form.social_links, facebook: e.target.value } })
            }
            placeholder="Facebook URL"
            className="px-3 py-2 text-xs border border-[#EAE4DA] rounded-xl"
          />
          <input
            type="url"
            value={form.social_links.instagram}
            onChange={(e) =>
              setForm({
                ...form,
                social_links: { ...form.social_links, instagram: e.target.value },
              })
            }
            placeholder="Instagram URL"
            className="px-3 py-2 text-xs border border-[#EAE4DA] rounded-xl"
          />
          <input
            type="url"
            value={form.social_links.whatsapp}
            onChange={(e) =>
              setForm({ ...form, social_links: { ...form.social_links, whatsapp: e.target.value } })
            }
            placeholder="WhatsApp URL"
            className="px-3 py-2 text-xs border border-[#EAE4DA] rounded-xl"
          />
          <input
            type="url"
            value={form.social_links.tiktok}
            onChange={(e) =>
              setForm({ ...form, social_links: { ...form.social_links, tiktok: e.target.value } })
            }
            placeholder="TikTok URL"
            className="px-3 py-2 text-xs border border-[#EAE4DA] rounded-xl"
          />
        </div>

        <textarea
          rows={2}
          value={form.footer_about}
          onChange={(e) => setForm({ ...form, footer_about: e.target.value })}
          placeholder="Footer Brand Summary"
          className="w-full px-3 py-2 text-sm border border-[#EAE4DA] rounded-xl"
        />
      </div>

      {/* Steadfast & Database Diagnostics */}
      <div className="bg-white border border-[#EAE4DA] rounded-2xl p-4 sm:p-5 space-y-3">
        <h3 className="text-sm font-semibold text-[#141210]">
          Steadfast Courier &amp; Database Integration
        </h3>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            disabled={checkingSf}
            onClick={testSteadfast}
            className="min-h-[40px] px-4 py-2 rounded-xl border border-[#EAE4DA] text-xs font-semibold flex items-center gap-2 hover:bg-[#FAF8F5]"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${checkingSf ? 'animate-spin' : ''}`} />
            <span>Test Steadfast Connection</span>
          </button>

          <button
            type="button"
            onClick={copySqlInstructions}
            className="min-h-[40px] px-4 py-2 rounded-xl border border-[#EAE4DA] text-xs font-semibold flex items-center gap-2 hover:bg-[#FAF8F5]"
          >
            <Database className="w-3.5 h-3.5 text-[#8C6218]" />
            <span>Copy Supabase SQL Setup Info</span>
            <Copy className="w-3 h-3 text-[#7D756B]" />
          </button>
        </div>
        {sfStatus && <p className="text-xs text-[#575148]">{sfStatus}</p>}
      </div>

      {/* Sticky Save CTA */}
      <div className="sticky bottom-20 lg:bottom-4 z-20">
        <button
          type="submit"
          disabled={saving}
          className="w-full min-h-[48px] px-6 py-3 rounded-2xl bg-[#141210] text-white text-sm font-semibold shadow-lg flex items-center justify-center gap-2 hover:bg-[#8C6218]"
        >
          {saving && <Loader2 className="w-4 h-4 animate-spin" />}
          <span>Publish Website Changes Live</span>
        </button>
      </div>
    </form>
  );
}
