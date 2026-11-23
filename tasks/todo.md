# Migration Docker — trading-journal + amber-terminal (PC Rachma)

## Contexte
pm2+WSL+portproxy = fragile (crash-loops, bugs isMain/ESM, conflits ports). Docker Desktop tourne déjà sur le PC de Rachma (sert denti/postiz/temporal). On bascule les 2 apps dedans, nginx reste pour router 8086/8090 (ou on le containerise aussi).

## Plan

- [ ] Backend: écrire `backend/Dockerfile` (python:3.11-slim, pip install -r requirements.txt, uvicorn main:app --host 0.0.0.0 --port 8011)
- [ ] Amber-terminal: écrire `amber-terminal/Dockerfile` (node:20-alpine, npm ci --omit=dev, node server.js, PORT=8090 HOST=0.0.0.0)
- [ ] Frontend: build React (REACT_APP_API_URL="") → servi par un container nginx (ou ajouté au container nginx existant)
- [ ] `docker-compose.yml` (sur le PC Rachma) avec 3 services : trading-journal-api, amber-terminal, nginx — réseau interne docker, ports publiés 8086/8090
- [ ] Volumes persistants : `trading_journal.db`, `uploads/`, données amber-terminal (data/) — monter les fichiers existants de Rachma dans les volumes pour ne rien perdre
- [ ] `.env` pour SUPABASE_URL/KEY passé au container backend
- [ ] Transférer code + Dockerfiles + compose sur le PC Rachma, build, lancer
- [ ] Stopper proprement les process pm2 actuels (api, trading-journal-api, amber-terminal) + désactiver nginx systemd (remplacé par le container) une fois Docker validé
- [ ] Vérifier : `http://192.168.1.165:8086/` et `:8090/` répondent, données existantes intactes (comptes, trades)
- [ ] Nettoyer : retirer règles portproxy/firewall si plus utilisées, documenter dans le repo (pas committer de secrets)

## Risques / décisions à valider avec l'utilisateur
- Le process `api` (pm2 id 0, `/srv/www/api/app/server.js`) tourne aussi sur le PC — pas touché, hors scope.
- Décidé : nginx reste systemd (pas containerisé), juste les 2 apps en Docker.

## Review

Migration faite et vérifiée sur le PC de Rachma.

- `backend/Dockerfile` + `.dockerignore` (python:3.11-slim, uvicorn direct)
- `amber-terminal/Dockerfile` + `.dockerignore` (node:20-alpine, pas de dépendances npm)
- `deploy/rachma-docker-compose.yml` — référence, placé sur Rachma à `/home/rachma/apps/docker-compose.yml`
- `amber-terminal/server.js` : ajout d'un env `ALLOWED_HOSTS` dans `allowed()` — nécessaire car dans un container, `os.networkInterfaces()` ne voit pas l'IP LAN réelle de l'hôte, donc le check d'origine (qui bloque tout sauf localhost/LAN détecté) rejetait les requêtes venant de `192.168.1.165`.

Bugs rencontrés en route :
- `venv/` du backend s'est retrouvé dans le contexte de build (105MB, symlinks cassés) → ajouté à `.dockerignore`.
- `requirements.txt` sur le PC de Rachma n'avait jamais été mis à jour avec `supabase` (installé à la main dans son venv à l'époque, jamais dans le fichier) → corrigé.
- Un `echo >>` sans retour à la ligne final a fusionné deux lignes du requirements.txt (`tzdatasupabase==2.34.1`) → corrigé.
- `network_mode: host` dans docker-compose ne marche PAS comme prévu sous Docker Desktop (Windows/WSL2) : il isole dans la VM interne de Docker (192.168.65.x), pas le vrai réseau de la machine. Abandonné en faveur du fix `ALLOWED_HOSTS`.
- Docker Desktop avait perdu l'intégration WSL en cours de route (à réactiver manuellement dans ses Settings).

Anciens process pm2 (`trading-journal-api`, `amber-terminal`) supprimés + `pm2 save`. nginx systemd reste en place, proxy toujours vers `127.0.0.1:8011` (le port publié par le container, transparent pour nginx). Les deux containers ont `restart: unless-stopped`.

Vérifié : `192.168.1.165:8086` (journal, 200, données intactes) et `:8090` (amber, 200) répondent depuis le LAN.

À noter : `backend/trading_journal.db.before_restore` (racine du repo local) reste non commité, comme avant — c'est un artefact de données, pas du code.
