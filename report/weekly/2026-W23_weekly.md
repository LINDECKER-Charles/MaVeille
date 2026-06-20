---
week: 2026-W23
range: 2026-06-01/2026-06-07
type: weekly
categories: [Angular, CSharp, IA, Tech]
highlights: 5
---

# Rapport hebdo — Semaine W23 (2026-06-01 → 2026-06-07 2026)

Plus de 40 sujets analysés sur 4 catégories actives, dans un alignement rare des trois piliers de la veille. **Angular 22 passe en GA** et stabilise tout l'arsenal signal-first, avec TypeScript 6 désormais imposé au toolchain. Côté IA ouverte, **MiniMax M3** devient le premier open-weight à tenir tête au frontier sur le coding agentique avec 1M de tokens de contexte. Et la **sécurité infra** a vécu une semaine sous tension maximale : RCE non authentifiée sur tous les contrôleurs de domaine, supply-chain npm « Miasma », NetScaler et Cisco SD-WAN exploités, à la veille d'un Patch Tuesday chargé.

## Angular 22 GA — le signal-first sort des flags

Le jalon de la semaine (3 juin) : Signal Forms, `httpResource`/`resource`, Selectorless Components et Angular Aria passent stable, avec le compilateur Rust Oxc (jusqu'à 20× plus rapide) à la clé. La migration impose **TypeScript 6** à tout ton toolchain (rupture universelle), mais `OnPush` par défaut ne concerne que les nouvelles apps générées via la CLI, pas l'existant. La newsletter officielle alerte sur les LLMs entraînés avant fin 2025 qui génèrent encore du `NgModule`-first et du `ChangeDetectionStrategy.Default` : vérifie ce que ton IA produit, et regarde le **Model Context Protocol** qui fait passer l'outillage du scaffolding CLI à un agent raisonnant sur tout le workspace.

## IA open source — l'open-weight atteint le frontier coding

La semaine la plus dense de la veille. **MiniMax M3** atteint 59,0 % sur SWE-Bench Pro (devant GPT-5.5 et Gemini 3.1 Pro) avec 1M de contexte et une architecture MSA qui divise par 20 le coût du contexte long — poids attendus sous ~10 jours sur Hugging Face, à valider par un benchmark tiers. **Mellum2** (JetBrains, MoE 12B/2,5B, Apache 2.0) cible la couche infra agentique (routage, RAG, sous-agents on-premise). **Ideogram 4** ouvre un text-to-image from scratch (DiT 9,3 Md, encodeur Qwen3-VL-8B) et **Holo3.1** apporte du computer-use open-weight exécutable en local. En clôture, Ollama 0.30 réintègre llama.cpp aux côtés de MLX et Transformers v5.10.1 ajoute Gemma 4 Unified et DeepSeek-OCR-2.

## Sécurité infra — semaine sous tension maximale

La post-compromission et l'infra critique dominent. **Netlogon CVE-2026-41089** (RCE SYSTEM non authentifiée sur tous les contrôleurs de domaine Windows Server 2012→2025) est exploitée in-the-wild : un seul DC non patché = tout l'AD compromis, patche dans la même fenêtre. La supply-chain npm « **Miasma** » a piégé 32 paquets Red Hat (96 versions, ~117K downloads/semaine, vol de credentials au `npm install`) : audite tes dépendances post-1er juin et fais tourner tes secrets CI. NetScaler `CVE-2026-3055` (fuite mémoire SAML IDP, CVSS 9.3) et le 7e zero-day Cisco SD-WAN de l'année sont exploités à grande échelle, sans patch pour ce dernier.

## .NET & data — virage agentique et PostgreSQL 19 Beta

Pas de release runtime .NET, mais Build 2026 a repositionné Windows, Azure et l'outillage autour des agents : Azure Linux 4.0 en préversion, WSL 3, Windows Agent Store, et un agent Copilot de modernisation .NET (upgrade du stack, Web Forms → Blazor, greffe d'Aspire) à tester sur branche isolée. VS Code 1.123 ajoute les sessions agent parallèles, le contexte 1M et le mode BYOK air-gapped. Côté data, **PostgreSQL 19 Beta 1** apporte l'autovacuum parallèle, l'I/O asynchrone auto-scalé (`io_min_workers`/`io_max_workers`) et `EXPLAIN (ANALYZE, IO)` — GA visée sept./oct. 2026, le bon moment pour benchmarker tes grosses tables. Le **GitHub Copilot SDK** passe en GA (API agentique embarquable, MCP natif, sandboxes isolées).

## À retenir si tu n'as qu'une minute

- **Patche tes contrôleurs de domaine** : Netlogon `CVE-2026-41089` RCE SYSTEM non auth, exploitée, Windows Server 2012→2025.
- **Audite tes dépendances npm post-1er juin** et fais tourner tes secrets CI après « Miasma » (32 paquets Red Hat).
- **Angular 22 GA** : Signal Forms/`httpResource`/Selectorless stables, mais TypeScript 6 obligatoire — planifie la migration toolchain.
- **MiniMax M3** : premier open-weight à battre le frontier sur SWE-Bench Pro (59,0 %), 1M de contexte — poids sous ~10 jours.
- **PostgreSQL 19 Beta 1** : autovacuum parallèle et I/O async — benchmarke tes grosses tables avant la GA d'automne.

## Index de la semaine

- **Tech** : infra critique sous tension (DC, VPN, supply-chain) + PostgreSQL 19 Beta — 18 sujets sur la semaine
- **IA** : l'open-weight atteint le frontier coding, vague de MoE compacts et permissifs — 16 sujets sur la semaine
- **Angular** : GA de la v22, API signal-first stables, migration TypeScript 6 — 4 sujets sur la semaine
- **CSharp** : virage agentique Build 2026, agent de modernisation .NET — 4 sujets sur la semaine

---
*Généré le 2026-06-07 par la routine `weekly` (Claude Cowork).*
