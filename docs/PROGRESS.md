# dateChain — Трекинг прогресса

Обновляется на каждом шаге. Статусы: ⬜ не начато · 🟡 в работе · ✅ готово (все КП выполнены) · ⛔ заблокировано.

Правило фиксации: при завершении шага заполнить строку (дата, коммит, заметки) и отметить КП.

| Фаза | Шаг | Название                                  | Статус | Дата       | Коммит | Заметки                                                                                                                                                                                                                                                                                 |
| ---- | --- | ----------------------------------------- | :----: | ---------- | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0    | 0.1 | Инициализация монорепо                    |   ✅   | 2026-07-10 | init   | pnpm+turbo, config-пресеты, пакет types; build/lint/typecheck зелёные, кэш turbo работает                                                                                                                                                                                               |
| 0    | 0.2 | Docker-окружение (Postgres/Redis/PostGIS) |   ✅   | 2026-07-10 | init   | compose поднимает postgres+redis, healthcheck зелёный, PostGIS 3.4 + uuid-ossp/pgcrypto, Redis PONG                                                                                                                                                                                     |
| 0    | 0.3 | CI-пайплайн                               |   ✅   | 2026-07-10 | init   | GitHub Actions: install→lint→typecheck→test→build→format, кэш pnpm+turbo; вся последовательность зелёная локально                                                                                                                                                                       |
| 1    | 1.1 | Каркас UI-kit + Storybook                 |   ✅   | 2026-07-10 | init   | packages/ui: токены (light/dark), Storybook 8 + a11y/themes, демо-история токенов; build+test-storybook зелёные, CI-джоба добавлена                                                                                                                                                     |
| 1    | 1.2 | Базовые компоненты                        |   ✅   | 2026-07-10 | init   | 17 компонентов (Button/IconButton/Input/TextArea/Select/Switch/Checkbox/Slider/Avatar/Badge/Chip/Spinner/Skeleton/Toast/Modal+Sheet/Tabs/Bottom+SideNav), stories, a11y; 59 interaction-тестов зелёные                                                                                  |
| 1    | 1.3 | Доменные UI-компоненты Tinder             |   ✅   | 2026-07-10 | init   | Logo, SwipeCard (drag+метки+fly-off), ActionBar, MatchScreen, PhotoPager, ProfileDetails, ChatBubble/TypingIndicator/MatchListItem; Framer Motion, reduce-motion; 71 SB-тест + 7 unit зелёные                                                                                           |
| 2    | 2.1 | Каркас NestJS + БД                        |   ✅   | 2026-07-10 | init   | NestJS 10 + TypeORM + Redis, ConfigModule с валидацией env, health-check (db+redis), первая миграция (up/down), Testcontainers e2e; unit+e2e зелёные, CI-джоба api-e2e                                                                                                                  |
| 2    | 2.2 | OpenAPI + генерация типов                 |   ✅   | 2026-07-10 | init   | Swagger на /api/docs (+/api/docs-json), preview-режим генерации спеки без БД, пакет api-client с openapi-typescript; /api/docs 200 вживую, api-client typecheck ок, CI drift-check                                                                                                      |
| 2    | 2.3 | Auth (OTP + JWT + RBAC)                   |   ✅   | 2026-07-11 | init   | OTP (Redis) + JWT access/refresh с ротацией и reuse-detection, RBAC (guard+@Roles), 2FA (TOTP) для админов; unit 94.6% покрытие auth, e2e: логин/refresh/reuse/401/403                                                                                                                  |
| 3    | 3.1 | Profile + Media                           |   ✅   | 2026-07-11 | init   | Profile (upsert+18+, completion, гео-колонка), Photo + MediaService (sharp: full/thumb/blurhash на диск), upload/reorder/delete, отдача с проверкой владельца (403); 57 unit + 11 e2e зелёные                                                                                           |
| 3    | 3.2 | Discovery (гео + фильтры)                 |   ✅   | 2026-07-11 | init   | DiscoveryService: PostGIS ST_DWithin (GiST), взаимные фильтры пол/возраст/радиус, исключение self/swiped/blocked; поля предпочтений в Profile, сущности Swipe/Block; e2e: гео/фильтры/исключения + EXPLAIN использует индекс                                                            |
| 3    | 3.3 | Swipe + Match                             |   ✅   | 2026-07-11 | init   | SwipeService (идемпотентно, дневной лимит→429), MatchService (canonical-пара, unique, unmatch), взаимный лайк→мэтч + событие MATCH_CREATED (EventEmitter), rewind за флагом; 71 unit + 18 e2e зелёные                                                                                   |
| 3    | 3.4 | Chat + WebSocket                          |   ✅   | 2026-07-11 | init   | Message-сущность, ChatService (треды, пагинация, read-статусы), Socket.IO gateway (JWT-auth сокета, комнаты по мэтчу, typing, presence, слушатель MATCH_CREATED), Redis-adapter; real-time e2e (2 клиента): доставка/typing/presence/401/403/пагинация                                  |
| 3    | 3.5 | Moderation + Notifications + Admin API    |   ✅   | 2026-07-11 | init   | Жалобы (авто-приоритет, очередь), блокировки (unmatch), уведомления (слушатели MATCH/MESSAGE→notification:new), Admin API (users/metrics/settings/impersonate) с аудит-логом, RBAC по ролям; 84 unit + 30 e2e (7 суит) зелёные                                                          |
| 3    | 3.6 | Сиды и демо-данные                        |   ✅   | 2026-07-11 | init   | seed-скрипт (`pnpm seed`): N демо-профилей с гео, интересами и фото (sharp+blurhash на диск); e2e: seed наполняет БД, discovery для сид-пользователя возвращает непустую колоду с фото. **Фаза 3 завершена**                                                                            |
| 4    | 4.1 | Каркас user-web                           |   ✅   | 2026-07-11 | init   | Vite+React+RTK+RTK Query+Router, socket-middleware (auto-connect по auth), authSlice с refresh-ротацией, adaptive layout (BottomNav mobile / SideNav desktop из @datechain/ui), ProtectedRoute; build+preview 200, 6 unit-тестов зелёные                                                |
| 4    | 4.2 | Авторизация и онбординг                   |   ✅   | 2026-07-11 | init   | OTP-флоу (телефон→код) + многошаговый онбординг профиля (имя/дата/пол/интересы) на @datechain/ui, zod-валидация с 18+, RTK Query authApi/profileApi, setCredentials; Playwright e2e (мок-API): полный флоу→discovery + блок 18+; 10 unit; CI-джоба user-web-e2e                         |
| 4    | 4.3 | Discovery / свайпы                        |   ✅   | 2026-07-11 | init   | DiscoveryPage (колода на SwipeCard+ActionBar, живые API getDeck/swipe), экран мэтча, пустое состояние, лимит(429); бэкенд: MediaAccessService (кросс-юзерный доступ к фото, 3.1-403 сохранён); Playwright: свайп→мэтч + пустая колода                                                   |
| 4    | 4.4 | Фильтры подбора                           |   ✅   | 2026-07-11 | init   | DiscoverySettingsPage (радиус/возраст/пол/видимость на @datechain/ui Slider/Chip/Switch), upsert профиля инвалидирует Deck→refetch; Playwright: изменение фильтров сохраняет новые значения (radius/discoverable) и возвращает к колоде                                                 |
| 4    | 4.5 | Мэтчи и чат (real-time)                   |   ✅   | 2026-07-11 | init   | Бэк: `GET /matches/previews` (партнёр+фото+последнее сообщение+непрочитанные); фронт: MatchesPage (лента новых+диалоги), ChatPage (тред/typing/read/unmatch) на @datechain/ui, real-time через socket-шину; Playwright: список→чат, отправка+входящее+typing                            |
| 4    | 4.6 | Профиль и настройки                       |   ✅   | 2026-07-11 | init   | ProfilePage: % заполнения, редактирование (имя/био/интересы→upsert), фото (загрузка/удаление), пауза (discoverable), выход, удаление аккаунта с подтверждением; бэк: self-delete `DELETE /auth/account`; Playwright: правка сохраняется, удаление→logout→/welcome. **Фаза 4 завершена** |
| 5    | 5.1 | Каркас admin-web + вход                   |   ✅   | 2026-07-11 | init   | admin-web (Vite+RTK+Router), вход email+пароль+2FA (`/auth/admin/login`), RoleGuard с рангами ролей, SideNav-меню по ролям, дашборд-метрики — на @datechain/ui; 6 unit + 2 Playwright (вход→дашборд, неавторизованный→login); CI-джоба                                                  |
| 5    | 5.2 | Дашборд + пользователи                    |   ✅   | 2026-07-11 | init   | Дашборд-метрики (5.1) + UsersPage (поиск, таблица, бан/разбан→setStatus с аудитом на бэке, «Войти как»/impersonate только SUPER_ADMIN); Playwright: бан→POST status, impersonate скрыт у ADMIN / виден у SUPER_ADMIN                                                                    |
| 5    | 5.3 | Модерация + конфигурация                  |   ⬜   |            |        |                                                                                                                                                                                                                                                                                         |
| 6    | 6.1 | E2E-сценарии (Playwright)                 |   ⬜   |            |        |                                                                                                                                                                                                                                                                                         |
| 6    | 6.2 | Визуальная регрессия и a11y               |   ⬜   |            |        |                                                                                                                                                                                                                                                                                         |
| 6    | 6.3 | Нагрузка, безопасность, наблюдаемость     |   ⬜   |            |        |                                                                                                                                                                                                                                                                                         |
| 6    | 6.4 | Документация и релиз                      |   ⬜   |            |        |                                                                                                                                                                                                                                                                                         |

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
- **2026-07-11 — Шаг 3.2.** Discovery. Поля предпочтений в `Profile` (radiusKm/ageMin/ageMax), сущности
  `Swipe` (matching) и `Block` (moderation) + миграция `DiscoveryTables` (колонки + таблицы swipes/blocks).
  `DiscoveryService.getDeck`: PostGIS `ST_DWithin` по GiST-индексу, взаимный фильтр пола (candidate.gender ∈
  viewer.interestedIn И наоборот), возрастной диапазон, исключение self / уже-свайпнутых / заблокированных
  (обе стороны), сортировка по дистанции+свежести; фото-метаданные (blurhash) в карточках. `GET /discovery/deck`.
  Чистый маппер `toDeckCandidate` покрыт unit. e2e (реальный PostGIS): ближний мэтч-пол возвращается,
  дальний/не-тот-пол исключены, swiped/blocked исключены, `EXPLAIN` (при `enable_seqscan=off`) использует
  `idx_profiles_location`. 60 unit + 14 e2e зелёные. Замечание: отдача фото кандидатов (кросс-юзер доступ) —
  задел на match-based доступ в 3.3/3.4; сейчас raw-media остаётся owner-only.
