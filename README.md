# mire-diag

Assistant de diagnostic de connexion - site statique.

## Description

**mire-diag** est un outil web statique qui guide les utilisateurs pas a pas dans le diagnostic de leurs problemes de connexion a des services SSH, VNC (over TLS) ou web, depuis Windows, macOS ou Linux.

Ses objectifs :
- Guider les utilisateurs peu experimentes pour collecter des informations de diagnostic
- Adapter les commandes a l'OS et au client utilise
- Afficher automatiquement les adresses IPv4/IPv6 publiques de l'utilisateur
- Generer un rapport structure pret a coller dans un ticket de support

**Tout fonctionne cote client** : aucune donnee n'est envoyee a un serveur.

## Acces

Site disponible sur GitHub Pages : https://vignemail1.github.io/mire-diag/

## Fonctionnalites

### Bandeau IP (visible des l'ouverture)
- Detection automatique de l'IPv4 et IPv6 publiques via des APIs tierces
- Bouton "Copier" pour chaque adresse, avec feedback visuel
- Fallback si une version IP n'est pas disponible

### Wizard en 6 etapes

| Etape | Contenu |
|-------|---------|
| 1 | Choix service (SSH/VNC/Web), OS, client, adresse, port, VPN/proxy, message d'erreur |
| 2 | Resolution DNS - commande adaptee a l'OS |
| 3 | Test de connectivite reseau (ping) |
| 4 | Chemin reseau (traceroute / mtr) |
| 5 | Test de connexion au service (nc, ssh -vv, curl, Test-NetConnection) |
| 6 | Rapport structure pret a coller dans un ticket |

### Services et clients supportes

**SSH**
- Windows : OpenSSH (PowerShell/CMD), SSH via WSL, MobaXterm
- macOS / Linux : SSH natif

**VNC (over TLS)**
- Tous OS : TurboVNC, TigerVNC / autre client compatible
- Commandes de test : `nc -zv`, `Test-NetConnection`, `openssl s_client`

**Web**
- Windows : Chrome, Firefox, Edge
- macOS : Chrome, Firefox, Safari
- Linux : Chrome/Chromium, Firefox
- Test avec `curl -v`

### Commandes de diagnostic generees

| Test | Windows | macOS/Linux |
|------|---------|-------------|
| DNS | `nslookup` | `dig +short` / `host` |
| Ping | `ping -n 5` | `ping -c 5` |
| Traceroute | `tracert` | `traceroute` / `mtr` |
| Test TCP | `Test-NetConnection` | `nc -zv` |
| SSH verbose | `ssh -vv` | `ssh -vv` |
| Web | `curl -v` | `curl -v` |

## Structure du depot

```
mire-diag/
|-- index.html              # Page principale, wizard HTML
|-- assets/
|   |-- css/
|   |   `-- style.css       # Feuille de style
|   `-- js/
|       |-- ip-detect.js    # Detection IPv4/IPv6 (bandeau)
|       |-- commands.js     # Dictionnaire des commandes par OS/service
|       |-- wizard.js       # Logique navigation et mise a jour dynamique
|       `-- report.js       # Generation du rapport final
`-- README.md
```

## Confidentialite

- Aucune donnee saisie n'est transmise a un serveur
- Les adresses IP sont detectees via des requetes vers `api4.ipify.org` et `api6.ipify.org` (ou equivalents)
- Tout le traitement se fait dans le navigateur
- Aucun cookie, aucun tracking, aucun script tiers sauf les endpoints IP

## Deploiement

Le site est servi directement par GitHub Pages depuis la branche `main`.
Il peut aussi etre heberge sur n'importe quel serveur web statique (Nginx, Apache, Caddy, etc.) sans configuration specifique.

## Licence

MIT
