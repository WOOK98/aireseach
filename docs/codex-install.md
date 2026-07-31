# AIResearch Codex Personal Marketplace Setup

AIResearch is Claude Code first and Codex-compatible. The current Codex path is a personal marketplace setup that points at this
repository, not a public listing.

## What Is Included

- `deep-dive`: six-lens company research with falsifiable judgments.
- `snapshot`: a fast one-screen read on a company or ticker.
- `morning-brief`: a two-minute watchlist brief before the market day.
- `filing`: SEC filing lookup and page-anchored evidence extraction.

## Personal Marketplace Notes

The repository includes `.codex-plugin/plugin.json` with listing metadata for a
personal marketplace entry. Use the repository URL below when adding it to your
own Codex setup:

```text
https://github.com/WOOK98/aireseach
```

The hosted data layer is optional for the basic research flow. Beta access to
real-time quotes, ETF holdings, and SEC filing search is issued manually; email
hello@airesearchs.com if you need a key.

## Claude Code Primary Install

For Claude Code, use the tested marketplace commands:

```text
/plugin marketplace add WOOK98/airesearch-plugin
/plugin install airesearch@airesearch-marketplace
```
