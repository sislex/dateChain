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
| 1    | 1.3 | Доменные UI-компоненты Tinder             |   ⬜   |            |        |                                                                                                                                                                                                        |
| 2    | 2.1 | Каркас NestJS + БД                        |   ⬜   |            |        |                                                                                                                                                                                                        |
| 2    | 2.2 | OpenAPI + генерация типов                 |   ⬜   |            |        |                                                                                                                                                                                                        |
| 2    | 2.3 | Auth (OTP + JWT + RBAC)                   |   ⬜   |            |        |                                                                                                                                                                                                        |
| 3    | 3.1 | Profile + Media                           |   ⬜   |            |        |                                                                                                                                                                                                        |
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
