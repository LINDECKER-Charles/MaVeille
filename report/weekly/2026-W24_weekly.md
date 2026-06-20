---
week: 2026-W24
range: 2026-06-08/2026-06-14
type: weekly
categories: [Angular, CSharp, IA, Tech]
highlights: 5
---

# Rapport hebdo — Semaine W24 (2026-06-08 → 2026-06-14 2026)

Une trentaine de sujets marquants sur 4 catégories actives, autour de trois mouvements de fond. La **supply chain et les agents IA** sont devenus la première surface d'attaque de la semaine (worm npm `node-gyp`, RCE Langflow non patchée, « Agentjacking » via MCP). En parallèle, la **diffusion** fait son entrée dans l'inférence LLM avec `DiffusionGemma`, premier modèle par diffusion nativement supporté dans vLLM. Et **.NET 11 Preview 5** stabilise des nouveautés de langage majeures (union types, closed hierarchies) pendant qu'Angular reste en pause post-GA v22. Deux jours (12, 13 juin) sont sans digest.

## Supply chain & agents IA — la nouvelle surface d'attaque

Le maillon faible de la semaine, c'est ce que ta CI et tes agents *ingèrent*. Le worm npm `node-gyp` a piégé 57 paquets : code exécuté dès `npm install` (build natif), vol des secrets npm/GitHub/AWS/GCP/Azure/Vault/K8s, propagation automatique — mitige par `--ignore-scripts`, `npm ci` + lockfile et builds en conteneurs éphémères. La RCE Langflow `CVE-2026-5027` (path traversal sur `POST /api/v2/files`) est exploitée in-the-wild, ~7 000 instances exposées et **aucun patch** au 14 juin : à sortir d'Internet immédiatement. L'« Agentjacking » (12 juin) détourne un agent de code via un faux event poussé dans le serveur MCP Sentry, avec 85 % de réussite sur 100+ orgs testées — traite toute sortie MCP comme une entrée non fiable.

## .NET 11 Preview 5 — le langage change de modèle de domaine

Avant-dernière préversion avant la GA de novembre 2026. C# gagne les **union types & patterns** de première classe, les **closed hierarchies** (`switch` exhaustif garanti par le compilateur) et un `unsafe` plus explicite. Côté data : EF Core bascule en compat **SQL Server 2022 par défaut** (valide tes plans d'exécution), introduit le warning **EF1004** quand une requête async tourne en réalité en synchrone, et ajoute des checks de vulnérabilité/EOL au build. `dotnet ef database update --add` crée et applique une migration en une commande, idéal Aspire/conteneurs. Testable sur branche dès maintenant — de quoi repenser ta modélisation de domaine.

## IA open source — la semaine de l'efficience et de la diffusion

Début de semaine sur la mémoire et le débit, fin de semaine sur la diffusion comme nouveau levier de vitesse. **DiffusionGemma 26B-A4B** (Google, Apache 2.0) devient le premier LLM par diffusion nativement supporté dans vLLM : > 1000 tok/s sur H100, jusqu'à 4× un autorégressif — expérimental, à prototyper, pas à mettre en prod. **Gemma 4 QAT** offre −72 % de VRAM à qualité quasi inchangée (E2B sous 1 Go, Q4_0 directement chargeable dans Ollama/llama.cpp). Côté self-host, **North Mini Code 1.0** (Cohere, MoE 30B/3B, tient sur un seul H100) et **Mellum2** (JetBrains) sont des candidats sérieux pour des sous-agents/RAG privés. `vLLM v0.22.0 + EAGLE 3.1` apporte jusqu'à 2,03× de débit par utilisateur via une simple mise à jour de config rétrocompatible.

## Angular — semaine blanche post-GA v22

Aucune release ni advisory : l'écosystème digère la GA de la v22 (version stable courante **22.0.1**, GA du 3 juin). Rien d'urgent à migrer. C'est le bon moment pour consolider tes patterns **Signal Forms**, valider la migration **TypeScript 6** et tester le mode **zoneless** sur un projet pilote pendant que la doc et les retours communautaires s'étoffent.

## À retenir si tu n'as qu'une minute

- **Sors toute instance Langflow d'Internet** : `CVE-2026-5027` RCE non auth, exploitée, ~7 000 instances exposées, sans patch.
- **Durcis ta CI npm** : `--ignore-scripts`, `npm ci` + lockfile, builds en conteneurs éphémères contre le worm `node-gyp` (57 paquets).
- **.NET 11 Preview 5** : union types, closed hierarchies, EF Core en compat SQL Server 2022 par défaut + warning EF1004 — teste sur branche, GA en novembre.
- **DiffusionGemma** : 4× un autorégressif dans vLLM, mais attends des benchmarks tiers avant toute intégration.
- **Angular** : rien à migrer cette semaine, profite-en pour stabiliser Signal Forms et TypeScript 6.

## Index de la semaine

- **Tech** : sécurité sous très haute tension — supply chain, agents IA, infra critique — 12 sujets sur la semaine
- **IA** : efficience mémoire et entrée de la diffusion dans l'inférence LLM — 12 sujets sur la semaine
- **CSharp** : .NET 11 Preview 5 (langage + EF Core) et servicing de juin — 5 sujets sur la semaine
- **Angular** : semaine blanche, consolidation post-GA v22 — synthèse seule

---
*Généré le 2026-06-14 par la routine `weekly` (Claude Cowork).*
