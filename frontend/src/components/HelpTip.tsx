import { useState } from "react";

interface Props {
  text: string;
}

function HelpTip({ text }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <span className="relative inline-block ml-1 align-middle">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onBlur={() => setOpen(false)}
        aria-label="Help"
        className="w-4 h-4 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-[10px] font-bold inline-flex items-center justify-center hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
      >
        ?
      </button>
      {open && (
        <span
          role="tooltip"
          className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-60 px-3 py-2 text-xs text-white bg-slate-900 dark:bg-slate-700 rounded-md shadow-lg z-50 animate-fade-in-fast"
        >
          {text}
          <span className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-slate-900 dark:border-t-slate-700" />
        </span>
      )}
    </span>
  );
}

export default HelpTip;