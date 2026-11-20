# MultiView Web

Version navigateur simplifiée de [MultiView](https://github.com/Aeternoxx/Multiview) :
regardez plusieurs **flux OBS partagés en WHEP / WebRTC** (par exemple via
**MediaMTX**) côte à côte sur une simple page web, hébergeable gratuitement sur
**Cloudflare Pages**.

Aucune dépendance, aucun build : trois fichiers statiques (`index.html`,
`styles.css`, `app.js`) servis tels quels.

## Ce qui est conservé depuis l'application desktop

- **Flux multiples** — grille de tuiles vidéo, réordonnables par glisser-déposer.
- **Client WHEP faible latence** — jitter buffer vidéo minimal, remontée
  automatique de la cible seulement si la gigue réseau reste élevée,
  résorption du retard par légère accélération de lecture.
- **Reconnexion automatique** — backoff 1/2/4/8/15 s pendant une fenêtre de
  5 minutes après une coupure réseau ou un redémarrage d'OBS, puis retour à
  l'état arrêté avec veille de disponibilité.
- **Sondage de disponibilité** — chaque flux arrêté est testé en arrière-plan
  (vraie session WHEP courte, pas un simple ping) : voyant vert = flux
  détecté, rouge = flux absent. La lecture est bloquée tant que le flux n'est
  pas détecté.
- **Statistiques en direct** — débit, images/s, résolution, tampon vidéo,
  gigue et images perdues par flux.
- **Audio par flux** — volume, coupure et mode solo.
- **Gestion des flux** — ajout, renommage, modification, suppression (avec
  confirmation), URL normalisées.
- **Plein écran et redimensionnement** des tuiles (poignée en bas à droite).
- **Import / export** — fichier `multiview-streams.json` **compatible avec
  l'application desktop** dans les deux sens.
- **Paramètres STUN / TURN** et **stockage local** (mêmes clés `localStorage`
  que le desktop, mais le stockage du navigateur est séparé de celui de
  l'application).
- **Interface FR / EN** identique, mêmes couleurs et composants.

## Ce qui est retiré (volontairement)

- **Fenêtres flottantes, épinglage, overlay "toujours au-dessus"** : le
  navigateur ne peut pas maintenir une fenêtre vidéo par-dessus un autre
  écran/application. Le plein écran par tuile et le redimensionnement les
  remplacent.
- Mise à jour automatique et intégration Electron (redondants pour une page
  web servi en continu).

## Prérequis du serveur de flux (important)

La page est servie en HTTPS par Cloudflare, ce qui impose deux choses :

1. **HTTPS obligatoire côté serveur WHEP.** Une page HTTPS ne peut pas appeler
   une URL `http://` (bloquée comme contenu mixte). Le serveur MediaMTX doit
   être joignable en `https://` avec un certificat que le navigateur du spectateur
   fait confiance (par exemple via un tunnel Cloudflare, Tailscale certs, ou un
   vrai certificat).
2. **CORS autorisé sur le serveur WHEP.** Dans `mediamtx.yml` :

   ```yaml
   webrtcAllowOrigin: "*"
   ```

   (ou la domaine exact de ton site Pages pour être plus strict). Sans cet
   en-tête, la négociation SDP est bloquée par le navigateur.

Sans STUN/TURN configurés, seuls les candidats locaux sont utilisés : parfait
sur le même réseau (LAN). Pour traverser Internet, renseigne un serveur STUN
ou TURN dans **Paramètres**.

## Permissions navigateur (IMPORTANT avec une page HTTPS)

Depuis une page servie en ligne (comme `*.pages.dev`), les navigateurs modernes
bloquent l'accès aux adresses **locales/privées** (restrictions « mixed content »
et « accès au réseau local ») :

- **Chrome / Edge** : si le MediaMTX est sur le réseau local, autorise
  **« Accès au réseau local »** pour le site (icône de réglages dans la barre
  d'adresse, ou `chrome://settings/content/localNetworkAccess`). Sans ça, les
  flux restent « indisponibles » alors que tout fonctionne en `http://localhost`.
- **Safari (macOS/iOS)** : une invitation « réseau local » apparaît la première
  fois — l'accepter.
- Les spectateurs **hors du réseau local** ne sont pas concernés par cette
  permission, mais il faut alors rediriger l'**UDP 8189** (port ICE de MediaMTX)
  du routeur vers la machine MediaMTX pour que WebRTC les atteigne.

## Déploiement sur Cloudflare Pages

### Option A — via GitHub (recommandé)

1. Pousse ce dossier dans un dépôt GitHub.
2. Cloudflare dashboard → **Workers & Pages → Create → Pages → Connect to Git**.
3. Sélectionne le dépôt, puis :
   - Framework preset : **None**
   - Build command : *(vide)*
   - Build output directory : **`/`** (racine du dépôt)
4. **Save and Deploy** — chaque push redéploie automatiquement.

### Option B — via Wrangler

```powershell
npx wrangler pages deploy . --project-name multiview-web
```

### Option C — glisser-déposer

Dashboard → Workers & Pages → Create → Pages → **Direct Upload**, puis dépose
les fichiers.

## Développement local

```powershell
# depuis ce dossier
python -m http.server 8123
# puis ouvrir http://localhost:8123
```

En local (`http://localhost`), des URL WHEP `http://` fonctionnent aussi, ce
qui est pratique pour tester sur un MediaMTX du LAN sans certificat.

## Conseils faible latence (inchangés depuis le README desktop)

MultiView Web demande déjà le plus petit tampon de lecture possible et ne
l'augmente que si la gigue mesurée reste élevée. La latence du tampon vidéo
est affichée dans le panneau **Statistiques**. L'essentiel de la latence
restante vient de l'encodeur :

- **OBS, x264 :** `tune=zerolatency`, B-frames `0`, intervalle d'images clés `1 s`, `scenecut=0`, CBR.
- **OBS, NVENC :** preset faible latence, look-ahead désactivé, B-frames `0`.
- **Audio :** Opus 48 kHz, trames de 20 ms (10 ms si ton serveur le permet), FEC activé, DTX désactivé.
- **Réseau :** évite le relais TURN quand le serveur est sur le même réseau, il ajoute un aller-retour.

## Confidentialité

Comme sur desktop, la liste des flux (et les paramètres STUN/TURN) reste dans
le `localStorage` du navigateur. Les URL peuvent contenir des jetons : nettoie-les
avant de partager un fichier exporté.
