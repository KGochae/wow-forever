# WoW Forever 전투정보실 — API 분석 & 설계

> ➡️ 재개 시: **24장(현재 상태 요약)**과 **25장(다음 단계 체크리스트)**부터 확인

> 출처: [WoW: Forever API: what works so far, plus a TS client](https://us.forums.blizzard.com/en/blizzard/t/wow-forever-api-what-works-so-far-plus-a-ts-client/60334) (비공식, 2026-11-05~06)
> 참고 프로젝트: `C:\Users\고채석\OneDrive\Desktop\AI\WEB_PROJECT`

## 결정 사항
- 프론트: **(A) WEB_PROJECT Vanilla JS 재사용**으로 데이터·3D 모델 먼저 검증 → 이후 Next.js 이관 검토
- 대상 길드: **같이와포하자**
- 샘플 캐릭터: **우왁굳(성) 파워도적(이름)** → slug `파워도적-우왁굳` (검증 필요)
- 지역: KR

---

## 1. API 분석

| 항목 | 기존 클래식 (WEB_PROJECT) | Forever |
|---|---|---|
| namespace | `profile-classicann-kr` | `profile-forever-kr` / `static-forever-kr` / `dynamic-forever-kr` |
| 서버 구분 | realm (`fengus-ferocity`) | **realm 없음** → `ruleset` (KR: 1, 2) |
| 캐릭터 | `/profile/wow/character/{realm}/{name}` | `/profile/wow/character/{name}-{surname}` (소문자) |
| 길드 | `/data/wow/guild/{realm}/{guild}/roster` | `/data/wow/guild/{guild-slug}/roster` (멤버에 `surname`, `slug` 포함) |
| 하위 API | equipment, statistics, appearance, specializations, pvp-summary, media | 동일 지원 (hunter-pets만 404) |
| 미지원 필드 | — | `active_spec`, `active_title` |
| 이미지 | avatar | `character-media`: `main-raw`(전신·투명), `main-sd-raw`, `avatar`, `avatar-sd` — 신규 캐릭터는 렌더까지 수 시간 |
| 제약 | — | 10레벨 이상 + 로그아웃 후에만 조회. static item 조회 약 43% 404 |
| 인증 | client_credentials | 동일 (기존 BLIZZARD_CLIENT_ID/SECRET 재사용) |

기타 엔드포인트
- `/data/wow/ruleset/index`, `/data/wow/ruleset/{id}` (dynamic)
- 경매장: `/data/wow/ruleset/{id}/auctions/` (**끝 슬래시 필수**), 하우스 110–121, 123–125
- 길드: `/data/wow/guild/{slug}`, `/roster`, `/activity`, `/achievements`

---

## 2. WEB_PROJECT 재사용 지도

| 기존 뼈대 | Forever 적용 | 수정량 |
|---|---|---|
| Worker `fetchCharacter()` (`_dev/worker/index.js:455`) | baseUrl → realm 없는 slug 경로, namespace → `profile-forever-kr` | 소 |
| `parseStats` / `parseSpecs` | 응답 shape 비교 후 그대로 | 소 |
| `parseEquipment` + `itemsEra.json` | 클래식 아이템 DB → Forever 아이템 ID 매칭 확인 필요 | **검증 필요** |
| Airflow `collect_guild_roster` → `collect_char_details` | roster 경로 변경, 멤버 `slug`로 캐릭터 조회 | 소 |
| `characters.json` 스냅샷 + Firebase Hosting | 동일 구조, 키를 `slug`로 | 소 |
| 프론트 (뷰어·랭킹·길드 대시보드) | 데이터 shape 맞추면 재사용 | 중 |

---

## 3. 3D 캐릭터 모델 검증

WEB_PROJECT 방식: `generateModels(aspect, '#model_3d', {race, gender, customizations, items:[[slot, displayId]]}, 'classic')` (`js/character.js:1200`)

| 테스트 | 내용 | 결과 |
|---|---|---|
| A | `appearance` API → race / gender / customizations | |
| B | 장착 아이템 ID → itemsEra `did`(displayId) 매칭률 | |
| C | zamimg `classic` 경로로 실제 렌더 | |

플랜 B: 3D 불가 시 `character-media`의 `main-raw` 전신 이미지(2D) 사용

---

## 4. 테스트 순서
1. 토큰 발급 + ruleset 목록 (연결 확인)
2. 샘플 캐릭터 프로필 (`파워도적-우왁굳`, 실패 시 역순)
3. 하위 API (equipment, appearance, statistics, specializations, character-media) shape 확인
4. 모델 재료 확인 (A, B)
5. 3D 렌더 테스트 HTML (C)
6. 길드 `같이와포하자` roster

테스트 도구: `_dev/api_test/bnet.mjs` (Node, WEB_PROJECT `.dev.vars`의 Blizzard 키만 읽음, 결과는 `_dev/api_test/out/`)

---

## 5. 테스트 결과 (2026-11-07)

### ⚠️ slug 순서 정정
- `{name}-{surname}` → 샘플은 **이름=우왁굳, 성=파워도적** → slug `우왁굳-파워도적` (`파워도적-우왁굳`은 404)
- 프로필에 `name_search: "우왁굳 파워도적"` 필드 있음 → 검색 입력은 "이름 성" 순서 기준

| # | 테스트 | 결과 |
|---|---|---|
| 1 | 토큰 + `/data/wow/ruleset/index` (dynamic-forever-kr) | ✅ 200, ruleset 1·2 |
| 2 | 캐릭터 프로필 `우왁굳-파워도적` | ✅ 200 (id 40100, 나이트엘프 남 도적, Lv19, ilvl 9, guild 링크 있음) |
| 3 | equipment / appearance / statistics / specializations / character-media / pvp-summary | ✅ 전부 200 |
| 6 | 길드 `같이와포하자` roster | ✅ 200, 길드 id 118001, 얼라이언스, **247명** (Lv20–39: 70, Lv20 미만: 177) |

### 응답 shape 메모
- 프로필: `realm` 없음 → `surname`, `ruleset`, `name_search`, `is_remix`
- statistics: retail 형태 키 (strength, agility, melee_crit, mastery, versatility …) → `parseStats` 매핑 확인 필요
- specializations: `specialization_groups[].specializations[]` (playable-specialization id 38 등)
- 길드 멤버: `character.{name, surname, slug, level, playable_class.id, playable_race.id}`, `rank`
- static namespace: `static-1.60.1_70399-forever-kr`

### 모델 재료
- **A (appearance)** ✅ race 4, MALE, customizations 8개 (Skin Color / Face / Hair Style / Hair Color / Eye Color / Ears / Eyebrows / Facial Hair, `display_order` 제공) → en_US locale로 받아 option 이름 매핑
- **B (displayId)** ⚠️ 장착 12개 중 itemsEra 매칭 **6/12**
  - 매칭 실패: 279897 허리, 279868 다리, 279867 반지, 271218 주무기, 271204 보조무기, 2947 투척
  - 옛 아이템: `static item → appearances → item-appearance.item_display_info_id` = itemsEra `displayId`와 **동일** (2575 → 10840 ✓) → displayId 체계 공유
  - **Forever 신규 아이템(27xxxx)**: static item API 404 (forever/retail 둘 다), `media/item`만 200 (아이콘 fileDataId만)
  - → 신규 아이템 displayId 출처 확보가 핵심 과제
- **C (렌더)**: 프록시 `meta/charactercustomization/7.json`(나엘 남) 200, 매칭 6개 armor meta 전부 200 → `_dev/model_test/` 브라우저 확인 대기
- character-media: `main-raw` 등 4종 정상 (`render.worldofwarcraft.com/forever-kr/...`)

- **C (렌더)** ✅ 사용자 브라우저 확인: 6개 매칭 아이템 + 커스터마이징으로 3D 모델 정상 렌더

### 신규 아이템 displayId — Wowhead `/forever/` XML
- `https://www.wowhead.com/forever/item={id}&xml` → `<icon displayId="…">` 로 displayId 확보 가능 (기본/classic/tbc/mop-classic 경로는 Item not found)

| item | 이름 | displayId | 모델 meta (proxy tbc / zamimg classic·live·tbc) |
|---|---|---|---|
| 279897 | Dusty Belt (허리) | 741406 | ❌ 404 |
| 279868 | Duty Bound Leggings (다리) | 6183 | ✅ 200 (기존 모델 재사용) |
| 271218 | Vileblood Scimitar (주무기) | 739777 | ❌ 404 |
| 271204 | Meathook Slicer (보조) | 752302 | ❌ 404 |
| 279867 | Slain Baron's Signet (반지) | 0 | 비표시 |
| 2947 | Small Throwing Knife (투척) | 16754 | 비표시 슬롯 |

- 결론: **displayId는 Wowhead forever로 확보 가능**. 단, Forever 전용 신규 모델(7xxxxx)은 zamimg 기존 env(classic/live/tbc/wrath/mists/cata/ptr/beta 등)에 없음
- Wowhead HTML 페이지는 Cloudflare 403 → 뷰어 env 직접 확인 불가 → 브라우저 DevTools로 확인 필요

### ✅ Wowhead Forever 뷰어 경로 = `modelviewer/classicplus/`
- 사용자가 DevTools로 확인: `https://wow.zamimg.com/modelviewer/classicplus/meta/item/752302.json`
- classicplus에 신규(752302, 739777, 741406) + 기존(6183, 11368, 23020) + 외형(charactercustomization/7) meta 전부 200
- 모델 `m2/146369.m2`, 텍스처 `textures/146374.webp` 200
- zamimg 직접 호출은 Origin 있으면 403 → **기존 Worker 프록시 그대로 사용** (`/modelviewer/classicplus/...` 패스스루 200, Worker 수정 불필요)
- 적용: `CONTENT_PATH = PROXY_HOST + '/modelviewer/classicplus/'`
- 테스트 페이지: `http://localhost:8080/` (classicplus, 10개 아이템) / `?env=tbc` (기존 경로 비교)

### displayId 확보 전략 (설계)
1. 옛 아이템: itemsEra.json `displayId` (또는 Blizzard `item-appearance.item_display_info_id`)
2. 신규 아이템: Wowhead `/forever/item={id}&xml` → `<icon displayId>` → Worker/R2에 캐시 (`forever_display.json`)
3. 둘 다 실패: 3D에서 생략 + 공식 render(main-raw) 병행 표시

- ✅ 사용자 확인: classicplus 경로로 신규 아이템 포함 전체 장비 3D 정상 렌더

---

## 6. UI 틀 (Next.js, 2026-11-07)
- 바닐라 대신 Next.js(App Router + Tailwind v4)로 WEB_PROJECT 캐릭터 뷰어 레이아웃 재현
- 백업: `backup/src_20261107_1337/`
- 데이터: `src/data/roster.json` (같이와포하자 247명), `src/data/sample-character.json` (우왁굳 파워도적)

| 영역 | 파일 |
|---|---|
| 상단 네비 (검색·탭·공지) | `src/components/layout/top-nav.tsx` |
| 필터 레일 (길드 등급 / 클래스 / 특성) | `src/components/guild/filter-rail.tsx` |
| 길드원 목록 | `src/components/guild/member-list.tsx` |
| 화면 조립 · 상태 | `src/components/guild/guild-viewer.tsx` |
| 캐릭터 헤더 (아바타·LV·배지·접속히트맵·Update) | `src/components/character/character-header.tsx` |
| 능력치 (타일·WEAPON·CORE STATS 바) | `src/components/character/stat-column.tsx` |
| 캐릭터 (ilvl·기어스코어·레이더·장비 슬롯·모델 영역) | `src/components/character/gear-column.tsx` |
| 특성 (Active/Secondary 탭, 트리 그리드 틀) | `src/components/character/talent-column.tsx` |

미연결(틀만): 3D 모델(현재 공식 render 이미지), 접속 히트맵, 기어스코어, 길드 비교 %, 특성 트리, 특성 필터(Forever API에 active_spec 없음), 길드 등급 이름(API는 숫자만)

### UI v2 — WEB_PROJECT 외관·동적요소 이식 (백업 `backup/src_20261107_1345_ui1/`)
- 폰트: Pretendard(본문) + Cinzel(로고/LV) — WEB_PROJECT index.html과 동일
- 토큰: `--bg #0a0b12`, `--bg3/4`, `--text1~3`, glass(blur 50px 패널), radial 배경 → `globals.css`
- 동적요소: 아이템 커서 툴팁(`common/item-tooltip.tsx`), 슬롯 hover scale+품질 glow, 스탯바 0→값 트랜지션(.65s), 카드 countUp, 레이더 radarIn, 사이드바 width 트랜지션·sidebarIn, 길드원 행 순차 등장, 캐릭터 전환 fadeSlideUp
- tsconfig `exclude`에 `backup`, `_dev` 추가 (백업: `backup/tsconfig.json.bak`)

### 능력치: 기본 수치 / 최종 수치
- statistics 응답에서 `{base, effective}` 분리 필드: strength, agility, intellect, stamina, spirit, armor, defense, 5종 저항
  - 샘플: 민첩 53→66, 체력 32→50, 지능 23→27, 정신력 27→34, 방어도 32→463, 방어숙련 88→89
- 그 외(치명타·회피·무기막기·적중 등)는 `{value, rating_bonus}` 단일값
- UI: CORE STATS에 `❯ 기본 수치 | 최종 수치` 토글, 최종 모드에서 기본 구간(밝게) + 증가분(+초록) 표시
- `sample-character.json` stats 구조를 `CharStats`(lib/wow.ts)로 재구성

### 특성(스킬) 데이터 — 트리 구성 가능
- 캐릭터 `specializations`: `specialization_groups[].specializations[]` → `specialization_name`, `spent_points`, `talents[]{talent.id, spell_tooltip.spell.id, description, talent_rank}` (찍은 특성만)
- 트리 정의 `static-forever`:
  - `/data/wow/talent-tree/index` → 직업 트리 9개 + 특성 트리 27개
  - `/data/wow/talent-tree/{treeId}/playable-specialization/{specId}` → `spec_talent_nodes[]{display_row(1~7), display_col(7~10 → 4열), ranks[](최대 랭크·랭크별 설명), locked_by, unlocks}` (전투 도적 1111/38: 19노드)
  - `/data/wow/talent/{id}` → 랭크별 설명
  - `/data/wow/media/spell/{spellId}` → 아이콘 (`render.worldofwarcraft.com/forever-kr/icons/56/{fdid}.jpg`)
- → 클래식식 4열×7행 트리 + 찍은 랭크/최대 랭크 + 아이콘 + 선행 화살표 모두 표현 가능

### ✅ 특성 트리 실데이터 연결
- 생성 스크립트: `_dev/api_test/build_talents.mjs <classTreeId> <classId>` → `src/data/talents/{classId}.json`
  - 도적(1111/4): 암살 17 · 전투 19 · 잠행 18 노드, 아이콘 전부 확보
  - 한국어 이름 null인 Forever 신규 특성 3개(Blood Splatter / Flash of Steel / Boot Knife) → 영문 대체 (`nameKoMissing`)
- 캐릭터 picks(`talentId → rank`)를 트리 노드에 매칭 (샘플 4개 전부 매칭)
- UI: 포인트 많은 트리 순, 랭크 배지(초록=일부/금색=최대), 미투자 회색, 선행 화살표, 랭크별 툴팁(현재/다음 레벨)
- 직업 트리 ID: 드루이드 1089, 성기사 1100, 도적 1111, 마법사 1112, 사제 1114, 흑마법사 1116, 전사 1117, 사냥꾼 1091, 주술사 1082

### 아이템 능력치 검증 (살덩이갈고리 분리검 271204)
- Blizzard equipment = Wowhead forever **완전 일치**: 공격력 17-32, 속도 1.80, DPS 13.61, 체력 +5, 요구 레벨 15, 내구도 45, 판매가 17실 5동
- 원인: 툴팁이 `stats`만 표시 → `weapon`, `armor`, `enchantments`, `binding`, `requirements`, `durability`, `sell_price` 누락
- 수정: sample equipment에 전체 필드 저장 + 게임 툴팁 순서로 표시
- equipment 항목 필드: weapon(3), armor(7), stats(8), enchantments(5, 예: "마법부여: 체력 +1 / 방어도 +8"), binding, requirements, durability, sell_price
- 참고: 능력치 패널 WEAPON의 OFF HAND(15.96~23.46, DPS 10.9)는 아이템 수치가 아니라 statistics의 캐릭터 실제 보조무기 피해(보조무기 페널티·전투력 반영)

---

## 7. 길드 전체 수집 (2026-11-07) — 백업 `backup/src_*_ui2/`
- 수집기: `_dev/api_test/collect_guild.mjs [guildSlug]` → `public/data/roster.json`, `public/data/characters.json`(약 1.5MB)
  - 캐릭터당 6요청(profile, equipment, statistics, specializations, character-media, appearance), 동시 8, 429/5xx 재시도
  - 아이템 아이콘/displayId: itemsEra → Wowhead forever XML (캐시 `_dev/api_test/out/item_cache.json`)
- 결과: **247명 중 228명 성공**, 하위 API 누락 0, 고유 아이템 719종(era 548 / wowhead 171) 아이콘 100%
  - 404 19명 (Lv 9~25 다양 → 로그아웃 반영 지연 추정, `out/collect_fail.json`) → 목록에 "데이터 없음" 표시
- 특성 트리 9직업 27트리 전부 생성 → `public/data/talents/{classId}.json` (직업 선택 시 지연 로드)
- 데이터는 번들 import 대신 런타임 fetch (`src/lib/use-guild-data.ts`)

### 능력치 페이지 넘기기 + 직업 색상
- `src/lib/stats-config.ts`: WEB_PROJECT `CLASS_KEY_STATS`를 Forever 키로 매핑 (healing_power→spell_healing, spell_dmg 없음)
- 6페이지: 핵심(직업별) / 주 능력치(기본·최종) / 근접·원거리 / 주문 / 방어 / 저항(기본·최종)
- 넘기기: ‹ › 버튼, 페이지 칩, 스와이프(드래그 40px), ←/→ 키, 가로 슬라이드 + 높이 트랜지션
- 길드 비교(`src/lib/guild-stats.ts`): 같은 직업 내 최고치 대비 막대, 흰 마커 = 직업 평균, "상위 N%"
- 직업 색상: WEB_PROJECT `CLASS_COLOR` (전사 #c69b3a, 사제 #c2d6e8, 주술사 #2090e0 …) → 핵심 페이지 막대·칩·레이더

---

## 8. 배포·최적화 계획 (예상 3,000명/일, Vercel) — 결정 대기

### 0) 외부 API 제한
| 대상 | 제한 | 우리 사용량 | 판단 |
|---|---|---|---|
| Blizzard API | 시간당 36,000 / 초당 100 (클라이언트 키 기준, 커뮤니티 문서) | 1회 수집 ≈ 1,500 요청 → 시간당 4% | 여유. 증분 수집 시 ~300–500 |
| Wowhead XML | 공식 API 아님 (비공식 스크래핑) | 신규 아이템만, 누적 171건 | 캐시·저빈도·서버 전용 |
| Vercel Hobby Cron | **하루 1회만** (시간당 불가), 1시간 내 오차 | — | 시간당 자동화 불가 |
| Vercel Pro Cron | 분 단위 가능, $20/월/인 | — | 가능 |
| Vercel Function | Hobby 최대 300초, Pro 800초 | 수집 ≈ 1–2분 추정 | 충분 |
| Vercel Blob Hobby | 저장 1GB, 읽기 1만/월, 쓰기 2천/월, 전송 10GB, 초과 시 30일 차단 | — | 클라이언트 직접 서빙엔 위험 |
| Cloudflare Workers Free | 10만 요청/일, 호출당 서브요청 50 | WEB_PROJECT와 공유 | 3D 프록시가 핵심 변수 |

### 1) 데이터 경량화 (방문자 부담)
- 현재: 첫 화면에 characters.json 1.5MB 전체 로드 → 분할
  - `index.json`: 길드원 목록 + 아바타 + 직업/레벨/ilvl (수십 KB)
  - `stats.json`: 직업별 집계(최고·평균·백분위 구간) 사전 계산 → 클라이언트 계산 제거
  - `chars/{slug}.json`: 클릭 시 1명분(~7KB)만 로드
  - `talents/{classId}.json`: 현행 유지 (정적, 장기 캐시)
- CDN 캐시 헤더: 데이터 `s-maxage=3600, stale-while-revalidate`, 아이콘/트리 `immutable`

### 2) 수집 자동화 (시간당)
- 증분 수집: roster + profile(1요청/인) → `last_login_timestamp` 변한 캐릭터만 하위 5개 재조회
- 정적 데이터(특성 트리·아이템 캐시)는 static namespace 버전(`1.60.1_70399`) 바뀔 때만 갱신
- 실행 위치 후보
  - A. **GitHub Actions 시간당 스케줄 → Cloudflare R2 업로드** (무료, 기존 R2 재사용, 이그레스 무료) — 추천
  - B. Vercel Pro Cron → Function → Vercel Blob/R2 (Vercel 안에서 완결, $20/월)
  - C. Vercel Hobby + 외부 크론(cron-job.org 등)이 API 라우트 호출 (무료, 300초 내, 외부 의존)
  - (참고) Workers Cron은 무료 플랜 서브요청 50개 제한으로 부적합

### 3) Wowhead 사용 원칙
- 아이콘은 Blizzard 공식 `media/item/{id}`로 전환 (신규 아이템도 200 확인) → Wowhead는 **displayId 전용**
- 영구 캐시(item_cache.json, R2) — displayId는 불변 → 아이템당 평생 1회 조회
- 수집 서버에서만 호출, 초당 1회 이하, 429/403 시 백오프·다음 회차로 미룸, 실패 시 3D에서 해당 슬롯 생략
- 브라우저에서 Wowhead 직접 호출 금지

### 4) 3D 모델
- 기존 방식 유지: zamimg `classicplus` ← Cloudflare Worker 프록시 + R2 캐시 (Worker 수정 불필요, ALLOWED_ORIGINS에 Vercel 도메인만 추가)
- 부하 절감: 기본은 Blizzard 공식 렌더(2D PNG) 표시, **"3D 보기" 클릭 시 로드** (또는 뷰포트 진입 후 지연 로드)
- Worker 응답 `Cache-Control: immutable` 장기 캐시 → 재방문·같은 장비 재사용 시 요청 0
- appearance/displayId는 수집 스냅샷에 포함 → 클라이언트 추가 API 호출 없음
- Workers 무료 10만/일 초과 우려 시 Workers Paid($5/월, 1,000만 요청) — 렌더 1회당 요청 수 실측 후 결정

---

## 9. 3D 아바타 연결 (Next.js)
- 로더: `public/lib/wow-model-viewer/forever.js` (WEB_PROJECT lib 복사 + 전용 진입점)
  - WEB_PROJECT는 외형을 "옵션 이름 + display_order"로 추측 → Forever는 appearance API의 **optionId/choiceId를 그대로** 전달
  - 나엘 남 샘플: 옵션 8개 ID·선택값 classicplus meta와 100% 일치 확인
- 경로: 브라우저 `/mv/classicplus/*` → `next.config.ts` rewrites → Cloudflare Worker → zamimg
  - Worker CORS 허용 목록에 localhost:3000/Vercel 도메인이 없어도 동작 (같은 도메인 요청), WEB_PROJECT Worker 무수정
  - 배포 시 고려: rewrite 트래픽은 Vercel 대역폭 사용 → 대안은 Worker ALLOWED_ORIGINS에 Vercel 도메인 추가 후 직접 호출
- 컴포넌트: `src/components/character/model-viewer.tsx`
  - jQuery + zamimg viewer.min.js(810d077) 1회 로드, 가슴 로브 슬롯(5→20) 판별, Stand 애니메이션
  - 3D/2D 토글, 실패 시 공식 렌더(2D) 자동 대체, 캐릭터 전환 시 WebGL 컨텍스트 해제

## 10. 능력치 UI 수정
- 넘김 버튼(‹ ›, 1/6) 제거 → 탭 칩으로만 이동 (스와이프·←/→ 키는 유지)
- 기본/최종 토글을 **모든 탭에 고정** — 구분 있는 항목은 기본값으로 전환, 구분 없는 항목(치명타·회피 등)은 흐리게

## 11. 길드원 능력치 비교 제거 (사용자 요청) — 백업 `backup/src_*_nocompare/`
- 제거: 상위 N% (카드·능력치 줄·아이템 레벨), 직업 평균 마커, 직업 최고치 대비 막대, 레이더의 길드 기준
- 능력치 줄: 색 점 · 이름 · 값 · 증가분(+, 최종 모드) — 막대 없음
- 레이더: 캐릭터 자신의 5개 스탯 중 최댓값 기준 분포로 변경
- `src/lib/guild-stats.ts`는 남겨둠(현재 미사용) — 추후 비교 기능 재도입 시 사용
- (수정) 막대그래프 복원 — 길드 비교 없이 **같은 탭 안 단위 그룹별 최댓값** 기준 (pct / dps / 생명력·자원·방어도 / 일반 수치)
  - 최종 모드: 기본 구간(직업색) + 장비·버프 증가 구간(초록), 감소(디버프)는 빨간 −
  - 기본 모드: 같은 스케일에서 기본 구간만 (증감 숫자 표시 없음)
  - 구분 없는 항목 흐림 처리 제거
- 데이터 검증: 228명 중 최종 ≥ 기본이 정상 (예: 민첩 129명 증가 / 93명 동일 / 6명 감소 — 디버프·변신 추정)

### 다음 과제
1. 배포 방식 결정 (8장) 후 데이터 분할 + 수집기 증분화
2. 길드원 클릭 시 Worker 경유 실시간 조회 (현재 샘플 1명만 상세)
2. 신규 아이템 displayId 출처 조사 (wowhead / 아이콘 기반 근사 / 미표시 처리)
3. `parseStats` / `parseSpecs` Forever 응답 대응

## 12. 반응형 탭바 · 특성 패널 · 스카이본 — 백업 `backup/src_*_navtalent/`
- 상단 탭바: 전체 `nowrap`(세로 줄바꿈 방지), 탭 영역 가로 스크롤(스크롤바 숨김), 좁은 화면에서 로고·검색창·탭 글자/여백 축소, 공지사항은 lg 미만 아이콘만
- 특성 패널: 3개 트리를 세로로 나열 → **특성 탭(이름 + 투자 포인트)으로 1개씩 표시**, 기본 = 포인트 최다 트리, 셀 46→42px·행간 14→10px → 패널 높이 고정(스크롤 없음)
- 종족 95 = "스카이본" (API 이름 "고등 마법원 스카이본"), 수집 228명 중 58명 / classicplus 외형 meta(189·190) 존재 확인
- 수집 데이터 종족: 인간 56 · 드워프 43 · 나이트엘프 15 · 노움 56 · 스카이본 58

## 13. 스카이본 3D 미표시 — 원인·수정
- 원인: 뷰어 모델 번호 공식 `race*2-1+gender`는 옛 종족 전용 → 스카이본(95)은 189/190 = **드루이드 곰/표범 변신 모델**(옵션 Bear Form/Cat Form)
- 실제 번호: `_dev/api_test/find_cc.mjs`로 appearance 옵션 ID(9020/9033)를 가진 charactercustomization 검색 → **남 218 / 여 219**
- 검증(수집 228명 전원): 인간·드워프·나엘·노움 남녀 옵션/선택값 100% 일치, 스카이본 옵션 1033/1040 · 선택값 일치 옵션 기준 1031/1033
- 수정: `public/lib/wow-model-viewer/forever.js` — `MODEL_ID_OVERRIDE {95: [218, 219]}` + 모델 meta에 없는 옵션/선택값 자동 제거
- 확인 방법: F12 콘솔 `[3D]` 로그 (race → model 번호 · 외형 옵션 일치 수 · 장비). `?debug=1` 화면 표시는 15장에서 제거
- 신규 종족 추가 시: find_cc.mjs <시작> <끝> <옵션ID…> 로 번호 찾고 MODEL_ID_OVERRIDE에 추가

## 14. 특성 패널 원복 + 내부 스크롤
- 특성 패널을 12장 이전 버전(Active/Secondary 탭, 3개 트리 세로 나열, 46px 셀)으로 원복 — 탭 버전은 `backup/talent-column.tabs.tsx`에 보관
- 길이 제한: 2xl(3열)에선 특성 열을 `absolute inset-0`으로 옆 열(능력치·캐릭터) 높이에 맞춤, 그보다 좁으면(아래로 내려갈 때) 고정 620px
- 트리 목록만 내부 스크롤(`.talent-scroll`, 6px 바 표시), 탭 헤더는 고정

## 15. 모델 영역 2D 우선 + 꽉 차게
- 기본 표시 2D(공식 렌더), 3D는 버튼으로 (부하 절감 계획과도 일치) — 버튼 순서 2D | 3D
- 공식 렌더 main-raw: 1600×1200 가로, 캐릭터는 높이 38~56%·폭 12~28%만 차지 → contain이면 작게 보임
- `src/components/character/fitted-render.tsx`: 렌더 서버 CORS `*` → canvas(1/8 축소)로 알파 바운딩박스 측정 → 캐릭터 높이가 영역의 88% 되도록 확대·가운데 정렬(넓은 무기는 폭 92% 제한), 측정 결과 캐시
- 모델 영역의 디버그 정보 줄(?debug=1)과 배경 그라데이션 제거 (콘솔 `[3D]` 로그만 유지)
- 백업: `backup/model-viewer.before-2dfit.tsx`

## 16. 특성 배경 + 대표 특성 사이드바 반영 — 백업 `backup/src_*_specbg/`
- 특성 배경: WEB_PROJECT `images/talent_background_tbc/{class}_{treeId}.jpg` 27장 → `public/images/talent_bg/` (820KB)
  - Forever 특성 이름 = WEB_PROJECT 한국어 트리 이름 그대로 매핑 (`specBg(classId, specName)` in `src/lib/wow.ts`)
  - 모델 영역: 대표 특성 배경 + `linear-gradient(rgba(0,0,0,.45), rgba(0,0,0,.72))`
  - 특성 트리: 트리별 배경 + `rgba(0,0,0,.75)` 오버레이 (WEB_PROJECT와 동일)
- 대표 특성 = 포인트 최다 트리 (`topSpec`), 0포인트(Lv10 미만 등) = "특성 없음" — 수집 228명 중 25명
- 사이드바: 이름 아래 "대표 특성(직업색) · 종족", 특성 필터 활성화(클래스 선택 시 해당 직업 3특성 + 없음), 헤더 특성 배지도 동일 기준
- (수정) 사이드바 목록에서 종족 제거 → 이름 아래 대표 특성만
- (수정) 특성 필터: 클래스 미선택 시 칸 자체 숨김, 클래스 선택 시 해당 클래스 특성(전체 / 3특성 / 없음)이 슬라이드 등장
- (수정) 가운데 캐릭터(장비·모델) 열 축소: 비율 3fr → 2.3fr, 최소폭 420 → 380px (3열: 2 : 2.3 : 2, 특성 열 최소 280 → 300px) — 백업 `backup/guild-viewer.before-narrow.tsx`

## 17. 랜딩(첫 검색 화면) + 데이터 경량화 — 백업 `backup/src_*_landing/`
### 랜딩 `/` (WEB_PROJECT #page-landing)
- outland 배경(`public/background/outland.avif`) + 좌→우/상→하 어둡게 + 블러, 상단 네비(캐릭터 뷰어 / 나머지 준비 중), WOW.FOREVER 태그 + 길드명 + GUILD ARMORY
- 검색: `src/components/common/character-search.tsx` (랜딩·상단바 공용) — "이름 성" / slug / 이름만 / 부분 일치 후보 드롭다운(↑↓·Enter), 없으면 "해당 유저가 없습니다"
- 검색/클릭 → `/viewer?c={slug}` (공유 가능한 주소), 로고 클릭 → `/`

### 데이터 분할
| 파일 | 용도 | 크기 |
|---|---|---|
| `public/data/index.json` | 사이드바·검색 (247명: 이름·성·slug·레벨·직업·등급·아바타·대표특성·데이터유무) | 58KB (gzip 10KB) |
| `public/data/chars/{id}.json` | 캐릭터 상세 — 클릭·검색한 1명만 | 평균 6.2KB |
| `public/data/talents/{classId}.json` | 특성 트리 — 해당 직업일 때만 | 직업당 ~40KB |
- 이전: characters.json 1.5MB(gzip 184KB) 통째 로드 → 첫 화면 **약 18배 감소**
- 생성: `_dev/api_test/split_data.mjs` (collect_guild.mjs가 수집 후 자동 호출), 원본 통합본은 `_dev/api_test/out/raw/`
- 프론트: `src/lib/use-guild-data.ts` — `useGuildIndex`(1회 요청·공유), `useCharacter(id)`(1명·메모리 캐시), `searchMembers`
- `.gitignore`에 `/_dev/api_test/out/`(토큰·원본·캐시), `/backup/` 추가
- (수정) 랜딩 배경 → `WALLPAPER2.webp` (`public/background/wallpaper2.webp`, 125KB) — 밝은 이미지라 좌측 어둡게 대신 가운데(타이틀·검색) 원형 어둡게 + 위아래 그라데이션, 블러 2→1px. outland.avif는 public에서 제거(원본은 WEB_PROJECT), 이전 랜딩은 `backup/landing.outland.tsx`
- (수정) 화질 문제로 `FOREVER_WALLPAPER.webp`(`public/background/forever.webp`)로 교체 — 단, 두 이미지 모두 1080×607이라 전체화면 확대 시 흐릿함 → 블러 2px·어둡게로 완화, 1920px 이상 원본 확보 시 교체 권장
- (수정) 랜딩 배경 → `zephras-isle-in-the-clouds-1440p.jpg`(2560×1440, `public/background/zephras.jpg`) — 고해상도라 블러 제거, 가운데 어둡게 소폭 강화. 교체 방법: 같은 이름으로 덮어쓰기 또는 `src/components/landing/landing.tsx` 배경 url 변경
- (수정) 사이드바 대표 특성 글자색: 직업색 → 회색(text-tx2, 특성 없음은 text-tx3) / 메인 캐릭터 카드 최대폭 1320 → 1180px (백업 `backup/guild-viewer.before-1180.tsx`)

## 18. 사이드바 열기 끊김 개선 (1·3·4번 적용) — 백업 `backup/src_*_sidebarperf/`
- 원인 분석: ① 열 때마다 247행·아바타 228장 재생성 ② 행별 등장 애니메이션 동시 실행 ③ width 애니메이션 → 메인 3열 매 프레임 재배치 ④ 패널 backdrop blur(50px) 매 프레임 재계산 ⑤ 2D 맞춤 ResizeObserver 매 프레임 재렌더
- 적용
  - ① 접어도 목록 언마운트 안 함(숨김만), 내부 고정 330px 폭, 아바타 `loading="lazy" decoding="async"`
  - ③ width 트랜지션 제거 → 폭은 1회 전환, 보이는 효과는 opacity·transform(GPU)만, 메인에 `contain: layout paint`
  - ④ `.glass-panel` blur(50px) → `rgba(9,10,15,.86)` 단색, `.glass-subtle` blur(6px) 제거 (상단바 blur는 정적이라 유지)
- 미적용(보류): ② 행 등장 애니메이션 상위 20개 제한, ⑤ 2D 맞춤 CSS화/리사이즈 종료 후 1회 계산
- (수정) 캐릭터 헤더 이름: "이름 성"을 한 덩어리로 29px·흰색(text-tx1) 동일 표시 — 백업 `backup/character-header.before-fullname.tsx`

## 19. 배포 결정 (2026-11-07)
- 자동 수집: **A안** — GitHub Actions(매시간) → Cloudflare R2
- GitHub 저장소: **공개** (Actions 무제한, 블리자드·R2 키는 GitHub Secrets)
- 데이터 저장: R2 새 버킷 `wow-forever-data` (index.json · chars/ · talents/ · state/)
- 데이터 제공: **기존 Cloudflare Worker 방식** (`/forever/data/*` → R2), 도메인 없음
- 추가 요구: 캐릭터 **Update 버튼 → 실시간 갱신** (WEB_PROJECT `/blizzard/character/:name`과 같은 방식)
- (수정) 능력치 하단 설명: 한 줄 → 기본 수치 / 최종 수치 2줄 범례(색 막대 + 설명), 현재 모드만 밝게 — 백업 `backup/stat-column.before-legend.tsx`

## 20. 수집 코드 정리 (배포용 수집기 `collector/`)
- 구조
  | 파일 | 역할 | 공유 |
  |---|---|---|
  | `collector/collect.mjs` | 매시간 수집 진입점 (`npm run collect`) | — |
  | `collector/lib/bnet.mjs` | Blizzard 클라이언트 (토큰 캐시·동시 8·429/5xx 재시도·요청 집계, 전역 fetch만) | Worker 재사용 |
  | `collector/lib/transform.mjs` | 응답 → 사이트 형식 (flatStats·장비·특성·외형·index 항목·static 버전) | Worker 재사용 |
  | `collector/lib/items.mjs` | 아이콘·displayId 영구 캐시 (공식 API 우선, Wowhead는 신규 아이템 displayId만·1초 간격·403/429 시 중단) | — |
  | `collector/lib/talents.mjs` | 특성 트리 (static 버전 바뀔 때만, 병렬 조회) | — |
  | `collector/lib/storage.mjs` | local(public/data) / r2(S3 API, aws4fetch) | — |
  | `collector/seed/items.json` | 첫 실행용 아이템 캐시 시드 719개 (59KB) | — |
- WEB_PROJECT 의존 제거: 키 = 환경변수(`.env.local`, 예시 `.env.example`), itemsEra 5MB 파일 대신 공식 API + 시드 캐시
- 증분 수집: roster + 프로필 → `last_login_timestamp` 바뀐 캐릭터만 하위 5종 / 상태는 `state/meta.json`, `state/items.json`
- 실측
  | 실행 | 결과 |
  |---|---|
  | 증분 (평소) | 250명 중 변경 17명 · **Blizzard 350요청 · 19초** |
  | 전체 (FORCE=1, 첫 배포) | 231명 + 특성 트리 · 1,943요청 · 특성 트리 177초 → 병렬화 후 **23초** (결과 동일) |
- 데이터 형식: 기존과 동일 (디버그용 `missing` 필드만 제외)
- `.gitignore`에 `/public/data/` 추가 (운영 데이터는 R2, 로컬은 `npm run collect`로 생성)
- 기존 `_dev/api_test/collect_guild.mjs`·`split_data.mjs`는 테스트용으로 남김 (운영 미사용)
- (수정) 뷰어 상단바: glass(블러 배경) → 랜딩 상단과 같은 투명 그라데이션(from-black/60) + 얇은 하단선, 상단 검색창·검색 버튼도 랜딩과 같은 반투명 스타일 — 백업 `backup/top-nav.before-transparent.tsx`, `backup/character-search.before-transparent.tsx`
- (수정) 능력치 패널 하단 Resistances(저항 5칸) 제거 — '저항' 탭과 중복. 백업 `backup/stat-column.before-noresist.tsx`

## 21. 새 Worker `wow-forever` + 사이트 연결 (로컬 검증까지, 미배포)
- 위치: `worker/` (`wrangler.toml`, `src/index.mjs`) — `collector/lib/bnet.mjs`·`transform.mjs` 재사용, WEB_PROJECT `wow-proxy` 무수정
- 엔드포인트
  | 경로 | 동작 |
  |---|---|
  | `GET /forever/data/{key}` | R2 `wow-forever-data` 제공, `state/` 차단(404), ETag/304, Cache-Control(데이터 1시간 CDN) |
  | `POST /forever/refresh?c={slug}` | 길드원만 허용 → Blizzard 6요청 → chars·index·state 갱신 → 캐릭터 JSON 반환. 캐릭터당 10분 쿨다운, IP당 시간 20회 (KV `RATE`) |
  | `GET /mv/{env}/...` | 3D 프록시: R2 `wow-model-cache`(기존 버킷, 같은 키 규칙 `modelviewer/...`) → 엣지 캐시 → zamimg, 1주 immutable 캐시 |
- 바인딩: DATA(R2 wow-forever-data, 신규) · MODEL_CACHE(R2 wow-model-cache, 기존) · RATE(KV, 배포 시 생성 후 id 기입)
- 로컬 검증 (`cd worker && npx wrangler dev --local --port 8787`)
  - 데이터 200 · state 404 · CORS(localhost:3000) · 3D meta 200
  - refresh: 우왁굳 갱신 OK(Blizzard 6요청, 아이콘 12/12, displayId 11/12), 재요청 → cooldown 599초, 비길드원 → 거절, R2 반영 확인
- 사이트 연결: `src/lib/config.ts` — `NEXT_PUBLIC_API_BASE`(Update) · `NEXT_PUBLIC_DATA_BASE`(기본 /data) · `NEXT_PUBLIC_MODEL_BASE`(기본 /mv)
- Update 버튼 `src/components/character/update-button.tsx`: 갱신 중/완료/쿨다운 카운트다운/오류 표시, "N분 전 갱신", 성공 시 화면 즉시 반영(메모리 캐시 + 구독), API 주소 없으면 비활성
- `.gitignore`: `/worker/.dev.vars`, `/worker/.wrangler/` / 예시: `.env.example`

## 22. GitHub Actions 매시간 수집 (`.github/workflows/collect.yml`) — 파일만, 미적용
- 실행: Worker Cron Trigger(`58 * * * *`, `worker/wrangler.toml`)가 `workflow_dispatch` 호출 + 수동 실행(Run workflow, `force` 옵션)
  - 변경 이유 (2026-11-08): GitHub `schedule` 이벤트가 설정 정상인데도 예약 시각 3회 모두 실행 기록 0건 → 외부 트리거로 전환, `schedule`·keepalive 제거
  - Worker 시크릿 `GH_DISPATCH_TOKEN`: `KGochae/wow-forever` 저장소 Actions 쓰기 전용 fine-grained PAT. 만료되면 수집이 멈추므로 갱신 필요
  - 실패 확인: Cloudflare 대시보드 → Workers → wow-forever → Cron 이벤트
- 수집기만 체크아웃(sparse) → `npm ci --prefix collector` (전용 `collector/package.json`, 의존성 aws4fetch 1개) → `STORAGE=r2 node collect.mjs`
- 실행 로그를 Actions 요약(Step Summary)에 표시, 동시 실행 방지(`concurrency: collect`), 제한시간 15분
- Secrets: `BLIZZARD_CLIENT_ID`, `BLIZZARD_CLIENT_SECRET`, `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY` / Variables(선택): `GUILD_SLUG`, `REGION`, `R2_BUCKET`
- 공개 저장소 주의: Actions 로그는 공개 → 수집기는 키·토큰을 출력하지 않음 (Secrets는 GitHub가 로그에서 자동 마스킹)
- 알려진 경합: 수집(약 20초) 중 Update 버튼이 같은 캐릭터를 갱신하면 index 항목이 수집 결과로 덮일 수 있음 → 데이터 차이는 거의 없고 다음 회차에 정정

## 23. Cloudflare 배포 완료 (2026-11-07)
- 계정: male960203@gmail.com (Account 5fc80dc4…), Worker 주소 **https://wow-forever.wowak.workers.dev**
- 생성: R2 `wow-forever-data`, KV `RATE`(9eea620a…), Worker `wow-forever` / 시크릿: BLIZZARD_CLIENT_ID·SECRET, INGEST_TOKEN
- 기존 리소스 무수정: Worker `wow-proxy`, KV `AI_RATELIMIT` / 공유: R2 `wow-model-cache`(3D, classicplus 경로) — 실서버에서 `X-Source: r2` 캐시 적중 확인
- **업로드 방식 변경**: R2 S3 키(대시보드 수동 발급 필요) 대신 Worker `/forever/ingest/{key}` + `INGEST_TOKEN`(32바이트 랜덤, 상수시간 비교, 허용 키 패턴 화이트리스트) → `STORAGE=worker`
  - 무인증 PUT 401 · 잘못된 토큰 401 · 외부 state 읽기 404 확인
- 첫 전체 수집(FORCE): 232명 + 특성 트리 9직업, Blizzard 1,956요청 → 업로드 순차라 250초 → **동시 8개 업로드로 변경**
- 실서버 증분 수집: 변경 6명, Blizzard 289요청, 26초 / 실서버 Update: 6요청, 재요청 시 쿨다운 595초
- GitHub Actions: Secrets = `BLIZZARD_CLIENT_ID`, `BLIZZARD_CLIENT_SECRET`, `INGEST_TOKEN` (R2 키 불필요), Variables(선택) `WORKER_URL`
- 로컬 `.env.local`·`worker/.dev.vars`에 INGEST_TOKEN 저장 (git 제외)

---

## 24. 📌 현재 상태 요약 (2026-11-07 기준, 다음 작업 재개용)

### 완료
| 영역 | 상태 | 주요 위치 |
|---|---|---|
| API 분석·검증 | Forever 프로필·장비·능력치·특성·외형·이미지·길드 roster 전부 확인 | 1~5장 |
| 3D 모델 | zamimg `classicplus` + Blizzard 외형 ID 직접 매핑, 스카이본(95→218/219) 대응, 기본 2D(꽉 차게)·3D 전환 | 9·13·15장, `src/components/character/model-viewer.tsx`, `public/lib/wow-model-viewer/forever.js` |
| 사이트 UI (Next.js) | 랜딩(검색·자동완성, zephras 배경) + 뷰어(사이드바 필터·대표 특성, 능력치 탭·기본/최종, 장비·툴팁, 특성 트리·특성 배경, Update 버튼) | 6~18장, `src/` |
| 데이터 경량화 | index.json(10KB gzip) + chars/{id}.json(~6KB, 클릭 시만) + talents/{cls}.json | 17장 |
| 수집기 | `collector/` — 증분 수집(바뀐 사람만), 공식 API 우선·Wowhead는 신규 displayId만, static 버전 바뀔 때만 특성 트리, local/worker/r2 저장 | 20장 |
| Worker | `worker/` → **https://wow-forever.wowak.workers.dev** 배포 완료 (데이터 제공 · Update(refresh) · 3D 프록시 · 수집기 업로드 ingest) | 21·23장 |
| Cloudflare | R2 `wow-forever-data`, KV `RATE`, 시크릿 3개 / 첫 전체 수집 업로드 완료(232명) | 23장 |
| GitHub Actions | `.github/workflows/collect.yml` (STORAGE=worker) — Worker Cron Trigger가 매시 58분 호출 | 22·23장 |

### 지금 운영 데이터 상태
- R2에 최신 데이터 있음 (마지막 수집: 로컬에서 수동 실행) → **GitHub Actions 연결 전까지 자동 갱신 안 됨**
- 수동 갱신: 프로젝트 폴더에서 `STORAGE=worker npm run collect` (전원: `FORCE=1` 추가)

### 비밀값 위치 (모두 git 제외)
- `.env.local` : BLIZZARD_CLIENT_ID/SECRET, WORKER_URL, INGEST_TOKEN, NEXT_PUBLIC_API_BASE(로컬 8787)
- `worker/.dev.vars` : 로컬 Worker용 같은 값
- Cloudflare Worker 시크릿: BLIZZARD_CLIENT_ID/SECRET, INGEST_TOKEN (등록 완료), GH_DISPATCH_TOKEN (예약 수집용)

### 로컬 실행 방법
- 사이트: `npm run dev` → http://localhost:3000
- 로컬 Worker(선택, Update 버튼 테스트): `cd worker && npx wrangler dev --local --port 8787`
- 로컬 데이터 수집: `npm run collect` (public/data)

---

## 25. ⏭️ 다음 단계 (남은 배포 작업)

### A. git 저장소 + 비밀값 점검 (Claude 진행 가능)
- [x] `git init -b main`, 첫 커밋 전 비밀값 스캔 — `.env.local`의 실제 값 3개(CLIENT_ID·SECRET·INGEST_TOKEN)가 커밋 대상 82개 파일에 없음 확인 (2026-11-08)
  - `.gitignore` 보강: `node_modules/`(전역, `worker/node_modules` 포함), `/_dev/`, `/.claude/`, `*.tsbuildinfo`, `.dev.vars`, `.token`
- [x] 큰 원본 이미지: 루트 3개(`FOREVER_WALLPAPER.webp`, `WALLPAPER2.webp`, `zephras-*.jpg`)는 삭제하지 않고 커밋 제외 (`.gitignore`)
- [x] 안 쓰는 코드(`sidebar.tsx`, `header.tsx`, `spotlight-card.tsx`, `guild-stats.ts`)는 유지·커밋, `_dev/`·`backup/`은 커밋 제외
- [x] `next build` 성공 (Next 16.2.9, `/`·`/viewer` 정적 생성)

### B. GitHub 공개 저장소 (사용자 결정 필요)
- [x] 저장소: **https://github.com/KGochae/wow-forever** (공개, 브랜치 `main`) — 2026-11-08
- [x] 방법 ①: GitHub CLI 2.103.3 설치(`C:\Program Files\GitHub CLI\gh.exe`, 계정 KGochae, scope repo·workflow)
  - 커밋 작성자(이 저장소만): `KGochae <86241587+KGochae@users.noreply.github.com>` — 실제 이메일 비공개
- [x] Secrets 등록: `BLIZZARD_CLIENT_ID`, `BLIZZARD_CLIENT_SECRET`, `INGEST_TOKEN`
- [x] `collect` 수동 실행 1회 성공 (run 42454899820): 길드원 266명 · 변경 190명 · Blizzard 1,801요청 · 313초 → 운영 index.json `collectedAt` 갱신 확인. 이후 Worker Cron으로 매시 58분 자동

### C. Vercel 배포 (사용자 계정 필요)
- [x] Vercel CLI 65.12.1로 배포 (계정 `male960203-1260`, 팀 `chaechae`, 프로젝트 `wow-forever`) — 2026-11-08
  - 운영 주소: **https://wafo-haja.vercel.app** (프로젝트 도메인으로 추가) / 기존 별칭 `wow-forever-bay.vercel.app`, `wow-forever-chaechae.vercel.app`도 유지
  - 업로드 제외: `.vercelignore` (.env*.local·worker·collector·backup·_dev·원본 이미지)
  - ⚠️ GitHub 자동 배포 미연결: `vercel git connect` 실패 (KGochae 계정에 Vercel GitHub 앱 미설치) → 코드 변경 시 `npx vercel deploy --prod` 수동 배포
  - `vercel link`가 `.env.local` 끝에 `VERCEL_OIDC_TOKEN` 추가, `.gitignore`에 `.vercel` 추가
- [x] 환경변수 3개 (Production·Preview)
  - `NEXT_PUBLIC_API_BASE=https://wow-forever.wowak.workers.dev`
  - `NEXT_PUBLIC_DATA_BASE=https://wow-forever.wowak.workers.dev/forever/data`
  - `NEXT_PUBLIC_MODEL_BASE=https://wow-forever.wowak.workers.dev/mv`
- [x] 배포 후 Vercel 주소 확인

### D. 마무리 (Claude 진행 가능)
- [x] Worker `ALLOWED_ORIGINS` = `wafo-haja` · `wow-forever-bay` · `wow-forever-chaechae` (.vercel.app) + `http://localhost:3000` → `wrangler deploy` (사용자 실행, Version 5d1d4871) — 백업 `backup/wrangler.before-vercel.toml`
- [x] `next.config.ts`의 `/mv` rewrite는 로컬 전용으로 유지 (운영은 MODEL_BASE로 Worker 직접)
- [~] 실서버 점검 (curl): `/`·`/viewer` 200, 번들에 Worker 주소 포함, index/chars/talents 200 + CORS 허용(wafo-haja), state 404, refresh 프리플라이트 204, 3D meta 200(X-Source r2)
  - 남은 것: 브라우저에서 직접 검색 → 뷰어 → 3D → Update 클릭 확인, 매시 58분 자동 수집 반영 확인
- [ ] 3D 1회 렌더 요청 수 실측 → Workers 무료 한도(10만/일, WEB_PROJECT와 계정 공유) 여유 확인
  - 미측정: 브라우저 없이 3D 1회 요청 수를 셀 수 없음 → Cloudflare 대시보드(Workers → wow-forever → Metrics)에서 하루치 요청 수 확인 예정
- [x] 푸터·파비콘·공유 미리보기·404 (2026-11-08, 운영 배포 완료) — 백업 `backup/layout.before-meta.tsx`, `landing.before-footer.tsx`, `guild-viewer.before-footer.tsx`
  - 고지 문구 `FAN_NOTICE`(`src/lib/config.ts`): 블리자드 상표 + "Blizzard와 무관한 비공식 팬사이트입니다." (API 이용 문구는 삭제 — 백업 `backup/config.before-notice.ts`) — 랜딩 하단, 뷰어 푸터(md 이상), 404 하단
  - 뷰어 푸터의 가짜 링크 "이용약관·개인정보처리방침"(페이지 없음) 삭제
  - 파비콘 `src/app/icon.svg` (방패 + W, 회색 테두리·accent 핑크)
  - 공유 미리보기 `src/app/opengraph-image.jpg` (1200×630, zephras 배경 + "같이와포하자 GUILD ARMORY", sharp로 생성) + `metadataBase`=`SITE_URL`, og/twitter 메타, themeColor
  - 404 `src/app/not-found.tsx` (랜딩 배경, 처음으로·캐릭터 뷰어 버튼)

### 보류 (필요 시)
- 성능 2·5번: 사이드바 행 애니메이션 상위 20개 제한, 2D 맞춤 CSS화 (18장)
- 히스토리 누적: 캐릭터별 변화 기록(성장 그래프·접속 잔디용) — 현재는 최신본만 저장
- 길드 비교 기능 재도입 (`src/lib/guild-stats.ts` 보관 중)

### (추가 수정, 2026-11-07)
- 랜딩 "길드원 전체 보기" 버튼 삭제 — 백업 `backup/landing.before-noall.tsx`
- 검색 자동완성이 사라지던 문제: 입력이 길드원 이름과 **정확히 일치하면 목록을 숨기던 조건** 때문 (한글 이름 대부분 3글자 → "세 글자마다 사라짐") → 일치해도 목록 유지, 정확 일치 항목을 맨 위에 표시 (`searchMembers`, `character-search.tsx`) — 백업 `backup/character-search.before-ac.tsx`, `backup/use-guild-data.before-ac.ts`

### (추가 수정, 2026-11-08) — 운영 배포 완료
- 특성 빈 캐릭터 조사: 19명(전부 10~19레벨)은 블리자드 specializations 응답 자체가 `{"is_active":true}`만 있음 → 수집 문제 아님(미투자 또는 로그아웃 전 미반영)
- 사이드바 "특성 없음" → "알 수 없음", 특성 필터 "없음" → "알 수 없음" — 백업 `backup/member-list.before-unknown.tsx`
- 능력치 제목 옆 "?" 아이콘 삭제 — 백업 `backup/stat-column.before-nohelp.tsx`
- 클래스 필터 버튼: 선택 시에만 직업 색(글자·테두리·배경) — 백업 `backup/filter-rail.before-classcolor.tsx`
- 사이드바 레벨 글자 흰색 — 백업 `backup/member-list.before-lvwhite.tsx`
- 랜딩 안내 팝업 `src/components/landing/notice-popup.tsx` (로그아웃 후 반영·1시간 주기·프로필 공개 설정 안내, 7일간 보지 않기 = localStorage `wf_notice_hide_until`) — 문구는 사용자 직접 수정, 백업 `backup/landing.before-notice.tsx`

### (추가, 2026-11-08) — 길드 통계(/stats): 스탯 리더보드 + 대시보드
- **데이터 최적화**: 수집기 7.5단계에서 `rank.json` 생성 (전원 최종수치 22종, 압축 배열 `{collectedAt, keys, rows:[[id,...]]}` · 250명 22KB / gzip ~9KB)
  - 바뀐 캐릭터만 새 값, 나머지는 이전 행 유지 (첫 실행만 chars/ 읽어 채움) · `collector/build-rank.mjs` = Blizzard 요청 없이 rank.json만 재생성
  - 브라우저 localStorage 캐시(`wf_rank_v1`): 수집시각+65분 전이면 요청 0회, 수집 지연 시 10분 재시도 간격 → 1인 시간당 최대 1회
  - Worker ingest 허용 키에 `rank.json` 추가 (배포 773813a6) · 운영 R2 시드 완료
- **리더보드**: 왼쪽 필터(클래스/특성, 알 수 없음은 존재할 때만) · 직업별 스탯 컬럼(`CLASS_COLS`) · 기본 정렬 Lv · 헤더 클릭 정렬 · 공동 순위 · 1~3위 금은동 그라데이션 배지 · 30명/페이지 · 행 클릭 → 뷰어
- **대시보드**: WEB_PROJECT 구성 — 직업 비율 treemap(클릭 시 분포도에 해당 직업 겹침) + 레벨 분포도 + 특성 칩 (index.json만 사용, 추가 요청 0)
- 기타: 뷰어 기본 캐릭터 제거 · 아이템 검색 탭 삭제 · 뷰어 외 탭에서 사이드바 숨김 · 사이드바 특성 필터 "알 수 없음"도 존재할 때만
- 남은 일: index.json에도 같은 시간 캐시 적용 검토