- **2026-07-11 — Шаг 3.3.** Swipe + Match. Сущность `Match` (канонич. пара `userAId<userBId`, unique-индекс,
  CHECK-констрейнт, unmatch), миграция `Matches`. `SwipeService.swipe`: идемпотентность (unique actor+target),
  дневной лимит лайков (`DAILY_LIKE_LIMIT`) → HTTP 429, детекция взаимного LIKE/SUPER_LIKE → `MatchService.createForPair`
  - эмит доменного события `MATCH_CREATED` (`@nestjs/event-emitter`, слушатель — чат в 3.4). Rewind за флагом
    `FEATURE_REWIND` (по умолчанию 403). Эндпоинты: `POST /swipes`, `POST /swipes/rewind`, `GET /matches`, `DELETE /matches/:id`.
    Тесты: unit (self-swipe 400, no-reciprocal/reciprocal, идемпотентность, лимит 429, canonicalPair, unmatch-права) +
    e2e: взаимный лайк→matched, self-swipe 400, rewind 403, unmatch убирает у обоих. 71 unit + 18 e2e зелёные.
- **2026-07-11 — Шаг 3.4.** Chat + WebSocket. Сущность `Message` (тип text/image, readAt), миграция `Messages`.
  `ChatService`: `sendMessage` (проверка участника, эмит `MESSAGE_CREATED`), `listThread` (пагинация по курсору
  `before`+`limit`), `markRead` (эмит `MESSAGES_READ`). `ChatGateway` (Socket.IO): JWT-аутентификация сокета из
  handshake, персональная комната `user:<id>`, `match:join` с проверкой участника, `message:send`, `typing`,
  `message:read`, `presence:check`; presence в Redis-set; слушатели `@OnEvent` MESSAGE_CREATED/MESSAGES_READ/MATCH_CREATED
  (мэтч из 3.3 → `match:new` обоим). `RedisIoAdapter` (@socket.io/redis-adapter) в main для горизонтального масштабирования.
  REST: GET/POST `/matches/:id/messages`, POST `/read`. Тесты: 76 unit + real-time e2e (2 socket-клиента):
  доставка сообщения, typing, presence set/clear, отказ без токена, запрет чужой комнаты (403), пагинация+read.
  Правки надёжности: обработчик `error` на ioredis-клиенте, guard в `handleDisconnect` и `onModuleDestroy.quit`
  (иначе uncaught «Connection is closed» при shutdown). 76 unit + 24 e2e (6 суит) зелёные.
