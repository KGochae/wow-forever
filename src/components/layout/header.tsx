import { Search, Bell } from "lucide-react";

export function Header() {
  return (
    <header className="flex h-16 shrink-0 items-center gap-4 border-b border-border bg-card/30 px-6 backdrop-blur-xl">
      <div>
        <h1 className="font-mono text-sm font-bold tracking-[0.15em] text-foreground">
          DASHBOARD
        </h1>
        <p className="text-[11px] tracking-wide text-faint">
          2026 시즌 · WoW Forever
        </p>
      </div>

      <div className="relative ml-auto w-full max-w-xs">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" />
        <input
          type="text"
          placeholder="캐릭터 검색..."
          className="chamfer-sm w-full border border-border bg-secondary/60 py-2 pl-9 pr-3 text-sm text-foreground placeholder:text-faint outline-none transition-colors focus:border-ring/70"
        />
      </div>

      <button className="chamfer-sm relative flex h-9 w-9 items-center justify-center border border-border bg-secondary/60 text-muted-foreground transition-colors hover:text-foreground">
        <Bell className="h-[18px] w-[18px]" />
        <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-legendary" />
      </button>

      <div className="chamfer-sm flex items-center gap-2.5 border border-border bg-secondary/60 py-1.5 pl-1.5 pr-3">
        <div className="chamfer-sm flex h-7 w-7 items-center justify-center bg-gradient-to-br from-epic to-rare text-xs font-bold text-white">
          GM
        </div>
        <span className="text-sm text-foreground">길드마스터</span>
      </div>
    </header>
  );
}
