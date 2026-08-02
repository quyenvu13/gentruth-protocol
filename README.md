# 👁️ GenTruth Protocol - The Universal AI Fact-Checking Oracle

![GenLayer AI](https://img.shields.io/badge/Powered_by-GenLayer_AI-blue?style=for-the-badge&logo=blockchain)
![React](https://img.shields.io/badge/Frontend-React_|_Vite-cyan?style=for-the-badge&logo=react)

**GenTruth Protocol** is a highly reusable, infrastructure-level Intelligent Contract deployed on **GenLayer**. 
It acts as a Universal Web3 Fact-Checker. Instead of every dApp building their own web-scraping and AI consensus logic, developers can simply integrate `GenTruth` into their smart contracts to verify any real-world claim using GenVM's Semantic Consensus.

---

## 🔗 Live Links
- **GenTruth dApp:** `[INSERT_YOUR_VERCEL_LINK_HERE]`
- **GenLayer Smart Contract:** [`0x84ec259564713b766F1B093905Cded802Abfb8F3`](https://explorer-studio.genlayer.com/address/0x84ec259564713b766F1B093905Cded802Abfb8F3)

---

## ✨ Why GenTruth? (The Problem it Solves)
Smart contracts are blind to the real world. They can execute math, but they cannot verify if a flight was delayed, if a politician won an election, or if a specific event occurred. 
While traditional Oracles (like Chainlink) provide numerical data (like price feeds), they **cannot verify semantic facts or text-based evidence**.

**GenTruth solves this.** It utilizes GenLayer's AI nodes to read news articles, scrape the web, and reach a decentralized consensus on subjective facts. 
It operates as a **Public Utility Contract**: Any other smart contract on GenLayer can call `GenTruth` to verify a statement and use the result to trigger automated payouts, insurance claims, or decentralized moderation.

---

## 🛠️ Architecture & Innovations

- **AI Semantic Consensus:** Powered by `gl.vm.run_nondet_unsafe`, dividing the workload between a Leader node (fetching web data and prompting the LLM) and Validator nodes (cross-verifying the exact reasoning).
- **Fail-Closed Web Engine:** Designed with strict `try-except` blocks around `gl.nondet.web.render`. If a URL is broken or blocks bots, it gracefully falls back to an `UNVERIFIABLE` status instead of reverting the blockchain state.
- **LLM Hallucination Safe-guard:** Contains a custom string parser in Python that aggressively strips Markdown artifacts (e.g., ```json) often injected by unpredictable LLMs, ensuring 100% deterministic JSON parsing.
- **Pluggable Architecture:** Exposes a simple `get_truth(request_id)` view function, making it frictionless for third-party developers to compose on top of GenTruth.

---

## 📜 How to Deploy the Intelligent Contract

The contract code is located in the root of this repository: `gentruth_oracle.py`.

1. Open [GenLayer Studio](https://studio.genlayer.com/).
2. Create a new Python file and paste the contents of `gentruth_oracle.py`.
3. Click **Deploy**.
4. To test, call `request_truth` with a statement and a list of URLs.
5. Call `resolve_truth` to trigger the AI Consensus network.
6. Call `get_truth` to read the final AI verdict (`TRUE`, `FALSE`, or `UNVERIFIABLE`).

---

## 💻 Local Setup (Frontend)

1. Clone the repository:
   ```bash
   git clone <YOUR_GITHUB_REPO_URL>
   cd gentruth-protocol
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run the development server:
   ```bash
   npm run dev
   ```

---
*Built for the GenLayer Hackathon.*
