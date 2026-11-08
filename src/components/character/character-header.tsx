"use client";

import { Clock } from "lucide-react";
import { UpdateButton } from "@/components/character/update-button";
import { CLASS_INFO, timeAgo } from "@/lib/wow";

interface Props {
  name: string;
  surname: string;
  level: number;
  classId: number;
  specName?: string;
  avatar?: string;
  lastLogin?: number;
  seed: number;
  slug: string;
  collectedAt?: string;
}

export function CharacterHeader({ name, surname, level, classId, specName, avatar, lastLogin, seed, slug, collectedAt }: Props) {
  const cls = CLASS_INFO[classId];
  return (
    <div className="flex items-center gap-4 border-b border-line px-5 py-4">
      <div
        className="anim-img h-[62px] w-[62px] shrink-0 overflow-hidden rounded-md border-2 shadow-[0_2px_12px_rgba(0,0,0,.5)]"
        style={{ borderColor: cls?.color }}
      >
        {avatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={avatar} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-bg3 text-2xl font-extrabold" style={{ color: cls?.color }}>
            {name[0]}
          </div>
        )}
      </div>

      <div className="anim-up min-w-0">
        <div className="flex items-baseline gap-2.5">
          <span className="font-display text-[15px] font-bold text-tx2">LV.{level}</span>
          <span className="truncate text-[29px] font-extrabold leading-none tracking-[-.5px] text-tx1">{name} {surname}</span>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <span
            className="rounded border px-[9px] py-0.5 text-[12px] font-bold tracking-[.3px]"
            style={{ color: cls?.color, borderColor: `${cls?.color}40`, background: `${cls?.color}14` }}
          >
            {cls?.name}
          </span>
          {specName && (
            <span className="rounded border border-line2 bg-[rgba(130,130,130,.1)] px-[9px] py-0.5 text-[12px] font-bold tracking-[.3px] text-gold">
              {specName}
            </span>
          )}
          {lastLogin && (
            <span className="ml-1.5 flex items-center gap-1 text-[13px] font-semibold text-tx2">
              <Clock className="h-3.5 w-3.5" />
              {timeAgo(lastLogin)}
            </span>
          )}
        </div>
      </div>

      <UpdateButton key={slug} slug={slug} collectedAt={collectedAt} />
    </div>
  );
}
