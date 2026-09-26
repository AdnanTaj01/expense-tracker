interface Props {
  size?: number;
  className?: string;
}

function Logo({ size = 40, className = "" }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 200 200"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <rect x="10" y="10" width="180" height="180" rx="40" ry="40" fill="#0f172a" />
      <rect x="52" y="80" width="96" height="72" rx="8" ry="8" fill="#f1f5f9" />
      <rect x="52" y="80" width="96" height="14" rx="8" ry="8" fill="#e2e8f0" />
      <rect x="86" y="66" width="12" height="22" rx="2" fill="#10b981" />
      <rect x="103" y="54" width="12" height="34" rx="2" fill="#10b981" />
      <rect x="120" y="40" width="12" height="48" rx="2" fill="#10b981" />
      <rect x="132" y="104" width="24" height="24" rx="6" ry="6" fill="#0f172a" />
      <circle cx="144" cy="116" r="3.5" fill="#f1f5f9" />
      <circle cx="70" cy="134" r="24" fill="#10b981" />
      <text
        x="70"
        y="145"
        fontFamily="Arial, Helvetica, sans-serif"
        fontSize="30"
        fontWeight="700"
        fill="#ffffff"
        textAnchor="middle"
      >
        ₹
      </text>
    </svg>
  );
}

export default Logo;