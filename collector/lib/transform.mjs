// Blizzard 응답 → 사이트 데이터 형식 (Node 수집기 · Worker Update 버튼 공용)
import { NS } from "./bnet.mjs";
import { streamerOf } from "./streamers.mjs";

export const SUB_ENDPOINTS = ["equipment", "statistics", "specializations", "character-media", "appearance", "professions", "quests/completed"];

/** SUB_ENDPOINTS 순서대로 받은 응답 → buildCharacter 입력 묶음 */
export function rawFromSubs(profile, subs) {
  const [equipment, statistics, specializations, media, appearance, professions, questsDone] = subs.map((r) => r.data);
  return { profile, equipment, statistics, specializations, media, appearance, professions, questsDone };
}

/**
 * 전문 기술 — API 이름이 영문으로 와서 한국어 이름·공식 아이콘(static media)을 고정 표로 매핑
 * (아이콘: /data/wow/media/profession/{id} · static-forever-kr 응답값, 추가 요청 없음)
 */
const ICON = (n) => `https://render.worldofwarcraft.com/forever-kr/icons/56/${n}.jpg`;
export const PROFESSIONS = {
  164: { name: "대장기술", icon: ICON(136241) }, 165: { name: "가죽세공", icon: ICON(136247) },
  171: { name: "연금술", icon: ICON(136240) }, 182: { name: "약초채집", icon: ICON(136246) },
  186: { name: "채광", icon: ICON(136248) }, 197: { name: "재봉술", icon: ICON(136249) },
  202: { name: "기계공학", icon: ICON(136243) }, 333: { name: "마법부여", icon: ICON(136244) },
  393: { name: "무두질", icon: ICON(134366) }, 185: { name: "요리", icon: ICON(133971) },
  129: { name: "응급치료", icon: ICON(135966) }, 356: { name: "낚시", icon: ICON(136245) },
};

/** professions 응답 → [{ id, name, icon, skill, max, secondary }] (조회 실패면 null) */
export function parseProfessions(pr) {
  if (!pr) return null;
  const one = (x, secondary) => {
    const id = x.profession?.id;
    const t = x.tiers?.[0] ?? x; // 클래식: 단일 tier (구버전 형식이면 최상위에 skill_points)
    return {
      id, name: PROFESSIONS[id]?.name ?? x.profession?.name ?? "?", icon: PROFESSIONS[id]?.icon ?? null,
      skill: t.skill_points ?? 0, max: t.max_skill_points ?? 0, secondary,
    };
  };
  return [...(pr.primaries ?? []).map((x) => one(x, false)), ...(pr.secondaries ?? []).map((x) => one(x, true))];
}

/** statistics 평탄화: value형 → 숫자, base/effective형 → `${k}_base` / `${k}_effective`, power_type → 이름 */
export function flatStats(s) {
  const o = {};
  for (const [k, v] of Object.entries(s ?? {})) {
    if (k === "_links" || k === "character") continue;
    if (k === "power_type") { o.power_type = v?.name ?? null; continue; }
    if (v && typeof v === "object") {
      // base 음수가 부호 없는 32비트로 오는 경우 복원 (4294967284 → -12)
      if ("effective" in v) { o[`${k}_base`] = v.base | 0; o[`${k}_effective`] = v.effective; }
      else if ("value" in v) o[k] = v.value;
    } else o[k] = v;
  }
  return o;
}

const visibleStats = (i) => (i.stats ?? []).filter((s) => !s.is_hidden && s.display?.display_string);
const isBonusStat = (s) => s.is_equip_bonus || (s.display?.color && s.display.color.r === 0 && s.display.color.g === 255 && s.display.color.b === 0);

/** 장비 — icon/displayId는 items 캐시로 채움 */
export function parseEquip(e, items = {}) {
  return (e?.equipped_items ?? []).map((i) => {
    const info = items[i.item.id] ?? {};
    const w = i.weapon;
    return {
      slot: i.slot.type, slotName: i.slot.name, itemId: i.item.id, name: i.name, quality: i.quality?.type,
      ilvl: i.level?.value, subclass: i.is_subclass_hidden ? null : i.item_subclass?.name,
      inventoryType: i.inventory_type?.name, binding: i.binding?.name ?? null,
      icon: info.icon ?? null, displayId: info.displayId ?? null,
      armor: i.armor?.value ?? null,
      weapon: w?.damage ? {
        min: w.damage.min_value ?? null, max: w.damage.max_value ?? null, damageType: w.damage.damage_class?.name ?? null,
        speed: w.attack_speed?.value != null ? w.attack_speed.value / 1000 : null, dps: w.dps?.value ?? null,
      } : null,
      // 숨김 스탯(모든 저항 +N의 개별 저항 등) 제외, 장착 보너스(녹색)는 따로
      stats: visibleStats(i).filter((s) => !isBonusStat(s)).map((s) => s.display.display_string),
      bonusStats: visibleStats(i).filter(isBonusStat).map((s) => s.display.display_string),
      enchants: (i.enchantments ?? []).map((x) => x.display_string),
      spells: (i.spells ?? []).map((x) => x.description).filter(Boolean),
      set: i.set ? {
        name: i.set.display_string ?? i.set.item_set?.name,
        items: (i.set.items ?? []).map((x) => ({ name: x.item?.name, equipped: !!x.is_equipped })),
        effects: (i.set.effects ?? []).map((x) => ({ text: x.display_string, count: x.required_count ?? null, active: !!x.is_active })),
      } : null,
      description: i.description ?? null, unique: i.unique_equipped ?? null,
      shieldBlock: i.shield_block?.display?.display_string ?? null,
      classes: i.requirements?.playable_classes?.display_string ?? null,
      charges: i.charges?.display_string ?? null, transmog: i.transmog?.display_string ?? null,
      requiredLevel: i.requirements?.level?.value ?? null, durability: i.durability?.value ?? null,
      durabilityText: i.durability?.display_string ?? null, sellPrice: i.sell_price?.value ?? null,
    };
  });
}

