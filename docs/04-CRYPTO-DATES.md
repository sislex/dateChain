# Feature: Crypto Escrow Dates (свидания за токены)

Пользователи предлагают друг другу встречу за токены; средства замораживаются в
эскроу-смарт-контракте и распределяются по правилам при подтверждении или отмене.

## Решения (утверждено)

| Вопрос | Решение |
|---|---|
| Владение кошельком | **Кастодиальное (демо)**: приложение создаёт и хранит ключи, бэкенд подписывает транзакции. Каждому пользователю выдаётся hardhat-аккаунт. |
| Валюта | **ERC-20 тестовый токен `DATE`** (18 decimals), деплой на hardhat. |
| Логика заморозки/комиссии | **Смарт-контракт эскроу** `DateEscrow.sol` — правила на контракте. |
| Кому предлагать | **Любому кандидату в колоде** (мэтч не обязателен); предложение открывает чат-тред. |
| Сеть | **Hardhat локально** сейчас; RPC/адреса вынесены в env для перехода на реальную сеть. |

## Правила эскроу (из ТЗ)

Обозначения: **P** — инициатор (proposer), **I** — приглашённый (invitee), `A` — сумма в DATE, комиссия сервиса `FEE = 20%`.

| Событие | Статус | Движение средств |
|---|---|---|
| P предлагает свидание (п.3) | `PROPOSED` | ничего не заморожено; P заранее делает `approve(escrow, A)` |
| I соглашается (п.4) | `ACCEPTED` | `A` списывается с P в эскроу (`transferFrom`) — **заморозка** |
| I отклоняет | `DECLINED` | ничего (из `PROPOSED`) |
| P подтверждает, что свидание состоялось (п.5, 6, 11) | `CONFIRMED` | **80% → I**, **20% (FEE) → сервисный кошелёк** |
| P отменяет до согласия (п.9) | `CANCELLED` | ничего (заморозки не было) |
| P отменяет после согласия (п.10) | `CANCELLED` | **20% (FEE) → сервис**, **80% → возврат P** |

Права: `accept`/`decline` — только I; `confirm`/`cancel` — только P. Любой переход из неверного статуса → revert (контракт) / 409 (API).

## Архитектура

```
packages/contracts (Hardhat + Solidity)
  DateToken.sol      ERC-20 "DATE" (OZ ERC20 + Ownable, mint сервисом)
  DateEscrow.sol     эскроу: propose/accept/confirm/cancel/decline, serviceWallet, FEE
  scripts/deploy.ts  деплой + mint + запись deployments/local.json (адреса+ABI)
  test/*.ts          unit-тесты контрактов (hardhat + chai)

apps/api (NestJS)
  chain/             ChainService (ethers provider, signers, ABI/адреса из deployments)
  wallet/            Wallet entity, кастодиальные ключи, GET /wallet (адрес+баланс), фандинг DATE
  dates/             Date entity + DatesService/Controller (оркестрация эскроу), чат-тред, уведомления
  ratings/           Rating entity, POST /dates/:id/rating, средний рейтинг в профиле
  admin/             сервисный кошелёк (адрес+баланс, setServiceWallet on-chain)

apps/user-web        баланс, "Предложить свидание", "Мои свидания", действия, рейтинг, уведомления
apps/admin-web       страница сервисного кошелька
```

### Кастодиальная модель
- Локальный hardhat поднимает 20 фандованных аккаунтов. Каждому пользователю при первом обращении к кошельку назначается свободный аккаунт: `wallet(userId) = {address, privkeyEnc}`.
- Приватные ключи шифруются (AES-256-GCM, ключ из env `WALLET_ENC_KEY`) перед записью в БД. **Только для локального демо.**
- Для демо каждому новому кошельку сервис минтит стартовый баланс DATE (`WALLET_SEED_AMOUNT`).
- Бэкенд подписывает транзакции ключом соответствующей стороны (P или I) — это и есть «кастодиальность».
- Переход на неказтодиальную модель (MetaMask) в будущем меняет только `chain/` + фронт wallet-connect; контракты и API-контракты не меняются.

### Чат для предложения без мэтча
Текущий чат требует `match`. При предложении свидания, если мэтча между P и I нет,
создаётся запись `match` (тред общения) — так открывается переписка (п.3). Свидание
(`Date`) — отдельная сущность, ссылается на этот тред. *(Единственное дефолтное
архитектурное решение; при желании заменим на отдельную сущность conversation.)*

## Модель данных (БД)

```
wallets            id, userId(unique), address(unique), privkeyEnc, createdAt
dates              id, proposerId, inviteeId, matchId, amount(numeric),
                   status(PROPOSED|ACCEPTED|CONFIRMED|CANCELLED|DECLINED),
                   escrowId(bigint, on-chain), message,
                   proposeTx, acceptTx, settleTx, createdAt, updatedAt
ratings            id, dateId, raterId, rateeId, score(1..5), comment,
                   createdAt; UNIQUE(dateId, raterId)
settings           service_wallet_address (существующая таблица настроек)
```

