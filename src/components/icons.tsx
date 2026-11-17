import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function base(paths: React.ReactNode) {
  function Icon({ size = 20, strokeWidth = 1.8, ...props }: IconProps) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        focusable="false"
        {...props}
      >
        {paths}
      </svg>
    );
  }
  return Icon;
}

export const SearchIcon = base(<><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></>);
export const CartIcon = base(<><path d="M3 4h2l2.4 11.2a2 2 0 0 0 2 1.6h7.7a2 2 0 0 0 2-1.5L21 8H6.2" /><circle cx="10" cy="20" r="1.3" /><circle cx="17" cy="20" r="1.3" /></>);
export const HeartIcon = base(<path d="M12 20s-7-4.4-9.2-8.6C1.4 8.6 3 5 6.6 5c2 0 3.3 1.1 4.4 2.6h2C14.1 6.1 15.4 5 17.4 5 21 5 22.6 8.6 21.2 11.4 19 15.6 12 20 12 20z" />);
export const UserIcon = base(<><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 3.6-6.5 8-6.5s8 2.5 8 6.5" /></>);
export const MenuIcon = base(<path d="M4 7h16M4 12h16M4 17h16" />);
export const CloseIcon = base(<path d="M6 6l12 12M18 6 6 18" />);
export const ChevronDownIcon = base(<path d="m6 9 6 6 6-6" />);
export const ChevronRightIcon = base(<path d="m9 6 6 6-6 6" />);
export const ChevronLeftIcon = base(<path d="m15 6-6 6 6 6" />);
export const ArrowRightIcon = base(<path d="M5 12h14m-6-6 6 6-6 6" />);
export const SunIcon = base(<><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></>);
export const MoonIcon = base(<path d="M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5z" />);
export const GridIcon = base(<><rect x="4" y="4" width="7" height="7" rx="1.5" /><rect x="13" y="4" width="7" height="7" rx="1.5" /><rect x="4" y="13" width="7" height="7" rx="1.5" /><rect x="13" y="13" width="7" height="7" rx="1.5" /></>);
export const ListIcon = base(<><rect x="4" y="4" width="16" height="6" rx="1.5" /><rect x="4" y="14" width="16" height="6" rx="1.5" /></>);
export const FilterIcon = base(<path d="M4 6h16M7 12h10M10 18h4" />);
export const TruckIcon = base(<><path d="M3 6h11v10H3zM14 9h4l3 3v4h-7" /><circle cx="7" cy="18" r="1.8" /><circle cx="17" cy="18" r="1.8" /></>);
export const ShieldIcon = base(<><path d="M12 3 4 6v6c0 4.5 3.4 8.2 8 9 4.6-.8 8-4.5 8-9V6l-8-3z" /><path d="m9 12 2 2 4-4" /></>);
export const RefreshIcon = base(<><path d="M20 11a8 8 0 0 0-14.6-4.5L4 8" /><path d="M4 4v4h4M4 13a8 8 0 0 0 14.6 4.5L20 16" /><path d="M20 20v-4h-4" /></>);
export const HeadsetIcon = base(<><path d="M4 14v-2a8 8 0 0 1 16 0v2" /><rect x="3" y="14" width="4" height="6" rx="1.5" /><rect x="17" y="14" width="4" height="6" rx="1.5" /></>);
export const CreditCardIcon = base(<><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 10h18M7 15h3" /></>);
export const QrIcon = base(<><rect x="4" y="4" width="6" height="6" rx="1" /><rect x="14" y="4" width="6" height="6" rx="1" /><rect x="4" y="14" width="6" height="6" rx="1" /><path d="M14 14h2v2h-2zM18 18h2v2h-2zM14 18h2M18 14h2" /></>);
export const BankIcon = base(<><path d="M3 10 12 4l9 6" /><path d="M5 10v8M9.5 10v8M14.5 10v8M19 10v8M3 20h18" /></>);
export const CashIcon = base(<><rect x="3" y="6" width="18" height="12" rx="2" /><circle cx="12" cy="12" r="2.5" /></>);
export const CheckIcon = base(<path d="m5 12 4.5 4.5L19 7" />);
export const CheckCircleIcon = base(<><circle cx="12" cy="12" r="9" /><path d="m8 12 3 3 5-6" /></>);
export const TrashIcon = base(<><path d="M4 7h16M10 11v6M14 11v6" /><path d="M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3" /></>);
export const PlusIcon = base(<path d="M12 5v14M5 12h14" />);
export const MinusIcon = base(<path d="M5 12h14" />);
export const EyeIcon = base(<><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></>);
export const BoltIcon = base(<path d="M13 2 4 14h7l-1 8 9-12h-7l1-8z" />);
export const PackageIcon = base(<><path d="m3 7 9-4 9 4v10l-9 4-9-4V7z" /><path d="m3 7 9 4 9-4M12 11v10" /></>);
export const EditIcon = base(<><path d="M12 5H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7" /><path d="m16 3 5 5M10 14l-1 4 4-1L22 8a3.5 3.5 0 0 0-5-5z" /></>);
export const StoreIcon = base(<><path d="M4 9.5 5.5 4h13L20 9.5" /><path d="M4 9.5a2.7 2.7 0 0 0 5.3 0 2.7 2.7 0 0 0 5.4 0 2.7 2.7 0 0 0 5.3 0" /><path d="M5 12.5V20h14v-7.5M10 20v-4.5h4V20" /></>);
export const UsersIcon = base(<><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20c0-3.6 2.9-5.8 6.5-5.8s6.5 2.2 6.5 5.8" /><path d="M16 4.7a3.5 3.5 0 0 1 0 6.6M18 14.6c2.2.7 3.5 2.4 3.5 5.4" /></>);
export const TagIcon = base(<><path d="M3 12V4a1 1 0 0 1 1-1h8l9 9-9 9-9-9z" /><circle cx="8" cy="8" r="1.5" /></>);
export const LogoutIcon = base(<><path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3" /><path d="M10 17l-5-5 5-5M5 12h11" /></>);
export const MapPinIcon = base(<><path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z" /><circle cx="12" cy="9.5" r="2.5" /></>);
export const PhoneIcon = base(<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z" />);
export const MailIcon = base(<><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></>);
export const CalendarIcon = base(<><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /></>);
export const SparkleIcon =base(<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3zM19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8L19 16z" />);
export const PrinterIcon = base(<><path d="M7 9V3h10v6" /><rect x="3" y="9" width="18" height="8" rx="2" /><path d="M7 14h10v7H7z" /></>);

export function StarIcon({ size = 14, filled = true, ...props }: IconProps & { filled?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" focusable="false" {...props}>
      <path
        d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9L12 3.5z"
        fill={filled ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function GoogleIcon({ size = 20, ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" focusable="false" {...props}>
      <path fill="#4285F4" d="M23.5 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.45a5.52 5.52 0 0 1-2.4 3.62v3h3.88c2.27-2.09 3.57-5.17 3.57-8.81z" />
      <path fill="#34A853" d="M12 24c3.24 0 5.96-1.07 7.94-2.92l-3.88-3a7.2 7.2 0 0 1-10.7-3.78H1.34v3.1A12 12 0 0 0 12 24z" />
      <path fill="#FBBC05" d="M5.36 14.3a7.2 7.2 0 0 1 0-4.6v-3.1H1.34a12 12 0 0 0 0 10.8l4.02-3.1z" />
      <path fill="#EA4335" d="M12 4.77c1.76 0 3.34.6 4.58 1.8l3.44-3.44A11.5 11.5 0 0 0 12 0 12 12 0 0 0 1.34 6.6l4.02 3.1A7.2 7.2 0 0 1 12 4.77z" />
    </svg>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <svg
      width="126"
      height="48"
      viewBox="0 0 126 48"
      fill="none"
      role="img"
      aria-label="EDM PC Shop"
      focusable="false"
      className={className}
      style={{ display: "inline-block", verticalAlign: "middle", flexShrink: 0 }}
    >
      <g stroke="currentColor" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M25 6H7V30H25M7 18H22" />
        <path d="M40 6V30H47C65 30 65 6 47 6H40Z" />
        <path d="M76 30V6L89 21L102 6V30" />
      </g>
      <circle cx="115" cy="30" r="3" fill="#ed713c" />
      <text x="6" y="46" fill="currentColor" fontFamily="Arial, sans-serif" fontSize="10" fontWeight="500" letterSpacing="1.5">PC Shop</text>
    </svg>
  );
}
