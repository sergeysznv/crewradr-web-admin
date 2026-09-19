import React from 'react';

interface CountryFlagProps {
  code: string;
  className?: string;
}

export function CountryFlag({ code, className = 'w-5 h-3.5' }: CountryFlagProps) {
  const norm = code.toLowerCase();

  switch (norm) {
    case 'en':
    case 'us':
      return (
        <svg
          viewBox="0 0 640 480"
          className={`inline-block rounded-xs shadow-xs shrink-0 object-cover ${className}`}
          aria-hidden="true"
        >
          <path fill="#bd3d44" d="M0 0h640v480H0z" />
          <path stroke="#fff" strokeWidth="37" d="M0 55.5h640M0 129.5h640M0 203.5h640M0 277.5h640M0 351.5h640M0 425.5h640" />
          <path fill="#192f5d" d="M0 0h260v258.5H0z" />
          <g fill="#fff">
            <polygon points="26,20 29,29 39,29 31,35 34,44 26,38 18,44 21,35 13,29 23,29" />
            <polygon points="78,20 81,29 91,29 83,35 86,44 78,38 70,44 73,35 65,29 75,29" />
            <polygon points="130,20 133,29 143,29 135,35 138,44 130,38 122,44 125,35 117,29 127,29" />
            <polygon points="182,20 185,29 195,29 187,35 190,44 182,38 174,44 177,35 169,29 179,29" />
            <polygon points="234,20 237,29 247,29 239,35 242,44 234,38 226,44 229,35 221,29 231,29" />
            <polygon points="52,55 55,64 65,64 57,70 60,79 52,73 44,79 47,70 39,64 49,64" />
            <polygon points="104,55 107,64 117,64 109,70 112,79 104,73 96,79 99,70 91,64 101,64" />
            <polygon points="156,55 159,64 169,64 161,70 164,79 156,73 148,79 151,70 143,64 153,64" />
            <polygon points="208,55 211,64 221,64 213,70 216,79 208,73 200,79 203,70 195,64 205,64" />
            <polygon points="26,90 29,99 39,99 31,105 34,114 26,108 18,114 21,105 13,99 23,99" />
            <polygon points="78,90 81,99 91,99 83,105 86,114 78,108 70,114 73,105 65,99 75,99" />
            <polygon points="130,90 133,99 143,99 135,105 138,114 130,108 122,114 125,105 117,99 127,99" />
            <polygon points="182,90 185,99 195,99 187,105 190,114 182,108 174,114 177,105 169,99 179,99" />
            <polygon points="234,90 237,99 247,99 239,105 242,114 234,108 226,114 229,105 221,99 231,99" />
            <polygon points="52,125 55,134 65,134 57,140 60,149 52,143 44,149 47,140 39,134 49,134" />
            <polygon points="104,125 107,134 117,134 109,140 112,149 104,143 96,149 99,140 91,134 101,134" />
            <polygon points="156,125 159,134 169,134 161,140 164,149 156,143 148,149 151,140 143,134 153,134" />
            <polygon points="208,125 211,134 221,134 213,140 216,149 208,143 200,149 203,140 195,134 205,134" />
            <polygon points="26,160 29,169 39,169 31,175 34,184 26,178 18,184 21,175 13,169 23,169" />
            <polygon points="78,160 81,169 91,169 83,175 86,184 78,178 70,184 73,175 65,169 75,169" />
            <polygon points="130,160 133,169 143,169 135,175 138,184 130,178 122,184 125,175 117,169 127,169" />
            <polygon points="182,160 185,169 195,169 187,175 190,184 182,178 174,184 177,175 169,169 179,169" />
            <polygon points="234,160 237,169 247,169 239,175 242,184 234,178 226,184 229,175 221,169 231,169" />
            <polygon points="52,195 55,204 65,204 57,210 60,219 52,213 44,219 47,210 39,204 49,204" />
            <polygon points="104,195 107,204 117,204 109,210 112,219 104,213 96,219 99,210 91,204 101,204" />
            <polygon points="156,195 159,204 169,204 161,210 164,219 156,213 148,219 151,210 143,204 153,204" />
            <polygon points="208,195 211,204 221,204 213,210 216,219 208,213 200,219 203,210 195,204 205,204" />
            <polygon points="26,230 29,239 39,239 31,245 34,254 26,248 18,254 21,245 13,239 23,239" />
            <polygon points="78,230 81,239 91,239 83,245 86,254 78,248 70,254 73,245 65,239 75,239" />
            <polygon points="130,230 133,239 143,239 135,245 138,254 130,248 122,254 125,245 117,239 127,239" />
            <polygon points="182,230 185,239 195,239 187,245 190,254 182,248 174,254 177,245 169,239 179,239" />
            <polygon points="234,230 237,239 247,239 239,245 242,254 234,248 226,254 229,245 221,239 231,239" />
          </g>
        </svg>
      );
    case 'es':
      return (
        <svg
          viewBox="0 0 640 480"
          className={`inline-block rounded-xs shadow-xs shrink-0 object-cover ${className}`}
          aria-hidden="true"
        >
          <path fill="#c60b1e" d="M0 0h640v120H0zm0 360h640v120H0z" />
          <path fill="#ffc400" d="M0 120h640v240H0z" />
          <g transform="translate(140, 240) scale(0.6)">
            <rect x="-30" y="-50" width="60" height="70" rx="10" fill="#c60b1e" stroke="#fff" strokeWidth="4" />
            <circle cx="0" cy="-60" r="14" fill="#ffc400" />
            <rect x="-8" y="-40" width="16" height="40" fill="#ffc400" />
          </g>
        </svg>
      );
    case 'fr':
      return (
        <svg
          viewBox="0 0 640 480"
          className={`inline-block rounded-xs shadow-xs shrink-0 border border-black/10 dark:border-white/10 object-cover ${className}`}
          aria-hidden="true"
        >
          <path fill="#002654" d="M0 0h213.3v480H0z" />
          <path fill="#ffffff" d="M213.3 0h213.4v480H213.3z" />
          <path fill="#ce1126" d="M426.7 0H640v480H426.7z" />
        </svg>
      );
    case 'ar':
    case 'sa':
      return (
        <svg
          viewBox="0 0 640 480"
          className={`inline-block rounded-xs shadow-xs shrink-0 object-cover ${className}`}
          aria-hidden="true"
        >
          <path fill="#006c35" d="M0 0h640v480H0z" />
          <path fill="#ffffff" d="M160 320h300l20-10-20-10H160c-10 0-15 5-15 10s5 10 15 10zm-30-25v30h15v-30h-15z" />
          <path fill="#ffffff" d="M220 220c30-10 60 10 90-5 30-15 60 5 90-10 20-10 40 5 60-5v20c-20 10-40-5-60 5-30 15-60-5-90 10-30 15-60-5-90 5v-20z" />
        </svg>
      );
    case 'zh':
    case 'cn':
      return (
        <svg
          viewBox="0 0 640 480"
          className={`inline-block rounded-xs shadow-xs shrink-0 object-cover ${className}`}
          aria-hidden="true"
        >
          <path fill="#de2910" d="M0 0h640v480H0z" />
          <polygon fill="#ffde00" points="100,60 115,105 160,105 125,135 140,180 100,150 60,180 75,135 40,105 85,105" />
          <polygon fill="#ffde00" points="200,40 205,55 220,55 208,65 212,80 200,70 188,80 192,65 180,55 195,55" />
          <polygon fill="#ffde00" points="240,80 245,95 260,95 248,105 252,120 240,110 228,120 232,105 220,95 235,95" />
          <polygon fill="#ffde00" points="240,140 245,155 260,155 248,165 252,180 240,170 228,180 232,165 220,155 235,155" />
          <polygon fill="#ffde00" points="200,180 205,195 220,195 208,205 212,220 200,210 188,220 192,205 180,195 195,195" />
        </svg>
      );
    case 'ru':
      return (
        <svg
          viewBox="0 0 640 480"
          className={`inline-block rounded-xs shadow-xs shrink-0 border border-black/10 dark:border-white/10 object-cover ${className}`}
          aria-hidden="true"
        >
          <path fill="#ffffff" d="M0 0h640v160H0z" />
          <path fill="#0039a6" d="M0 160h640v160H0z" />
          <path fill="#d52b1e" d="M0 320h640v160H0z" />
        </svg>
      );
    default:
      return null;
  }
}
