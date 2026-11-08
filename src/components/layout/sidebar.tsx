"use client";

import { useState } from "react";
import {
  LayoutDashboard,
  User,
  BarChart3,
  Sword,
  Users,
  Swords,
  ScrollText,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { key: "dashboard", label: "대시보드", code: "DASH", icon: LayoutDashboard },
  { key: "character", label: "캐릭터", code: "CHAR", icon: User },
  { key: "stats", label: "스탯", code: "STAT", icon: BarChart3 },
  { key: "items", label: "아이템", code: "ITEM", icon: Sword },
  { key: "raid", label: "레이드 빌더", code: "RAID", icon: Swords },
  { key: "guild", label: "길드", code: "GULD", icon: Users },
  { key: "recap", label: "리캡", code: "RCAP", icon: ScrollText },
];

export function Sidebar() {
  const [active, setActive] = useState("dashboard");

  return (
    <aside className="flex w-60 shrink-0 flex-col border-r border-border bg-card/40 backdrop-blur-xl">
      <div className="flex items-center gap-3 px-5 py-6">
        <div className="chamfer-sm gradient-bg flex h-10 w-10 items-center justify-center text-black glow">
          <Swords className="h-5 w-5" strokeWidth={2.5} />
        </div>
        <div className="leading-tight">
          <div className="gradient-text font-mono text-sm font-extrabold tracking-[0.2em]">
            WOW FOREVER
          </div>
          <div className="text-[10px] font-medium uppercase tracking-[0.25em] text-faint">
            Guild Dashboard
          </div>
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-2">
        {NAV.map(({ key, label, code, icon: Icon }) => {
          const isActive = active === key;
          return (
            <button
              key={key}
              onClick={() => setActive(key)}
              className={cn(
                "chamfer-sm group relative flex w-full items-center gap-3 px-3 py-2.5 text-sm transition-all",
                isActive
                  ? "liquid-glass text-gold-bright"
                  : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
              )}
            >
              {isActive && (
                <span className="gradient-bg absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-full" />
              )}
              <Icon className="h-[18px] w-[18px]" />
              <span className={cn("font-medium", isActive && "font-semibold")}>
                {label}
              </span>
              <span className="ml-auto font-mono text-[9px] tracking-widest text-faint opacity-0 transition-opacity group-hover:opacity-100">
                {code}
              </span>
            </button>
          );
        })}
      </nav>

      <div className="border-t border-border/60 px-3 py-3">
        <button className="chamfer-sm flex w-full items-center gap-3 px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-secondary/60 hover:text-foreground">
          <Settings className="h-[18px] w-[18px]" />
          설정
        </button>
      </div>
    </aside>
  );
}