- **2026-07-11 — Шаг 3.5.** Moderation + Notifications + Admin. **Moderation:** `Report` (категории/статусы,
  авто-приоритет `computeReportPriority`), `ReportService` (создание→очередь по priority/дате, resolve),
  `BlockService` (блок + unmatch пары), контроллер `/reports`, `/blocks`. **Notifications:** `Notification`
  (тип/payload/readAt), `NotificationService` (+ эмит `NOTIFICATION_CREATED`), `NotificationListeners`
  (`@OnEvent` MATCH_CREATED→оба, MESSAGE_CREATED→получатель), gateway шлёт `notification:new` в user-комнату,
  контроллер `/notifications`. **Admin:** `AuditLog`+`Setting`, `AdminService` (users list/get, метрики-агрегаты,
  setStatus с revoke+аудит, impersonate, resolveReport+ban, settings) + аудит каждого действия; контроллер
  `/admin/*` с `@Roles` (metrics→Analyst, users→Support, status→Moderator, impersonate→SuperAdmin, audit/settings→Admin).
  Миграция `ModerationAdmin`. Тесты: unit (priority, block-unmatch, метрики-агрегатор, ban→revoke+аудит) +
  e2e: жалоба→очередь, блок→чат пуст, ban→аудит, метрики, RBAC moderator→403 (audit/impersonate), superadmin impersonate. 84 unit + 30 e2e (7 суит).
