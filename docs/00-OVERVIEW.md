# dateChain — клон Tinder. Обзор проекта

> Полная копия Tinder: web responsive (desktop + mobile), core-функционал,
> real-time чат на WebSocket, медиа на локальном диске.

## 1. Решения по вводным

| Параметр    | Решение                                                         |
| ----------- | --------------------------------------------------------------- |
| Клиент      | Web, responsive (desktop + mobile-браузер), одна кодовая база   |
| Real-time   | WebSocket через Socket.IO (NestJS Gateway)                      |
| Охват фич   | Core clone (свайпы, мэтчи, чат, профиль, гео-подбор, модерация) |
| Медиа       | Локальный диск сервера + метаданные в Postgres                  |
| Backend     | NestJS + Postgres (TypeORM) + Redis (сессии/сокеты/rate-limit)  |
| Frontend    | React + Redux Toolkit + RTK Query                               |
| UI          | Общая UI-библиотека `@datechain/ui` + Storybook                 |
| Тесты       | Unit (Jest), Storybook interaction/e2e (Playwright)             |
| Авторизация | JWT (access + refresh), OTP по телефону/email, RBAC для админки |

## 2. Приложения (frontends)

Три отдельных фронтенд-приложения, использующих **одну** UI-либу:

1. **user-web** — основное приложение для пользователей (свайпы, мэтчи, чат, профиль).
2. **admin-web** — панель администратора/модератора (пользователи, жалобы, модерация, аналитика).
3. **ui** — библиотека компонентов + Storybook (design system, стили под Tinder).

Все три — в одном монорепо, общие типы и UI переиспользуются.

## 3. Монорепозиторий (структура)

```
dateChain/
├─ apps/
│  ├─ api/                 # NestJS backend
│  ├─ user-web/            # React SPA для пользователей
│  └─ admin-web/           # React SPA для админов/модераторов
├─ packages/
│  ├─ ui/                  # UI-kit + Storybook (design system)
│  ├─ types/               # Общие DTO / типы (генерятся из OpenAPI)
│  ├─ api-client/          # Типизированный клиент API (RTK Query slices)
│  └─ config/              # ESLint, TS, Prettier, Jest пресеты
├─ docs/                   # Планы, ADR, прогресс
├─ docker-compose.yml      # Postgres, Redis, MinIO(опц.), api, фронты
└─ turbo.json / pnpm-workspace.yaml
```

Инструмент монорепо: **pnpm workspaces + Turborepo** (кэш сборок/тестов).

## 4. Технологический стек

### Backend (`apps/api`)

- NestJS 10, TypeScript strict
- PostgreSQL 16 + TypeORM (миграции обязательны, `synchronize: false`)
- Redis (сессии, presence, rate-limiting, pub/sub для сокетов при горизонтальном масштабировании)
- Socket.IO gateway (`@nestjs/websockets`) с Redis-adapter
- Passport + JWT (access 15 мин, refresh 30 дней, ротация refresh)
- class-validator / class-transformer для DTO
- Swagger/OpenAPI (генерация типов для фронта)
- Хранение медиа: локальная папка `uploads/`, отдача через статик-эндпоинт с проверкой доступа; обработка изображений через `sharp` (ресайз, thumbnails, blur-hash)
- Гео-подбор: PostGIS-расширение (`geography` + `ST_DWithin`)
- Тесты: Jest (unit), Supertest (e2e API), test DB через Testcontainers

### Frontend (`apps/user-web`, `apps/admin-web`)

- React 18 + Vite
- Redux Toolkit + RTK Query (кэш, инвалидация, оптимистичные апдейты)
- React Router
- Socket.IO client (обёртка + middleware для Redux)
- Framer Motion (свайпы карточек, анимации в духе Tinder)
- react-hook-form + zod для форм
- i18n (react-i18next) — задел на локализацию

### UI-библиотека (`packages/ui`)

- Компоненты на React + CSS (CSS Modules / vanilla-extract) с токенами дизайна
- Storybook 8 (docs + interaction tests + Chromatic-совместимость)
- Playwright для e2e-тестов историй (в CI через `@storybook/test-runner`)
- Дизайн-токены: цвета/градиенты/шрифты Tinder (см. `03-DESIGN.md`)

## 5. Общие принципы

- **UI переиспользуется**: и user-web, и admin-web импортируют компоненты из `@datechain/ui`.
  Никаких дубликатов кнопок/инпутов/модалок в приложениях.
- **Типобезопасность сквозная**: OpenAPI → `packages/types` → `packages/api-client` → фронты.
- **Тестовая пирамида**: unit (домены/редьюсеры/утилиты) → компонентные (Storybook interaction)
  → e2e (Playwright по критичным сценариям) → API e2e (Supertest).
- **Каждый шаг имеет критерии приёмки** (см. `02-ROADMAP.md`) и фиксируется в `PROGRESS.md`.
- **Feature-flags** для монетизации/будущих фич — чтобы core оставался стабильным.

## 6. Нефункциональные требования

- Стили и анимации максимально близки к Tinder (см. `03-DESIGN.md`).
- Desktop и mobile-верстка в каждом приложении (адаптив, breakpoints).
- Доступность (a11y) на уровне UI-kit (фокус, ARIA, контраст).
- Безопасность: rate-limit, валидация входа, защита медиа, RBAC в админке, OWASP-базис.
- CI: линт → typecheck → unit → build → storybook test → api e2e.
