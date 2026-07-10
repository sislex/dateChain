# dateChain — Трекинг прогресса

Обновляется на каждом шаге. Статусы: ⬜ не начато · 🟡 в работе · ✅ готово (все КП выполнены) · ⛔ заблокировано.

Правило фиксации: при завершении шага заполнить строку (дата, коммит, заметки) и отметить КП.

| Фаза | Шаг | Название                                  | Статус | Дата       | Коммит | Заметки                                                                                                                                                                                                |
| ---- | --- | ----------------------------------------- | :----: | ---------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 0    | 0.1 | Инициализация монорепо                    |   ✅   | 2026-07-10 | init   | pnpm+turbo, config-пресеты, пакет types; build/lint/typecheck зелёные, кэш turbo работает                                                                                                              |
| 0    | 0.2 | Docker-окружение (Postgres/Redis/PostGIS) |   ✅   | 2026-07-10 | init   | compose поднимает postgres+redis, healthcheck зелёный, PostGIS 3.4 + uuid-ossp/pgcrypto, Redis PONG                                                                                                    |
| 0    | 0.3 | CI-пайплайн                               |   ✅   | 2026-07-10 | init   | GitHub Actions: install→lint→typecheck→test→build→format, кэш pnpm+turbo; вся последовательность зелёная локально                                                                                      |
| 1    | 1.1 | Каркас UI-kit + Storybook                 |   ✅   | 2026-07-10 | init   | packages/ui: токены (light/dark), Storybook 8 + a11y/themes, демо-история токенов; build+test-storybook зелёные, CI-джоба добавлена                                                                    |
| 1    | 1.2 | Базовые компоненты                        |   ✅   | 2026-07-10 | init   | 17 компонентов (Button/IconButton/Input/TextArea/Select/Switch/Checkbox/Slider/Avatar/Badge/Chip/Spinner/Skeleton/Toast/Modal+Sheet/Tabs/Bottom+SideNav), stories, a11y; 59 interaction-тестов зелёные |
| 1    | 1.3 | Доменные UI-компоненты Tinder             |   ✅   | 2026-07-10 | init   | Logo, SwipeCard (drag+метки+fly-off), ActionBar, MatchScreen, PhotoPager, ProfileDetails, ChatBubble/TypingIndicator/MatchListItem; Framer Motion, reduce-motion; 71 SB-тест + 7 unit зелёные          |
| 2    | 2.1 | Каркас NestJS + БД                        |   ✅   | 2026-07-10 | init   | NestJS 10 + TypeORM + Redis, ConfigModule с валидацией env, health-check (db+redis), первая миграция (up/down), Testcontainers e2e; unit+e2e зелёные, CI-джоба api-e2e                                 |
| 2    | 2.2 | OpenAPI + генерация типов                 |   ✅   | 2026-07-10 | init   | Swagger на /api/docs (+/api/docs-json), preview-режим генерации спеки без БД, пакет api-client с openapi-typescript; /api/docs 200 вживую, api-client typecheck ок, CI drift-check                     |
| 2    | 2.3 | Auth (OTP + JWT + RBAC)                   |   ✅   | 2026-07-11 | init   | OTP (Redis) + JWT access/refresh с ротацией и reuse-detection, RBAC (guard+@Roles), 2FA (TOTP) для админов; unit 94.6% покрытие auth, e2e: логин/refresh/reuse/401/403                                 |
| 3    | 3.1 | Profile + Media                           |   ✅   | 2026-07-11 | init   | Profile (upsert+18+, completion, гео-колонка), Photo + MediaService (sharp: full/thumb/blurhash на диск), upload/reorder/delete, отдача с проверкой владельца (403); 57 unit + 11 e2e зелёные          |
| 3    | 3.2 | Discovery (гео + фильтры)                 |   ⬜   |            |        |                                                                                                                                                                                                        |
| 3    | 3.3 | Swipe + Match                             |   ⬜   |            |        |                                                                                                                                                                                                        |
| 3    | 3.4 | Chat + WebSocket                          |   ⬜   |            |        |                                                                                                                                                                                                        |
| 3    | 3.5 | Moderation + Notifications + Admin API    |   ⬜   |            |        |                                                                                                                                                                                                        |
| 3    | 3.6 | Сиды и демо-данные                        |   ⬜   |            |        |                                                                                                                                                                                                        |
| 4    | 4.1 | Каркас user-web                           |   ⬜   |            |        |                                                                                                                                                                                                        |
| 4    | 4.2 | Авторизация и онбординг                   |   ⬜   |            |        |                                                                                                                                                                                                        |
| 4    | 4.3 | Discovery / свайпы                        |   ⬜   |            |        |                                                                                                                                                                                                        |
| 4    | 4.4 | Фильтры подбора                           |   ⬜   |            |        |                                                                                                                                                                                                        |
| 4    | 4.5 | Мэтчи и чат (real-time)                   |   ⬜   |            |        |                                                                                                                                                                                                        |
| 4    | 4.6 | Профиль и настройки                       |   ⬜   |            |        |                                                                                                                                                                                                        |
| 5    | 5.1 | Каркас admin-web + вход                   |   ⬜   |            |        |                                                                                                                                                                                                        |
| 5    | 5.2 | Дашборд + пользователи                    |   ⬜   |            |        |                                                                                                                                                                                                        |
| 5    | 5.3 | Модерация + конфигурация                  |   ⬜   |            |        |                                                                                                                                                                                                        |
| 6    | 6.1 | E2E-сценарии (Playwright)                 |   ⬜   |            |        |                                                                                                                                                                                                        |
| 6    | 6.2 | Визуальная регрессия и a11y               |   ⬜   |            |        |                                                                                                                                                                                                        |
| 6    | 6.3 | Нагрузка, безопасность, наблюдаемость     |   ⬜   |            |        |                                                                                                                                                                                                        |
| 6    | 6.4 | Документация и релиз                      |   ⬜   |            |        |                                                                                                                                                                                                        |