- **2026-07-11 — Шаг 3.6.** Сиды. `seedDatabase(ds, opts)` + CLI `pnpm seed` (root+api): создаёт N демо-юзеров
  (телефон по префиксу), профили с чередованием пол/interestedIn (взаимный подбор гарантирован), гео вокруг
  центра с джиттером + `ST_MakePoint`, интересы/био, по фото на юзера (sharp solid-color full+thumb на диск +
  blurhash). Идемпотентно (пропуск существующих телефонов). e2e: `seedDatabase(count:20)` → 20 профилей в БД,
  OTP-логин сид-юзера → `GET /discovery/deck` непустой, у кандидата есть фото. 84 unit + 31 e2e (8 суит).
  **Фаза 3 (доменная логика бекенда) завершена.** Итог бекенда: 10 доменов, 6 миграций, ~40 REST + WS-gateway.
- **2026-07-11 — Шаг 4.1.** Каркас `apps/user-web` (Vite + React 18): Redux Toolkit store (authSlice с
  persist в localStorage + refresh-ротация), RTK Query `baseApi` (prepareHeaders + auto-reauth на 401),
  socket-middleware (единый Socket.IO, auto-connect при появлении токена, релей событий в DOM-шину `getSocket`),
  React Router с `ProtectedRoute` (редирект неавторизованного на `/welcome`), `AppLayout` — адаптив через
  `useBreakpoint`: BottomNav (mobile) / SideNav (desktop) **из `@datechain/ui`** (никаких дублей компонентов),
  WelcomePage + placeholder-страницы. Vitest. Проверено: `tsc`+`vite build` ок, `vite preview` отдаёт SPA (200),
  6 unit-тестов (authSlice, breakpoint, ProtectedRoute-редирект) зелёные; lint/format чисты.
- **2026-07-11 — Шаг 4.2.** Авторизация и онбординг. RTK Query `authApi` (requestOtp/verifyOtp) и `profileApi`
  (getMyProfile/upsert/photos). `OnboardingFlow`: шаги телефон→OTP-код→профиль (имя, дата рождения, пол,
  «кого ищу» через Chip) — всё на компонентах `@datechain/ui`. Валидация `zod` (`profileSchema`, проверка 18+),
  ошибки полей на экране; verifyOtp→`setCredentials` (persist в localStorage). Тесты: unit (схема: валид/18+/
  пустой interestedIn, `ageOf`) + Playwright e2e с мок-API (`page.route`): полный флоу телефон→код→профиль→
  `/app/discovery`, и блок регистрации <18 с ошибкой. Vitest ограничен `src`, Playwright — `tests/e2e`.
  10 unit + 2 e2e зелёные. Добавлена CI-джоба `user-web-e2e` (Playwright chromium).
- **2026-07-11 — Шаг 4.3.** Discovery/свайпы. **Бэкенд:** `MediaAccessService` — доступ к фото: владелец ИЛИ
  (у зрителя есть профиль И профиль владельца discoverable И нет блокировки); `MediaController` использует его
  вместо owner-only, `PhotosService.findById`. e2e 3.1 «чужое фото 403» сохранён (у чужого нет профиля). Unit на
  правило доступа. **Фронт:** `discoveryApi` (getDeck/swipe + `photoUrl`), `DiscoveryPage` — колода на `SwipeCard`
  (императивный `swipe()` от `ActionBar`), маппинг direction→action, живой запрос свайпа, оптимистичное снятие карты,
  `MatchScreen` при взаимном лайке (рендерится даже при исчерпанной колоде), пустое состояние (deck-empty) и
  лимит(429→deck-limit). Playwright e2e (мок-API): лайк→экран мэтча (dialog «Новый мэтч»), пустая колода. 89 unit(api) + 4 e2e(user-web).
