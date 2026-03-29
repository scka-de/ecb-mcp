# Changelog

## 0.1.0 (2026-03-29)

Initial release.

### Tools

- `get_exchange_rates` — EUR reference rates for 40+ currencies (daily, monthly, annual)
- `get_interest_rates` — ECB key policy rates (MRO, deposit facility, marginal lending)
- `get_yield_curve` — AAA government bond yield curve (3M to 30Y)
- `get_inflation` — HICP inflation (euro area or per country)
- `get_money_supply` — Monetary aggregates M1, M2, M3 (outstanding or growth rate)
- `convert_currency` — Currency conversion via ECB rates (including cross-rates via EUR)
- `search_datasets` — Keyword search across 100+ ECB datasets
- `explain_dataset` — Dataset structure, dimensions, and valid values for any ECB dataset

### Features

- Zero configuration — no API key, no registration
- Direct access to the ECB SDMX 2.1 REST API
- Human-readable output optimized for LLM consumption
- Rate limiting (1 req/sec) to be a good API citizen
- Retry with exponential backoff on server errors
