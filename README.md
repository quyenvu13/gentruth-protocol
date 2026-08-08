# 🔮 GenTruth Protocol — Universal Web3 Fact-Checker Oracle

**Contract (GenVM StudioNet):** `0x0424726a235C6F86bFaD95a7e690fC7Fe9D61c07`  
**Explorer:** https://explorer-studio.genlayer.com/address/0x0424726a235C6F86bFaD95a7e690fC7Fe9D61c07  

An on-chain AI Oracle built on GenLayer that verifies real-world statements against web sources. Any dApp — prediction market, insurance, game, or governance contract — can request fact verification and consume the result via `get_truth()`.

Unlike traditional oracles (Chainlink, UMA) that only fetch numerical data, GenTruth performs **semantic verification**: it reads web pages, understands context, and returns a deterministic TRUE / FALSE / UNVERIFIABLE verdict through GenLayer's 5-validator AI consensus.

---

## How It Works

```
1. Any user/contract calls request_truth("id-1", "Statement to verify", '["https://source1.com"]')

2. Anyone calls resolve_truth("id-1") to trigger AI verification

3. Each of 5 validators independently:
   - Fetches up to 3 source URLs
   - Reads and understands the content
   - Compares evidence against the statement
   - Returns: {"verdict": "TRUE"} or {"verdict": "FALSE"} or {"verdict": "UNVERIFIABLE"}

4. Validators reach consensus → verdict stored on-chain

5. Any contract reads the result: get_truth("id-1") → {"status": "TRUE", ...}
```

---

## Contract Methods

| Method | Who | Description |
|---|---|---|
| `request_truth(request_id, statement, source_urls_json)` | Anyone | Submit a statement for verification. `source_urls_json` is a JSON string array, e.g. `'["https://example.com"]'` |
| `resolve_truth(request_id)` | Anyone | Trigger AI consensus to verify a pending request |
| `get_truth(request_id)` | Anyone | Read verification result (composable — other contracts can call this) |

---

## Architecture

| Property | Implementation |
|---|---|
| **AI Consensus** | `gl.eq_principle.prompt_non_comparative` — 5 validators independently fetch sources and evaluate |
| **Semantic Verification** | AI reads and understands web content, not just fetching numbers |
| **Fail-Closed** | Failed URL fetches gracefully handled — AI sees "Failed to load" and factors into verdict |
| **Composable** | `get_truth()` view function lets any on-chain contract consume verification results |
| **Source Limiting** | Max 3 URLs processed per request to stay within context limits |
| **Deterministic Output** | Verdict constrained to exactly TRUE / FALSE / UNVERIFIABLE / ERROR |

---

## Use Cases

- **Prediction Markets** — Resolve event outcomes: "Did Team X win the championship?"
- **Insurance** — Verify claim triggers: "Did a magnitude 6+ earthquake hit Region Y?"
- **Governance** — Fact-check proposals: "Has Protocol Z been audited by Firm W?"
- **Gaming** — Verify real-world events for on-chain game mechanics

---

## Example Usage

```
# Step 1: Submit a truth request
request_truth(
    "earthquake-2026",
    "A magnitude 7.0 earthquake hit Tokyo on August 1, 2026",
    '["https://earthquake.usgs.gov/earthquakes"]'
)

# Step 2: Trigger resolution
resolve_truth("earthquake-2026")

# Step 3: Read result (from any contract or frontend)
get_truth("earthquake-2026")
# → {"statement": "...", "sources": [...], "status": "FALSE", "requester": "0x..."}
```

---

## Tech Stack

- **Intelligent Contract:** Python on GenVM v0.2.16
- **AI Consensus:** `gl.eq_principle.prompt_non_comparative` — 5 independent validators
- **Web Fetch:** `gl.nondet.web.render` — each validator fetches sources independently
- **Data Format:** All complex params passed as JSON strings (GenVM requirement)
