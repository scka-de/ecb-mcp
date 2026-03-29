# ecb-mcp

European Central Bank data for AI agents. Exchange rates, interest rates, yield curves, inflation, money supply, and 100+ more datasets from the ECB — directly inside Claude, Cursor, Windsurf, or any MCP client.

No API key. No registration. No config. Just `npx ecb-mcp`.

[![npm version](https://img.shields.io/npm/v/ecb-mcp.svg)](https://www.npmjs.com/package/ecb-mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Why

The ECB publishes 100+ statistical datasets via a free, public API — exchange rates for 40+ currencies, key interest rates, yield curves, HICP inflation, monetary aggregates, banking statistics, and much more.

But the API uses SDMX, a format nobody memorizes. You need to know dataflow IDs, dimension key structures, and query syntax just to get a single number.

ecb-mcp translates natural questions into the right SDMX queries. Your AI agent asks "What's the current EUR/USD rate?" and gets a clean answer from live ECB data. No SDMX knowledge required.

## Quick Start

Add to your MCP client config:

```json
{
  "mcpServers": {
    "ecb": {
      "command": "npx",
      "args": ["-y", "ecb-mcp"]
    }
  }
}
```

That's it. No API key, no environment variables, no account creation.

### Where to add this config

- **Claude Desktop:** `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) or `%APPDATA%\Claude\claude_desktop_config.json` (Windows)
- **Claude Code:** `claude mcp add ecb-mcp -- npx -y ecb-mcp`
- **Cursor:** Settings > MCP Servers
- **Windsurf:** `~/.windsurf/config.json`

## What you can ask

Once installed, just ask your AI agent questions in natural language:

> "What's the current EUR/USD exchange rate?"
>
> "Show me ECB interest rate changes since 2022"
>
> "What's the eurozone inflation rate?"
>
> "Convert 5000 USD to GBP using ECB rates"
>
> "What's the 10-year euro area government bond yield?"
>
> "How has M3 money supply grown over the past year?"
>
> "What ECB datasets are available about bank lending?"
>
> "Explain the structure of the EXR dataset"

## Tools

### get_exchange_rates

EUR reference rates for 40+ currencies. Daily, monthly, or annual. The same rates used by European institutions and businesses.

```
"What's the EUR/USD rate?"
"Show me EUR/GBP rates for the last 30 days"
"EUR/JPY monthly averages for 2024"
```

### get_interest_rates

The ECB's key policy rates — the ones that move markets and drive eurozone monetary policy.

```
"What is the current ECB deposit facility rate?"
"Show me the history of ECB rate changes"
"When did the ECB last change the main refinancing rate?"
```

### get_yield_curve

Euro area government bond yield curve. AAA-rated sovereign spot rates from 3 months to 30 years.

```
"What's the 10-year euro area yield?"
"Show me the 2-year yield over the past 6 months"
"Compare 5Y and 10Y yields since January"
```

### get_inflation

HICP inflation — the official eurozone inflation measure. Available for the euro area as a whole or individual countries.

```
"What's the current eurozone inflation rate?"
"Germany's inflation over the past year"
"Compare inflation in France vs Spain"
```

### get_money_supply

Euro area monetary aggregates (M1, M2, M3). Outstanding amounts or annual growth rates.

```
"What's the current M3 money supply?"
"M1 growth rate over the past year"
"How has M3 evolved since 2020?"
```

### convert_currency

Convert any amount between currencies using official ECB reference rates. Supports EUR-direct, inverse, and cross-currency conversions (e.g., USD to GBP via EUR triangulation).

```
"Convert 1000 EUR to USD"
"How much is 500 GBP in JPY?"
"What was 10000 USD worth in CHF on 2025-01-15?"
```

### search_datasets

Search across all 100+ ECB statistical datasets by keyword. The ECB publishes far more than exchange rates — banking statistics, balance of payments, government debt, payment systems, insurance data, and much more.

```
"What ECB datasets are about bank lending?"
"Find datasets related to government debt"
"What data does the ECB publish about payments?"
```

### explain_dataset

Understand any ECB dataset's structure — its dimensions, valid values, and how to query it. This is the key to unlocking the full 100+ datasets beyond the built-in tools.

```
"Explain the EXR dataset structure"
"What dimensions does the BSI dataset have?"
"What are the valid currency codes?"
```

## Data Source

All data comes directly from the [ECB Data Portal API](https://data.ecb.europa.eu/help/api/overview) (SDMX 2.1 REST).

- No intermediary, no proxy — live data from the European Central Bank
- No authentication or API key required
- Exchange rates updated daily at 16:00 CET
- Other datasets updated at various frequencies (monthly, quarterly)

## Configuration

ecb-mcp works with zero configuration. Optional settings:

| Environment Variable | Default | Description |
|---|---|---|
| `ECB_API_URL` | `https://data-api.ecb.europa.eu/service` | API base URL. Only change this if you're proxying the ECB API. |
| `DEBUG` | — | Set to any value to enable debug logging to stderr. |

## Development

```bash
git clone https://github.com/scka-de/ecb-mcp.git
cd ecb-mcp
npm install
npm test                      # unit tests (fixtures, no API calls)
INTEGRATION=true npm test     # integration tests (live ECB API)
npm run build                 # compile to dist/
npm run dev                   # run in dev mode
npm run lint                  # check code style
```

## How It Works

ecb-mcp translates your AI agent's natural language questions into SDMX series key queries against the ECB API. For example, when Claude asks for the EUR/USD rate, ecb-mcp:

1. Builds the SDMX key: `D.USD.EUR.SP00.A`
2. Fetches CSV from `https://data-api.ecb.europa.eu/service/data/EXR/D.USD.EUR.SP00.A?format=csvdata`
3. Parses the response and returns clean, human-readable data

For dataset discovery, ecb-mcp fetches and parses XML metadata from the ECB's structure definition endpoints, letting your agent explore all 100+ datasets without knowing SDMX.

## License

MIT
