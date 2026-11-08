// WoW Forever 전용 렌더 진입점
// - WEB_PROJECT generateModels 와 동일한 ZamModelViewer 옵션 (classic env, hd:false)
// - 외형은 "이름 + display_order" 추측 대신 Blizzard appearance API의 optionId/choiceId 를 그대로 사용
import "./setup.js";
import { WowModelViewer } from "./wow_model_viewer.js";

const CHARACTER = 16;

/**
 * 캐릭터 모델 번호. 옛 종족은 race*2-1+gender 공식이 맞지만, 신규 종족은 별도 번호.
 * (공식대로면 스카이본 95 → 189/190 = 드루이드 곰/표범 변신 모델이 됨)
 * 확인 방법: _dev/api_test/find_cc.mjs 로 appearance 옵션 ID를 가진 charactercustomization 검색
 */
const MODEL_ID_OVERRIDE = {
  95: [218, 219], // 고등 마법원 스카이본 [남, 여]
};
export const modelIdOf = (race, gender) => MODEL_ID_OVERRIDE[race]?.[gender] ?? race * 2 - 1 + gender;

/** 모델 데이터에 없는 옵션/선택값 제거 (뷰어 오류 방지) */
async function validOptions(modelId, options) {
  if (!options?.length) return [];
  try {
    const r = await fetch(`${window.CONTENT_PATH}meta/charactercustomization/${modelId}.json`);
    if (!r.ok) return [];
    const j = await r.json();
    const meta = j.data ?? j;
    return options.filter((o) => meta.Options?.some((p) => p.Id === o.optionId && p.Choices?.some((c) => c.Id === o.choiceId)));
  } catch {
    return [];
  }
}

/**
 * @param {string} selector  컨테이너 jQuery selector
 * @param {number} aspect    width / height
 * @param {{race:number, gender:0|1, options:{optionId:number, choiceId:number}[], items:[number, number][]}} m
 */
export async function renderForever(selector, aspect, m) {
  const modelId = modelIdOf(m.race, m.gender);
  const options = await validOptions(modelId, m.options);
  const base = {
    type: 2,
    contentPath: window.CONTENT_PATH,
    // eslint-disable-next-line no-undef
    container: jQuery(selector),
    aspect,
    dataEnv: "classic",
    env: "classic",
    gameDataEnv: "classic",
    hd: false,
    models: { id: modelId, type: CHARACTER },
    items: m.items,
  };
  const opts = options.length ? { ...base, charCustomization: { options } } : base;
  const viewer = await new WowModelViewer(opts);
  viewer.characterGender = m.gender;
  viewer.characterRace = m.race;
  viewer.modelId = modelId;
  viewer.droppedOptions = (m.options?.length ?? 0) - options.length;
  return viewer;
}
