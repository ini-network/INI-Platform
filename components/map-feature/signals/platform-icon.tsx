// Small inline platform glyphs for source chips (monochrome, currentColor).
// Presentational, no hooks — safe to render in server or client trees. The chip
// always shows the platform name beside the icon, so these are supportive marks
// rather than pixel-exact brand logos.

type IconProps = { className?: string };

function normalize(platform: string): string {
  return platform.trim().toLowerCase();
}

export function GlobeIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="1.7" />
      <path
        d="M3 12h18M12 3c2.5 2.4 3.8 5.6 3.8 9S14.5 18.6 12 21c-2.5-2.4-3.8-5.6-3.8-9S9.5 5.4 12 3Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function RedditIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="13.5" r="8" fill="currentColor" />
      <circle cx="18" cy="5.5" r="1.7" fill="currentColor" />
      <line
        x1="12"
        y1="10"
        x2="17"
        y2="5.9"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
      <circle cx="9" cy="13" r="1.5" fill="var(--surface, #fff)" />
      <circle cx="15" cy="13" r="1.5" fill="var(--surface, #fff)" />
      <path
        d="M9 16.4c1.7 1.3 4.3 1.3 6 0"
        fill="none"
        stroke="var(--surface, #fff)"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

function BlueskyIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M12 10.8C10.3 7.6 6.9 4.8 5.1 4.2 3.3 3.6 2.4 4.6 2.4 6.7c0 2.1.6 5.2 1.3 6.2.7 1 2 1.3 3.4 1.1-2.6.5-3.3 2-1.9 3.5 1.5 1.6 3.9-.4 5.1-3.4l.6-1.6.6 1.6c1.2 3 3.6 5 5.1 3.4 1.4-1.5.7-3-1.9-3.5 1.4.2 2.7-.1 3.4-1.1.7-1 1.3-4.1 1.3-6.2 0-2.1-.9-3.1-2.7-2.5-1.8.6-5.2 3.4-6.9 6.6Z"
        fill="currentColor"
      />
    </svg>
  );
}

function NextdoorIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M12 3 3.5 9.6V21H9v-6.2c0-1.4 1.3-2.4 3-2.4s3 1 3 2.4V21h5.5V9.6L12 3Z"
        fill="currentColor"
      />
    </svg>
  );
}

// Icon for a post platform. Falls back to the globe for anything unrecognized.
export function PlatformIcon({
  platform,
  className
}: {
  platform: string;
  className?: string;
}) {
  const key = normalize(platform);
  if (key.includes("reddit")) return <RedditIcon className={className} />;
  if (key.includes("bluesky") || key.includes("bsky")) return <BlueskyIcon className={className} />;
  if (key.includes("nextdoor")) return <NextdoorIcon className={className} />;
  return <GlobeIcon className={className} />;
}

// A readable label for a platform slug (e.g. "bluesky" -> "Bluesky").
export function platformLabel(platform: string): string {
  const key = normalize(platform);
  if (key.includes("reddit")) return "Reddit";
  if (key.includes("bluesky") || key.includes("bsky")) return "Bluesky";
  if (key.includes("nextdoor")) return "Nextdoor";
  if (!platform.trim()) return "Source";
  return platform.trim().replace(/^\w/, (c) => c.toUpperCase());
}
