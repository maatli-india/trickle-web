// Brand mark: a dark "start" dot, a green trickling path, and an amber
// "drop" at the end. Same geometry/colors as the mobile app's TrickleLogo
// (src/components/TrickleLogo.js) and the app icon, so the mark reads the
// same everywhere. `dark` renders the start dot + wordmark in white, for
// placing the mark on the brand-green/navy backgrounds instead of the
// site's light background.
export function TrickleLogo({
  size = 28,
  dark = false,
  className = "",
}: {
  size?: number;
  dark?: boolean;
  className?: string;
}) {
  const markColor = dark ? "#FFFFFF" : "#101828";
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <svg
        width={size}
        height={size * 0.9}
        viewBox="0 0 100 90"
        aria-hidden="true"
      >
        <path
          d="M 19 24 C 14 46 34 50 52 58 C 66 64 70 66 74 70"
          fill="none"
          stroke="#0F6E56"
          strokeWidth={9}
          strokeLinecap="round"
        />
        <circle cx="18" cy="16" r="9" fill={markColor} />
        <circle cx="78" cy="74" r="14" fill="#F5A623" />
      </svg>
      <span
        className="font-normal tracking-tight"
        style={{
          fontFamily: "var(--font-poppins)",
          color: markColor,
          fontSize: size * 0.9,
        }}
      >
        trickle
      </span>
    </span>
  );
}
