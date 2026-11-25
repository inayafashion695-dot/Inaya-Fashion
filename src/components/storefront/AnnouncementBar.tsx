interface AnnouncementBarProps {
  enabled: boolean;
  text: string;
}

export function AnnouncementBar({ enabled, text }: AnnouncementBarProps) {
  if (!enabled || !text.trim()) return null;

  return (
    <div
      className="h-9 bg-[#141210] text-[#E6C885] overflow-hidden flex items-center border-b border-[#2C2620]"
      role="region"
      aria-label="Store announcements"
    >
      <div className="animate-marquee whitespace-nowrap text-xs font-medium tracking-wide">
        <span className="px-10">{text}</span>
        <span className="px-10" aria-hidden="true">
          {text}
        </span>
        <span className="px-10" aria-hidden="true">
          {text}
        </span>
        <span className="px-10" aria-hidden="true">
          {text}
        </span>
      </div>
    </div>
  );
}
