# AIResearch

AIResearch is a Claude Code first, Codex-compatible research plugin and web
workspace for company research. It focuses on entity-locked decision support:
six-lens deep dives, fast snapshots, morning briefs, and filing-backed evidence.

## Claude Code Install

Run these commands in Claude Code:

```text
/plugin marketplace add WOOK98/airesearch-plugin
/plugin install airesearch@airesearch-marketplace
```

The same commands are shown on the website install page:

```text
https://www.airesearchs.com/install
```

## Codex / ChatGPT

This repository includes `.codex-plugin/plugin.json` for personal marketplace
setup. See:

```text
docs/codex-install.md
```

AIResearch is not distributed through a public Codex or ChatGPT listing at
this time.

## Skills

- `deep-dive`: six-lens company research with falsifiable judgments.
- `snapshot`: a fast one-screen read on a company or ticker.
- `morning-brief`: a two-minute watchlist brief before the market day.
- `filing`: SEC filing lookup and page-anchored evidence extraction.

## Data Access

No API key is required for the basic research flow; it can use web search. Beta
access to the hosted data layer for real-time quotes, ETF holdings, and SEC
filing search is issued manually. Contact hello@airesearchs.com.
