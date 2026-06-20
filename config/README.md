# Configuration Apache (vhosts) — templates versionnés

Ce dossier contient les **templates** des virtual hosts Apache du VPS pour le site **Veille**
(front Angular **statique** : SSG / prerender, servi directement par Apache depuis un
`DocumentRoot`, **sans SSR ni reverse-proxy Node**). Les valeurs spécifiques à l'environnement
(domaines, chemins) sont externalisées en placeholders `${VAR}` et injectées au déploiement
depuis des **GitHub Secrets**.

> Les fichiers `*.conf` rendus ne sont **pas** versionnés (cf. `.gitignore`). Seuls les
> `*.conf.template` le sont.

## Mapping templates → sites Apache

| Template | Site déployé (`/etc/apache2/sites-enabled/`) | Rôle |
|---|---|---|
| `veille.conf.template` | `veille.conf` | Prod :80 → redirige HTTPS (301) |
| `veille-le-ssl.conf.template` | `veille-le-ssl.conf` | Prod :443 → site statique (SPA fallback, headers durcis) |
| `veille-test.conf.template` | `veille-test.conf` | Test :80 → redirige HTTPS (301) |
| `veille-test-le-ssl.conf.template` | `veille-test-le-ssl.conf` | Test :443 → site statique (idem prod + `X-Robots-Tag: noindex`) |

Le fallback SPA est assuré par `FallbackResource /index.html` : toute requête sans fichier
correspondant est servie par `index.html`, ce qui laisse le routing client-side Angular résoudre
la route. Aucun `ProxyPass`.

## Secrets GitHub à créer

> ⚠️ Ce ne sont pas des secrets cryptographiques (les vhosts ne contiennent aucune clé). Ils sont
> stockés en *Secrets* par homogénéité avec l'existant et pour ne pas exposer la topologie dans un
> repo public.

`Settings → Secrets and variables → Actions → New repository secret`

| Secret | Valeur de référence |
|---|---|
| `VEILLE_PROD_DOMAIN` | `veille.charles-lindecker.com` |
| `VEILLE_TEST_DOMAIN` | `test.veille.charles-lindecker.com` |
| `VEILLE_PROD_DOCROOT` | `/var/www/veille` |
| `VEILLE_TEST_DOCROOT` | `/var/www/veille-test` |

### Secrets existants réutilisés (déjà présents)

| Secret | Rôle |
|---|---|
| `VPS_IP` | Hôte SSH cible |
| `VPS_USER` | Utilisateur SSH |
| `SSH_PRIVATE_KEY` | Clé privée de déploiement |

## Prérequis VPS : sudoers

Le step de synchro utilise `sudo` sans TTY. `VPS_USER` doit pouvoir exécuter sans mot de passe les
commandes de déploiement Apache. Ajouter via `sudo visudo -f /etc/sudoers.d/apache-deploy` :

```
<VPS_USER> ALL=(root) NOPASSWD: /bin/cp, /usr/sbin/apache2ctl, /bin/systemctl reload apache2
```

(Adapter les chemins selon `command -v cp apache2ctl systemctl` sur le VPS.)

> Les vhosts sont des fichiers réels dans `sites-enabled/` (pas des symlinks `a2ensite`) :
> le déploiement écrase directement ces fichiers, sans `a2ensite`.

## Rendu local (debug)

Le rendu utilise `envsubst` avec une **allowlist explicite** : indispensable pour NE PAS substituer
`${APACHE_LOG_DIR}`, qui est résolu par Apache au runtime.

```bash
export VEILLE_PROD_DOMAIN=veille.charles-lindecker.com
export VEILLE_TEST_DOMAIN=test.veille.charles-lindecker.com
export VEILLE_PROD_DOCROOT=/var/www/veille
export VEILLE_TEST_DOCROOT=/var/www/veille-test

ALLOW='$VEILLE_PROD_DOMAIN $VEILLE_TEST_DOMAIN $VEILLE_PROD_DOCROOT $VEILLE_TEST_DOCROOT'

for t in *.conf.template; do
  envsubst "$ALLOW" < "$t" > "${t%.template}"
done
```

## Déploiement

`deploy-apache.yml` est un **workflow réutilisable** (`workflow_call`) qui rend les templates du
périmètre demandé, les copie sur le VPS, exécute `apache2ctl configtest` (bloquant), puis
`systemctl reload apache2`. En cas d'échec du `configtest`, le backup (`/tmp/apache-sites-backup-*`)
est restauré et le job échoue sans impacter les sites en ligne.

Il est appelé **après chaque déploiement réussi**, pour garantir que la config du VPS ne dérive
jamais du repo :

| Pipeline appelante | Déclenche sur | Vhosts réappliqués |
|---|---|---|
| `ci-cd-test.yml` (job `apply-apache-config`, `needs: [deploy-test, deploy-prod]`) | push `dev` | **les 4** : `veille`, `veille-le-ssl`, `veille-test`, `veille-test-le-ssl` |
| `ci-cd-prod.yml` (job `apply-apache-config`, `needs: deploy-prod`) | manuel (`workflow_dispatch`) | `veille`, `veille-le-ssl` |

> La livraison passe par `dev` : un push `dev` déploie **test ET prod** et réapplique donc les 4 vhosts.
> Une modif d'un template prod part en prod dès le prochain push `dev` (le gate étant la CI).

Apply manuel complet (les 4 vhosts) possible via **Actions → Deploy - Apache config → Run workflow**
(`workflow_dispatch`).