## API (эндпоинты, которые дёргает интерфейс)

| Метод | Путь | Кто | Действие |
|---|---|---|---|
| GET | `/wallet` | user | адрес + баланс DATE |
| POST | `/dates` | P | предложить `{inviteeId, amount, message?}` |
| POST | `/dates/:id/accept` | I | согласиться (заморозка) |
| POST | `/dates/:id/decline` | I | отклонить |
| POST | `/dates/:id/confirm` | P | подтвердить свидание (80/20) |
| POST | `/dates/:id/cancel` | P | отменить (штраф если было согласие) |
| GET | `/dates` | user | список свиданий с ролями/статусами (п.8) |
| POST | `/dates/:id/rating` | участник | оценить контрагента (после CONFIRMED) |
| GET | `/admin/service-wallet` | admin | адрес + баланс сервисного кошелька |
| PUT | `/admin/service-wallet` | admin | задать адрес (on-chain setServiceWallet) |

Новые типы уведомлений: `DATE_PROPOSED`, `DATE_ACCEPTED`, `DATE_DECLINED`, `DATE_CONFIRMED`, `DATE_CANCELLED`.

## Допущения (поправьте, если не так)
1. Отмена **до** согласия — без штрафа; **после** согласия — 20% сервису, 80% возврат P (ТЗ п.9/10).
2. Суммы — целое число DATE в UI (хранение — с 18 decimals on-chain).
3. Рейтинг 1–5 звёзд + необязательный комментарий; можно оценить только после `CONFIRMED`; один рейтинг на участника на свидание.
4. Каждому пользователю авто-выдаётся hardhat-кошелёк и стартовый баланс DATE (демо).
5. `FEE = 20%` — константа контракта, изменяемая владельцем (сервисом).

---

## Roadmap (пошагово, с тестами и критериями приёмки)

Легенда статусов в [PROGRESS-crypto-dates.md](./PROGRESS-crypto-dates.md): ⬜ todo · 🟨 in progress · ✅ done.

### Фаза 0 — Каркас блокчейна
**0.1 Hardhat-проект `packages/contracts`**
- Создать пакет: hardhat, `@nomicfoundation/hardhat-toolbox`, `@openzeppelin/contracts`, ts-config. Сеть `localhost` + `hardhat`, RPC/chainId из env.
- Скрипты: `chain:node`, `chain:compile`, `chain:test`, `chain:deploy`.
- **Тесты:** smoke — `hardhat compile` без ошибок.
- **Приёмка:** `pnpm --filter @datechain/contracts chain:compile` зелёный; `chain:node` поднимает узел на :8545.

**0.2 `DateToken.sol` (ERC-20)**
- OZ `ERC20` + `Ownable`; `mint(to, amount)` только owner; 18 decimals; symbol `DATE`.
- **Тесты:** mint увеличивает баланс; не-owner не может mint; transfer/allowance работают.
- **Приёмка:** `chain:test` по токену зелёный.

### Фаза 1 — Смарт-контракт эскроу
**1.1 `DateEscrow.sol`**
- Хранит `serviceWallet`, `feeBps=2000`, `token`. Структура `Escrow{proposer, payee, amount, status}`.
- `propose(payee, amount)→id`, `accept(id)`, `confirm(id)`, `cancel(id)`, `decline(id)`; события на каждый переход; `setServiceWallet`, `setFeeBps` (owner).
- **1.2 Unit-тесты контракта** (все ветки):
  - propose создаёт запись (`PROPOSED`), средства не тронуты;
  - accept: `A` уходит с P в контракт (проверка балансов);
  - confirm: I получает 80%, сервис 20% (точная арифметика, включая округление);
  - cancel после accept: сервис 20%, P возврат 80%;
  - cancel до accept и decline: балансы не меняются;
  - контроль доступа (только P confirm/cancel; только I accept/decline);
  - reverts: неверный статус, нет allowance/баланса.
- **Приёмка:** 100% веток из таблицы правил покрыты, тесты зелёные.

**1.3 Скрипт деплоя**
- Деплой DateToken + DateEscrow, mint начального запаса сервису, запись `deployments/local.json` (адреса + ABI).
- **Тесты:** деплой-скрипт на локальном узле создаёт файл с адресами.
- **Приёмка:** после `chain:deploy` файл существует и читается бэкендом.

### Фаза 2 — Интеграция бэкенда с сетью
**2.1 ChainModule/ChainService**
- ethers `JsonRpcProvider` (env `CHAIN_RPC_URL`), загрузка адресов/ABI из `deployments`, фабрика signer'ов, инстансы контрактов. env-валидация (`CHAIN_RPC_URL`, `CHAIN_ID`, `WALLET_ENC_KEY`, `SERVICE_WALLET_PRIVKEY`, `WALLET_SEED_AMOUNT`).
- **Тесты:** unit (мок provider) + интеграционный чтение сети (при поднятом узле).
- **Приёмка:** сервис читает `token.balanceOf` с локального узла.

