# Sauvegarde cloud (email + mot de passe, Supabase)

- [x] Backend : endpoints `/api/auth/signup`, `/api/auth/login`, `/api/backup`, `/api/restore`, `/api/backup/status` (`backend/auth.py`, `backend/main.py`)
- [x] `backend/requirements.txt` : ajout `supabase==2.34.1`
- [x] `.env.example` + `backend/.env` : `SUPABASE_URL` / `SUPABASE_KEY`
- [x] Bucket Storage privé `backups` créé
- [x] RLS policies (insert/update/select scopées par `auth.uid()`) appliquées
- [x] Frontend : onglet "Compte" dans Réglages (`frontend/src/components/Settings.js`, `frontend/src/api.js`)
  - formulaire signup/login, session dans `localStorage`
  - "Sauvegarder maintenant", "Restaurer dernière sauvegarde" (confirm), "Se déconnecter"
  - affichage date dernière sauvegarde
- [x] Test signup end-to-end dans le navigateur (compte alkahftrade@gmail.com créé, 200 OK, message de confirmation affiché)
- [x] Désactivé "Confirm email" dans Supabase (lien de confirmation cassé par le scanner anti-spam de Gmail, otp_expired)
- [x] Test login + backup + restore end-to-end via l'API (200 OK, taille 110592 octets, safety copy créée avant restore)
- [ ] Test "autre PC" : copier le projet ailleurs, login même compte, restore, vérifier mêmes trades

## Review

**Bug corrigé (root cause) :** `compute_manual_pnl` dans `backend/main.py` ignorait le multiplicateur futures ($/point). Le calcul manuel de P&L ne matchait pas `_recalculate_and_save` (qui l'avait déjà). Corrigé en passant `instrument_type`/`ticker` et en réutilisant `FUTURES_MULTIPLIERS`. Vérifié sur les 3 trades NinjaTrader du 04/11 : total exact -$229.

**Nouvelle feature : sauvegarde cloud.** Architecture choisie : Supabase (BaaS gratuit) pour auth email/password + Storage, FastAPI local reste un simple client. Pas de système maison (hash/JWT), pas de serveur toujours-allumé à gérer.

- `backend/auth.py` : logique Supabase isolée (signup/login/backup/restore/status). Aucun mot de passe stocké par notre code.
- Backup = snapshot SQLite cohérent (`sqlite3.Connection.backup`) uploadé dans `backups/{user_id}/journal.db`.
- Restore garde une copie de sécurité locale (`trading_journal.db.before_restore`) avant d'écraser.
- RLS sur `storage.objects` : chaque utilisateur ne peut lire/écrire que son propre dossier (`auth.uid()`).
- Frontend : session (access/refresh token) stockée en `localStorage`, pas de mot de passe stocké côté client.

**À savoir :**
- Fichier `.env` racine (créé par erreur pendant le debug) est maintenant mort — `backend/.env` est le seul lu par `load_dotenv()`. À supprimer si tu veux (pas fait, suppression = action destructive à confirmer).
- Trade #30 : exécution fantôme dupliquée toujours pas supprimée (`DELETE /api/trades/30/executions/1` bloqué par la policy Bash). À faire toi-même ou à confirmer explicitement.
- Nouveau fichier `.claude/launch.json` créé pour pouvoir prévisualiser le frontend (craco, port 3010 via `PORT=3010`).

---

## Historique

(contenu précédent conservé — session NinjaTrader du 04/11/2026, bug multiplicateur futures, etc.)
