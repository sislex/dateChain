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
| 3.1 | `POST /dates` — предложение | ⬜ | — | — | |
| 3.2 | `accept` / `decline` | ⬜ | — | — | |
| 3.3 | `confirm` — 80/20 | ⬜ | — | — | |
| 3.4 | `cancel` — штраф/возврат | ⬜ | — | — | |
| 3.5 | `GET /dates` — список | ⬜ | — | — | |
| 3.6 | Уведомления о событиях свидания | ⬜ | — | — | |
| 4.1 | Рейтинги | ⬜ | — | — | |
| 5.1 | UI: баланс кошелька | ⬜ | — | — | |
| 5.2 | UI: «Предложить свидание» | ⬜ | — | — | |
| 5.3 | UI: «Мои свидания» + действия | ⬜ | — | — | |
| 5.4 | UI: рейтинг | ⬜ | — | — | |
| 5.5 | UI: уведомления свиданий | ⬜ | — | — | |
| 6.1 | Админка: сервисный кошелёк | ⬜ | — | — | |
| 7.1 | Крипто-сценарии в `api-scenarios.ts` | ⬜ | — | — | |
| 7.2 | Docs / README / `.env.example` / запуск | ⬜ | — | — | |

## Журнал
_(здесь фиксирую ход выполнения по шагам: дата, что сделано, результаты тестов)_