export const equippedItemIds = (e) => (e?.equipped_items ?? []).map((i) => i.item.id);

/** 대표 특성 = 포인트 최다 (0이면 null) */
export function topSpec(c) {
  const t = [...(c?.talents ?? [])].sort((a, b) => b.points - a.points)[0];
  return t && t.points > 0 ? t.specName : null;
}

/** 프로필 응답에서 static 데이터 버전 (예: "1.60.1_70399") — 특성 트리 갱신 판단용 */
export function staticVersion(profile) {
  const href = profile?.character_class?.key?.href ?? "";
  return href.match(/namespace=static-([\d._]+)-forever/)?.[1] ?? null;
}

/** 캐릭터 1명 원본 응답 묶음 → CharacterDetail */
export function buildCharacter({ profile: p, equipment: eq, statistics: st, specializations: sp, media: md, appearance: ap, professions: pr, questsDone: qd }, { rank, items, slug }) {
  const act = sp?.specialization_groups?.find((g) => g.is_active);
  return {
    id: p.id, name: p.name, surname: p.surname, slug: slug ?? `${p.name}-${p.surname}`.toLowerCase(), level: p.level, rank,
    classId: p.character_class?.id, className: p.character_class?.name, raceId: p.race?.id, raceName: p.race?.name,
    gender: p.gender, faction: p.faction, guild: p.guild?.name, ilvl: p.equipped_item_level, avgIlvl: p.average_item_level,
    lastLogin: p.last_login_timestamp,
    // 프로필 사진: 스트리머 사진(characterId 기준) 우선, 없으면 와우 캐릭터 아바타
    avatar: streamerOf(p.id)?.image ?? md?.assets?.find((a) => a.key === "avatar")?.value ?? null,
    wowAvatar: md?.assets?.find((a) => a.key === "avatar")?.value ?? null,
    render: md?.assets?.find((a) => a.key === "main-raw")?.value ?? null,
    spec: (act?.specializations ?? []).map((x) => ({ name: x.specialization_name ?? x.specialization?.name, points: x.spent_points })),
    talents: (act?.specializations ?? []).map((x) => ({
      specId: x.specialization?.id, specName: x.specialization_name, points: x.spent_points,
      picks: (x.talents ?? []).map((t) => ({ talentId: t.talent?.id, rank: t.talent_rank })),
    })),
    stats: st ? flatStats(st) : null,
    equipment: parseEquip(eq, items),
    professions: parseProfessions(pr),
    questsCompleted: qd?.quests ? qd.quests.length : null, // 완료한 퀘스트 수 (목록은 용량이 커서 저장 안 함)
    appearance: ap ? {
      gender: ap.gender?.type,
      customizations: (ap.customizations ?? []).map((c) => ({ option: c.option?.id, choice: c.choice?.id, order: c.choice?.display_order })),
    } : null,
  };
}

/** 프로필 + 하위 7종 조회 (Update 버튼·수집기 공용). 프로필 404면 null */
export async function fetchCharacterRaw(bnet, slug) {
  const ns = NS.profile(bnet.region);
  const base = `/profile/wow/character/${slug}`;
  const prof = await bnet.get(base, ns);
  if (prof.status !== 200) return { status: prof.status, raw: null };
  const subs = await Promise.all(SUB_ENDPOINTS.map((x) => bnet.get(`${base}/${x}`, ns)));
  return {
    status: 200,
    raw: rawFromSubs(prof.data, subs),
    missing: SUB_ENDPOINTS.filter((_, i) => subs[i].status !== 200),
  };
}

/** index.json 한 줄 (사이드바·검색용) */
export function indexEntry(m, c) {
  return withStreamer({
    id: m.id, name: m.name, surname: m.surname, slug: m.slug,
    level: c?.level ?? m.level, classId: m.classId, raceId: m.raceId, rank: m.rank,
    avatar: c?.avatar ?? null, spec: c ? topSpec(c) : null, has: !!c,
  });
}

/** index 항목에 스트리머 정보 적용 — 아바타를 스트리머 사진으로 교체 + streamer {name, soop} (이전 항목 재사용 시에도 매번 적용) */
export function withStreamer(e) {
  const s = streamerOf(e.id);
  if (!s) { const { streamer: _, ...rest } = e; return rest; }
  return { ...e, avatar: s.image, streamer: { name: s.name, soop: s.soop } };
}