- **2026-07-11 — Шаг 4.4.** Фильтры подбора. `DiscoverySettingsPage` (радиус/возраст-min/возраст-max/«показывать»/
  видимость) на компонентах `@datechain/ui` (Slider/Chip/Switch), подгружает текущий профиль и сохраняет через
  `upsertProfile` (мержит с обязательными полями). `upsertProfile` инвалидирует теги `Profile`+`Deck` → колода
  перезапрашивается с новыми параметрами. Роут `/app/discovery/settings`. Playwright e2e: меняем радиус (150),
  выключаем «показывать меня» → PUT содержит `radiusKm:150, discoverable:false`, возврат к `/app/discovery`. 5 e2e user-web.
- **2026-07-11 — Шаг 4.5.** Мэтчи и чат (real-time). **Бэк:** `MatchPreviewService` + `GET /matches/previews` —
  превью с партнёром (имя/главное фото), последним сообщением (DISTINCT ON) и числом непрочитанных (GROUP BY).
  **Фронт:** `chatApi` (previews/messages/send/read/unmatch), хук `useSocketEvent` (подписка на DOM-шину socket),
  `MatchesPage` (лента «новые мэтчи» + список диалогов на `MatchListItem`, refetch по `match:new`/`message:new`),
  `ChatPage` (тред на `ChatBubble`, отправка через REST с оптимистичным добавлением — бэк сам транслирует
  `message:new` в комнату; приём входящих и `typing` через шину с фильтром по matchId; join комнаты; markRead;
  статусы прочтения; кнопка «Отмэтчить»). Playwright e2e: список→открытие чата; отправка сообщения + входящее
  через шину + индикатор набора. Итог: 7 e2e user-web + backend matching/chat e2e зелёные.
- **2026-07-11 — Шаг 4.6.** Профиль и настройки. **Бэк:** `UsersService.updateStatus`, `AuthService.deleteAccount`
  (status DELETED + revoke всех сессий), эндпоинт `DELETE /auth/account`. **Фронт:** `ProfilePage` — шапка с
  аватаром и **% заполнения**, редактирование (имя/био/интересы → `upsertProfile`, рефетч по тегу Profile),
  управление фото (загрузка через FormData, удаление), настройки: пауза (тумблер `discoverable`), «Выйти»
  (logout сервер + `logout()` + `/welcome`), «Удалить аккаунт» с подтверждением в `Modal` → `DELETE /auth/account`
  → logout → `/welcome`. `profileApi`+`authApi` расширены (deletePhoto/logoutServer/deleteAccount). Playwright e2e:
  показ 70% и сохранение правки имени (PUT), удаление аккаунта → редирект `/welcome` + localStorage очищен.
  Итог: **9 e2e user-web** зелёные. **Фаза 4 (user-web) завершена.**
- **2026-07-11 — Шаг 5.1.** Каркас `apps/admin-web` (Vite+React+RTK+Router). authSlice (ключ `datechain.admin.auth`,
  ранги ролей, `selectIsStaff`≥Analyst, `hasRank`), baseApi с reauth, `adminApi` (login/metrics/users/reports/audit).
  `LoginPage` (email+пароль+TOTP → `POST /auth/admin/login` → setCredentials), `RoleGuard` (редирект неавторизованных
  на /login, недостаточного ранга — на /admin), `AdminLayout` с `SideNav` (пункты фильтруются по рангу роли),
  `DashboardPage` (карточки метрик из `/admin/metrics`) — всё на `@datechain/ui`. Тесты: 6 unit (ранги/staff, RoleGuard)
  с 2 Playwright (мок-API): вход с 2FA→дашборд с метриками, неавторизованный /admin→/login. CI: admin-web e2e добавлен в джобу.
- **2026-07-11 — Шаг 5.2.** Дашборд + пользователи. `adminApi.impersonate` добавлен. `UsersPage`: поиск (по email/
  телефону), таблица пользователей (контакт/роль/статус-Badge), действия бан/разбан (`setUserStatus` → бэк пишет
  аудит и ревокает токены при бане), «Войти как» (impersonate) — кнопка только при роли SUPER_ADMIN. Роут
  `/admin/users` под `RoleGuard min=Support`. Playwright e2e: ADMIN банит (POST status=BANNED) и не видит impersonate;
  SUPER_ADMIN видит «Войти как». Итог: 4 e2e admin-web зелёные. Метрики-дашборд — из 5.1.