**2.2 Wallet — кастодиальные кошельки**
- `Wallet` entity + миграция; `WalletService.provision(userId)` (назначение hardhat-аккаунта, шифрование ключа, стартовый mint); `getBalance`. `GET /wallet`.
- **Тесты:** unit (шифрование/провижн, мок сети); e2e `GET /wallet` → `{address, balance}`.
- **Приёмка:** новый пользователь получает адрес и ненулевой баланс DATE.

**2.3 Сервисный кошелёк в админке**
- Setting `service_wallet_address`; `GET/PUT /admin/service-wallet`; PUT вызывает on-chain `setServiceWallet` (owner).
- **Тесты:** admin e2e (RBAC, изменение адреса отражается on-chain и в балансе).
- **Приёмка:** админ видит адрес+баланс сервиса и может сменить адрес.

### Фаза 3 — Оркестрация свиданий (бэкенд)
**3.1 Предложение** `POST /dates` — `Date` entity+миграция; on-chain `approve`+`propose`; создание/переиспользование чат-треда; уведомление I.
- **Тесты:** e2e — создаётся `Date(PROPOSED)`, `escrowId` записан, тред доступен, уведомление `DATE_PROPOSED`.
**3.2 Согласие/отказ** `accept`/`decline` — accept → `escrow.accept` (заморозка), decline → `escrow.decline`.
- **Тесты:** e2e — после accept баланс P уменьшился на `A`, эскроу держит `A`; статусы; уведомления.
**3.3 Подтверждение** `confirm` — `escrow.confirm`, статус `CONFIRMED`.
- **Тесты:** e2e — I получил 80% от `A`, сервис 20% (проверка on-chain балансов).
**3.4 Отмена** `cancel` — ветки до/после согласия.
- **Тесты:** e2e — до accept: возвратов нет; после accept: сервис +20%, P +80% возврат.
**3.5 Список свиданий** `GET /dates` — роль, контрагент, статус, сумма, рейтинг.
- **Тесты:** e2e — оба участника видят свидание с корректной ролью/статусом (в т.ч. «отменено», п.9).
**3.6 Уведомления** новые типы для всех переходов.
- **Тесты:** e2e — получатель видит уведомление на каждое событие.
- **Приёмка фазы:** полный happy-path и все ветки отмены проходят e2e с проверкой on-chain балансов.

### Фаза 4 — Рейтинги
**4.1** `Rating` entity+миграция; `POST /dates/:id/rating` (только после `CONFIRMED`, один на участника); средний рейтинг в `GET /profile` и в карточке.
- **Тесты:** unit (валидация 1–5, запрет до CONFIRMED, уникальность); e2e (оба ставят рейтинг, средний считается).
- **Приёмка:** после подтверждённого свидания оба могут оценить друг друга; средний рейтинг виден.

### Фаза 5 — Фронтенд (user-web)
**5.1** Баланс кошелька (страница/секция) через `GET /wallet`. Тесты: component + Playwright.
**5.2** «Предложить свидание» на карточке колоды → модал суммы → `POST /dates`. Тесты.
**5.3** «Мои свидания»: список + действия по роли (accept/decline у I; confirm/cancel у P) + статусы, включая «свидание отменено» (п.9). Тесты.
**5.4** Рейтинг после `CONFIRMED`. Тесты.
**5.5** Уведомления о событиях свидания. Тесты.
- **Приёмка фазы:** сквозной сценарий в браузере: предложить → согласиться → подтвердить → увидеть перевод и поставить рейтинг.

### Фаза 6 — Админка (admin-web)
**6.1** Страница сервисного кошелька: адрес + баланс, смена адреса. Тесты: component + Playwright.
- **Приёмка:** админ управляет сервисным кошельком из UI.

### Фаза 7 — Интеграция и сценарии
**7.1** Расширить `api-scenarios.ts`: propose→accept→confirm (проверка балансов), cancel со штрафом, decline, рейтинги, список. Запуск против живого стека + hardhat-узла.
**7.2** Документация/README (как поднять цепочку), `.env.example`, интеграция запуска узла+деплоя в `pnpm start`.
- **Приёмка:** `pnpm --filter @datechain/api scenarios` включает крипто-сценарии и все зелёные.

## Как запускать цепочку (итог)
```bash
pnpm --filter @datechain/contracts chain:node      # терминал 1: локальный узел :8545
pnpm --filter @datechain/contracts chain:deploy     # деплой + адреса в deployments/local.json
# api читает deployments/local.json; далее обычный запуск
```
