# dateChain

Полнофункциональный клон Tinder: свайпы, мэтчи, real-time чат, модерация и админка.
Web-приложение (responsive, desktop + mobile), визуальный стиль и анимации — по мотивам Tinder.

- **Backend:** NestJS 10, PostgreSQL 16 + PostGIS, Redis, TypeORM, Socket.IO
- **Frontend:** React 18, Redux Toolkit + RTK Query, React Router, Framer Motion
- **UI:** общая библиотека `@datechain/ui` (+ Storybook), переиспользуется во всех фронтах
- **Тесты:** Jest (unit), Testcontainers (API e2e), Storybook interaction + axe (a11y), Playwright (web e2e)

Подробности: [`docs/00-OVERVIEW.md`](docs/00-OVERVIEW.md) · фичи [`docs/01-FEATURES.md`](docs/01-FEATURES.md) ·
план [`docs/02-ROADMAP.md`](docs/02-ROADMAP.md) · дизайн [`docs/03-DESIGN.md`](docs/03-DESIGN.md) ·
прогресс [`docs/PROGRESS.md`](docs/PROGRESS.md).

## Монорепозиторий

```
apps/
  api/         # NestJS backend (10 доменов, WebSocket, admin)
  user-web/    # React SPA для пользователей
  admin-web/   # React SPA для админов/модераторов
packages/
  ui/          # UI-kit + Storybook (дизайн-система)
  types/       # общие enum/типы
  api-client/  # типы, сгенерированные из OpenAPI
  config/      # пресеты ESLint / Prettier / Jest / tsconfig
```

Инструменты: pnpm workspaces + Turborepo.

## Требования

- Node.js ≥ 20, pnpm 8, Docker (для БД/Redis и API e2e).

## Быстрый старт

```bash
# 1. Зависимости
pnpm install

# 2. Переменные окружения (используются и docker compose, и API)
cp .env.example .env

# 3. Инфраструктура: Postgres (PostGIS) + Redis
docker compose up -d

# 4. Миграции и демо-данные
pnpm --filter @datechain/api migration:run
pnpm seed                     # ~40 демо-профилей с фото и гео

# 5. Запуск (в отдельных терминалах)
pnpm --filter @datechain/api start:dev      # http://localhost:3000  (Swagger: /api/docs)
pnpm --filter @datechain/user-web dev        # http://localhost:5173
pnpm --filter @datechain/admin-web dev       # http://localhost:5174

# UI-kit в Storybook
pnpm --filter @datechain/ui storybook        # http://localhost:6006
```

> OTP-коды в dev выводятся в логи API (`[OtpService] OTP for phone:... = 123456`) — используйте их при входе.
> Чтобы попасть в админку, повысьте роль пользователя в БД
> (`UPDATE users SET role='ADMIN' WHERE ...`) и войдите заново.

## Demo-сценарий

1. Откройте user-web → «Создать аккаунт» → введите телефон → код из логов API → заполните профиль.
2. Свайпайте колоду; взаимный лайк с сид-профилем показывает экран «It's a Match!».
3. Откройте чат мэтча — сообщения доставляются в реальном времени (Socket.IO).
4. В admin-web (роль ADMIN) — дашборд-метрики, управление пользователями, очередь жалоб.

## Команды

```bash
pnpm -w build        # сборка всех пакетов (turbo)
pnpm -w lint         # ESLint
pnpm -w typecheck    # tsc --noEmit
pnpm -w test         # unit-тесты (Jest/Vitest)
pnpm -w format       # Prettier --write

pnpm --filter @datechain/api test:e2e            # API e2e (Testcontainers, нужен Docker)
pnpm --filter @datechain/ui test-storybook:ci    # Storybook interaction + a11y
pnpm --filter @datechain/user-web e2e            # Playwright (user-web)
pnpm --filter @datechain/admin-web e2e           # Playwright (admin-web)

pnpm gen:types       # регенерация OpenAPI + типов клиента
```

## CI

GitHub Actions (`.github/workflows/ci.yml`): lint → typecheck → unit → build → prettier →
OpenAPI drift-check, отдельные джобы для Storybook (interaction+a11y), API e2e и web e2e.

## Вне текущего объёма (core clone)

Монетизация (Tinder Gold/Boost/Super Like, платежи), push/email-уведомления, видео-звонки,
Passport/Explore, ML-ранжирование — за feature-flags, реализуются поверх ядра.
Строки интерфейса пока на русском (инфраструктура i18n заложена).

## Лицензия / товарные знаки

Воспроизводятся UX-паттерны и художественный стиль. Tinder — товарный знак Match Group;
используются свободные аналоги шрифтов и собственные ассеты.
