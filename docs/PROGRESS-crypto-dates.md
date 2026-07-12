# Progress — Crypto Escrow Dates

Источник истины по фиче [04-CRYPTO-DATES.md](./04-CRYPTO-DATES.md).
Статусы: ⬜ todo · 🟨 in progress · ✅ done · ❌ blocked.

| Шаг | Описание | Статус | Тесты | Коммит | Заметки |
|---|---|---|---|---|---|
| 0.1 | Hardhat-проект `packages/contracts` | ✅ | compile ok | (phase) | node v22, hardhat 2.22 |
| 0.2 | `DateToken.sol` (ERC-20) | ✅ | 4/4 | (phase) | DATE, 18 dec |
| 1.1 | `DateEscrow.sol` | ✅ | — | (phase) | propose/accept/confirm/cancel/decline |
| 1.2 | Unit-тесты эскроу (все ветки) | ✅ | 14/14 | (phase) | все ветки + доступ + reverts |
| 1.3 | Скрипт деплоя + `deployments/local.json` | ✅ | deploy ok | (phase) | пишет `deployments/localhost.json` |
| 2.1 | ChainService (ethers, адреса/ABI, env) | ✅ | boot ok | (phase) | provider + treasury nonce-менеджер |
| 2.2 | Wallet: кастодиальные ключи, `GET /wallet` | ✅ | live ok | (phase) | random wallet, gas+seed DATE, AES-ключи |
| 2.3 | Сервисный кошелёк в админке | ✅ | live GET/PUT | (phase) | on-chain setServiceWallet, чтение из контракта |
| 3.1 | `POST /dates` — предложение | ✅ | live | (phase) | approve+propose, тред, уведомление
| 3.2 | `accept` / `decline` | ✅ | live | (phase) | accept замораживает, decline
| 3.3 | `confirm` — 80/20 | ✅ | live 80/20 | (phase) | Борис +80, сервис +20 (проверено)
| 3.4 | `cancel` — штраф/возврат | ✅ | live штраф | (phase) | после accept: −20% сервису, 80% возврат
| 3.5 | `GET /dates` — список | ✅ | live | (phase) | роль/контрагент/статус/сумма
| 3.6 | Уведомления о событиях свидания | ✅ | live | (phase) | DATE_* уведомления
| 4.1 | Рейтинги | ✅ | 5/5 + live | (phase) | POST rating, avg summary, guard CONFIRMED/uniq |
| 5.1 | UI: баланс кошелька | ✅ | live | (phase) | баланс на странице свиданий
| 5.2 | UI: «Предложить свидание» | ✅ | live | (phase) | кнопка+модал на Discovery
| 5.3 | UI: «Мои свидания» + действия | ✅ | live | (phase) | список, действия по роли, статусы
| 5.4 | UI: рейтинг | ✅ | live | (phase) | звёзды после CONFIRMED
| 5.5 | UI: уведомления свиданий | ✅ | live | (phase) | DATE_* создаются, список обновляется
| 6.1 | Админка: сервисный кошелёк | ✅ | live | (phase) | адрес+баланс комиссий, смена адреса |
| 7.1 | Крипто-сценарии в `api-scenarios.ts` | ✅ | 57/57 | (phase) | кошелёк, эскроу 80/20, отмена-штраф, рейтинг |
| 7.2 | Docs / README / `.env.example` / запуск | ⬜ | — | — | |

## Журнал
_(здесь фиксирую ход выполнения по шагам: дата, что сделано, результаты тестов)_