## Журнал изменений

- **2026-07-10 — Шаг 0.1.** Инициализирован монорепо: pnpm workspaces + Turborepo, корневые
  `tsconfig.base.json`/`.prettierrc`/`.gitignore`, пакет `@datechain/config` (пресеты ESLint/Prettier/Jest/TS)
  и `@datechain/types`. Проверено: `pnpm install`, `build`/`typecheck`/`lint` зелёные, кэш turbo (FULL TURBO), prettier чистый.
- **2026-07-10 — Шаг 0.2.** `docker-compose.yml`: Postgres 16 (образ postgis/postgis:16-3.4) + Redis 7,
  healthcheck'и, init-скрипт расширений (`infra/postgres/init/01-extensions.sql`), `.env.example`.
  Проверено: оба контейнера `healthy`, `PostGIS_version() = 3.4`, Redis `PONG`.
  Замечание: на Apple Silicon образ postgis тянется как amd64 (эмуляция) — рабочее, но медленнее.
- **2026-07-10 — Шаг 0.3.** CI (`.github/workflows/ci.yml`): pnpm + Node 22, кэш pnpm и turbo,
  этапы install→lint→typecheck→test→build→format:check. GitHub Actions локально не запускается,
  но идентичная последовательность команд прогнана и зелёная; YAML валиден (без табов).
- **2026-07-10 — Шаг 1.1.** `packages/ui`: дизайн-токены (CSS-переменные light/dark по палитре Tinder
  - JS-зеркало `tokens.ts`), Storybook 8 (react-vite) с аддонами essentials/a11y/interactions/themes,
    переключатель light/dark (`withThemeByDataAttribute`), демо-история `Foundations/Tokens` с play-тестом.
    Vite library-build + d.ts. Проверено: `build`, `build-storybook`, `test-storybook` (chromium) — зелёные.
    Добавлена CI-джоба `storybook` (build + interaction tests через http-server+wait-on+test-runner).
- **2026-07-10 — Шаг 1.2.** Базовые компоненты UI-kit (17): Button, IconButton (action-кнопки),
  Input, TextArea, Select, Switch, Checkbox, Slider, Avatar, Badge, Chip, Spinner, Skeleton,
  Toast (+провайдер/`useToast`), Modal (+ bottom-sheet вариант), Tabs, BottomNav/SideNav.
  Каждый — CSS-модуль с токенами, story (состояния/controls), a11y (роли, aria, focus-visible),
  play-тесты для интерактивных. Проверено: `test-storybook` — 59 тестов/18 сюит зелёные; build/lint/typecheck/format чистые.
