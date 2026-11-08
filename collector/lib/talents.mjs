// 직업 특성 트리 (static-forever talent-tree) → talents/{classId}.json
// static 데이터 버전이 바뀔 때만 재생성 (collect.mjs가 판단)
import { NS } from "./bnet.mjs";

export async function buildAllTalents(bnet, { log = () => {} } = {}) {
  const sns = NS.static(bnet.region);
  const idx = await bnet.get("/data/wow/talent-tree/index", sns);
  if (idx.status !== 200) throw new Error(`talent-tree index ${idx.status}`);

  // 직업 트리 ID → classId (class_talent_trees 링크의 playable-class 정보는 없어 spec 트리에서 역추적)
  const specTrees = idx.data.spec_talent_trees.map((t) => ({
    name: t.name,
    treeId: +t.key.href.match(/talent-tree\/(\d+)\//)[1],
    specId: +t.key.href.match(/playable-specialization\/(\d+)/)[1],
  }));
  const iconCache = {};
  const icon = (spellId) => {
    if (!spellId) return null;
    return (iconCache[spellId] ??= bnet.get(`/data/wow/media/spell/${spellId}`, sns)
      .then((r) => r.data?.assets?.find((a) => a.key === "icon")?.value ?? null));
  };
  const tip = (r) => r?.tooltip ?? r?.choice_of_tooltips?.[0];

  // 트리·아이콘 병렬 조회 (bnet 세마포어가 동시성 제한) — 순차 대비 약 10배 빠름
  const built = await Promise.all(specTrees.map(async (st, order) => {
    const [ko, en] = await Promise.all([
      bnet.get(`/data/wow/talent-tree/${st.treeId}/playable-specialization/${st.specId}`, sns),
      bnet.get(`/data/wow/talent-tree/${st.treeId}/playable-specialization/${st.specId}`, sns, { locale: "en_US" }),
    ]);
    if (ko.status !== 200) { log(`  트리 ${st.treeId}/${st.specId} ${ko.status} 건너뜀`); return null; }
    const enName = Object.fromEntries((en.data?.spec_talent_nodes ?? []).map((n) => [n.id, tip(n.ranks[0])?.talent?.name ?? tip(n.ranks[0])?.spell_tooltip?.spell?.name]));
    const nodes = await Promise.all(ko.data.spec_talent_nodes.map(async (n) => {
      const first = tip(n.ranks[0]);
      const spellId = first?.spell_tooltip?.spell?.id ?? null;
      return {
        nodeId: n.id, row: n.display_row, col: n.display_col,
        talentId: first?.talent?.id ?? null,
        name: first?.talent?.name ?? first?.spell_tooltip?.spell?.name ?? enName[n.id] ?? "?",
        nameKoMissing: !first?.talent?.name,
        spellId, icon: await icon(spellId), maxRank: n.ranks.length, castTime: first?.spell_tooltip?.cast_time ?? null,
        ranks: n.ranks.map((r) => tip(r)?.spell_tooltip?.description ?? ""),
        lockedBy: n.locked_by ?? [], unlocks: n.unlocks ?? [],
      };
    }));
    const minCol = Math.min(...nodes.map((n) => n.col));
    nodes.forEach((n) => (n.col -= minCol));
    return { order, classId: ko.data.playable_class?.id, treeId: st.treeId,
      spec: { name: ko.data.name ?? st.name, specId: st.specId, nodes: nodes.sort((x, y) => x.row - y.row || x.col - y.col) } };
  }));

  const byClass = {};
  for (const t of built.filter(Boolean).sort((x, y) => x.order - y.order)) {
    (byClass[t.classId] ??= { classId: t.classId, treeId: t.treeId, specs: [] }).specs.push(t.spec);
  }
  log(`  특성 트리 ${Object.keys(byClass).length}직업 / ${specTrees.length}트리`);
  return byClass; // { [classId]: ClassTalents }
}