- **2026-07-10 — Шаг 1.3.** Доменные компоненты Tinder: Logo (пламя-SVG), SwipeCard (drag/поворот/
  метки LIKE·NOPE·SUPER/fly-off/императивный `swipe()`), ActionBar (rewind/nope/super/like/boost),
  MatchScreen («It's a Match!» с анимацией), PhotoPager (сегменты+тап-зоны), ProfileDetails,
  ChatBubble/TypingIndicator/MatchListItem. Framer Motion + `useReducedMotion`; CSS-анимации с
  `prefers-reduced-motion`. Решающая логика свайпа вынесена в чистую `resolveSwipeFromOffset` и
  покрыта Jest (drag влево/вправо/вверх/порог). Итог: 71 interaction-тест (24 сюиты) + 7 unit —
  зелёные; build/lint/typecheck/format чистые. **Фаза 1 (UI-kit) завершена.**
  Замечание: полноценный drag-жест framer-motion не воспроизводится синтетическими событиями в
  headless test-runner — направление свайпа проверяется unit-тестом чистой логики + interaction-тестами кнопок ActionBar.
- **2026-07-10 — Шаг 2.1.** Каркас `apps/api` (NestJS 10): ConfigModule с типизированной валидацией env
  (class-validator, `@Type(() => Number)`), TypeORM (`synchronize:false`, общий `buildDataSourceOptions`
  для рантайма и CLI), Redis-модуль (ioredis, graceful-close через `OnModuleDestroy`), health-check
  (`@nestjs/terminus`: db ping + redis), первая миграция `InitialBaseline` (extensions + marker-таблица,
  up/down). Тесты: unit (валидация env) + e2e на Testcontainers (postgis+redis): миграция up/down и
  `GET /health` → 200. Проверено: unit + e2e (EXIT=0, forceExit) зелёные; build/lint/typecheck/format чистые.
  Добавлена CI-джоба `api-e2e`. Замечание: e2e требует Docker; `forceExit` — из-за docker-socket хендла Testcontainers.
- **2026-07-10 — Шаг 2.2.** OpenAPI: `@nestjs/swagger`, Swagger UI на `/api/docs`, JSON на `/api/docs-json`,
  bearer-auth схема. Скрипт `openapi:generate` через **preview-режим Nest** (граф модулей без подключения
  к БД/Redis) → `openapi.json`. Пакет `@datechain/api-client`: `openapi-typescript` генерирует `schema.ts`,
  реэкспорт `paths/components/operations`. Root-скрипты `gen:openapi`/`gen:types`. Проверено вживую:
  `/health` 200, `/api/docs` 200, `/api/docs-json` отдаёт спеку; `api-client` typecheck без ошибок (импорт
  сгенерированных типов). CI: drift-check (`gen:types` + `git diff --exit-code`). Генерируемые файлы в `.prettierignore`.
  Замечание: пока единственный документированный путь — `/health`; типы дозаполнятся при добавлении доменных эндпоинтов (Фаза 3).
- **2026-07-11 — Шаг 2.3.** Auth-домен: сущности `User` (роль/статус/passwordHash/2FA) и `RefreshToken`
  (rotation-lineage через `family`); миграция `AuthTables`. OTP-сервис (Redis, mock-отправка, single-use),
  TokenService (access JWT + opaque refresh, sha256-хеш в БД, ротация с revoke + **reuse-detection**:
  повтор отозванного → revoke всей family + 401), OTP/JWT логин, admin-логин (bcrypt пароль + TOTP через otplib),
  RBAC: `JwtAuthGuard` (уважает `@Public()`) + `RolesGuard` (ранги ролей) как APP_GUARD, декораторы
  `@Public/@Roles/@CurrentUser`. Контроллер: otp request/verify, refresh, logout, me, admin/login, admin/ping (RBAC-probe).
  Тесты: 47 unit (auth-домен **94.6%** stmts, ≥85%) + e2e на Testcontainers: OTP-логин→токены, `/auth/me`,
  ротация refresh, отказ reuse (401), защита без токена (401), admin-роут для user (403). **Фаза 2 (бекенд-фундамент) завершена.**
- **2026-07-11 — Шаг 3.1.** Profile + Media. Сущности `Profile` (1:1 с User, гео-колонка `location`
  geography+GiST для 3.2) и `Photo`; миграция `ProfilesAndPhotos`. `ProfilesService.upsert` (валидация 18+,
  апдейт гео через ST_MakePoint, `computeCompletion`), `MediaService` (sharp: full 1080/thumb 256 JPEG +
  BlurHash, файлы на диск), `PhotosService` (upload с позицией/main, reorder с проверкой набора id, delete
  с компакцией позиций, `findOwned` → 403). Контроллеры profile (PUT/GET, photos CRUD, multipart-upload с
  fileFilter) и media (StreamableFile с проверкой владельца). Тесты: 57 unit (completion/age, photos-логика)
  - e2e: профиль 400 (<18, невалидный enum) и 200 с completion, upload→original+thumb+blurhash, отдача
    владельцу 200 / чужому 403, reorder+delete. Регенерированы OpenAPI-типы.
