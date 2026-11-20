'use strict'

/* ============================================================================
 * MultiView Web — version navigateur simplifiée de MultiView (Electron).
 *
 * Logique portée fidèlement depuis l'application desktop :
 *   - client WHEP (lib/whep.ts) : offer recvonly, timeout, DELETE du session
 *   - latence (lib/latency.ts) : jitterBufferTarget mini + résorption du retard
 *   - reconnexion (lib/backoff.ts) : fenêtre de 5 min, backoff 1/2/4/8/15 s
 *   - sondes de disponibilité (lib/probe.ts, hooks/useStreamAvailability.ts)
 *   - statistiques live, audio par flux + solo, import/export JSON identique
 *
 * La partie « fenêtres flottantes » de l'application desktop est volontairement
 * absente : le navigateur ne permet pas de maintenir des fenêtres vidéo au
 * dessus d'un autre écran. Le plein écran et le redimensionnement des tuiles
 * la remplacent.
 * ==========================================================================*/

/* ----------------------------- i18n -------------------------------------- */

const FR = {
  'app.tagline': 'Lecteur de flux WHEP / WebRTC',
  'header.addStream': 'Ajouter un flux',
  'header.settings': 'Paramètres',
  'form.namePlaceholder': 'Ex. Vue du joueur',
  'form.urlPlaceholder': 'https://server.example.com/camera/whep',
  'form.add': 'Ajouter',
  'form.cancel': 'Annuler',
  'form.hint':
    'Les flux ne démarrent pas automatiquement. Le voyant indique si le flux est disponible.',
  'form.invalidUrl': 'URL invalide : utilise une adresse http:// ou https://.',
  'form.duplicateUrl': 'Ce flux est déjà dans la liste.',
  'empty.title': 'Votre espace vidéo est prêt',
  'empty.body': 'Ajoutez un flux WHEP pour commencer.',
  'empty.action': 'Ajouter votre premier flux',
  'workspace.title': 'Vue principale',
  'workspace.count': '{count} flux configuré(s)',
  'stream.status.stopped': 'Arrêté',
  'stream.status.checking': 'Vérification du flux…',
  'stream.status.online': 'flux détecté',
  'stream.status.offline': 'flux absent',
  'stream.status.connecting': 'Connexion WebRTC…',
  'stream.status.negotiating': 'Connexion au serveur WHEP…',
  'stream.status.waiting': 'Négociation terminée, attente du flux…',
  'stream.status.live': 'Connecté · WHEP',
  'stream.status.disconnected': 'Connexion interrompue — reconnexion…',
  'stream.status.error': 'Erreur de connexion',
  'stream.start': 'Lancer le flux',
  'stream.stop': 'Arrêter le flux',
  'stream.edit': 'Modifier le flux',
  'stream.settings.title': 'Paramètres du flux',
  'stream.settings.save': 'Enregistrer',
  'stream.delete': 'Supprimer le flux',
  'stream.deleteLabel': 'Supprimer {name}',
  'stream.delete.title': 'Supprimer le flux',
  'stream.delete.message': '« {name} » sera retiré de MultiView. Cette action est définitive.',
  'stream.delete.confirm': 'Supprimer',
  'stream.name': 'Nom du flux',
  'stream.url': 'URL du flux WHEP',
  'stream.fullscreen': 'Plein écran',
  'stream.exitFullscreen': 'Quitter le plein écran',
  'stream.mute': 'Couper le son',
  'stream.unmute': 'Activer le son',
  'stream.volume': 'Volume',
  'stream.volumeFor': 'Volume de {name}',
  'stream.solo': 'Audio seul',
  'stream.soloHint': 'Couper les autres flux',
  'stream.resize': 'Redimensionner {name}',
  'stream.resizeHint': 'Redimensionner en conservant le ratio vidéo',
  'stream.stats': 'Statistiques',
  'stream.offlineHint':
    'Aucun flux détecté sur ce serveur. La lecture sera possible dès que la diffusion sera active.',
  'stream.startUnavailable': 'Flux indisponible — lecture désactivée',
  'stream.retry': 'Réessayer',
  'stats.bitrate': 'Débit',
  'stats.fps': 'Images/s',
  'stats.resolution': 'Résolution',
  'stats.buffer': 'Tampon vidéo',
  'stats.dropped': 'Images perdues',
  'stats.jitter': 'Gigue',
  'availability.online': 'Flux disponible',
  'availability.offline': 'Flux indisponible',
  'availability.checking': 'Vérification en cours',
  'error.http': 'Erreur HTTP {status}',
  'error.timeout': 'Le serveur WHEP ne répond pas (délai dépassé).',
  'error.network': 'Connexion au serveur impossible. Vérifie l’URL et le réseau.',
  'error.protocol': 'Réponse WHEP invalide : {message}',
  'error.unknown': 'Erreur inconnue : {message}',
  'settings.title': 'Paramètres',
  'settings.close': 'Fermer',
  'settings.network.title': 'Réseau (avancé)',
  'settings.network.stun': 'Serveur STUN',
  'settings.network.turn': 'Serveur TURN',
  'settings.network.username': 'Identifiant TURN',
  'settings.network.password': 'Mot de passe TURN',
  'settings.network.hint':
    'Laisse vide pour utiliser la configuration par défaut. Un serveur TURN est nécessaire si ton réseau bloque les flux.',
  'settings.data.title': 'Données',
  'settings.data.export': 'Exporter les flux',
  'settings.data.import': 'Importer des flux',
  'settings.data.reset': 'Réinitialiser la disposition',
  'settings.data.resetHint': 'Les tailles de tuiles seront oubliées.',
  'settings.notice.exported': 'Flux exportés.',
  'settings.notice.exportFailed': 'Export impossible.',
  'settings.notice.imported': '{count} flux importé(s).',
  'settings.notice.importSkipped': '{count} entrée(s) ignorée(s).',
  'settings.notice.importFailed': 'Aucun flux importé.',
  'settings.notice.reset': 'Disposition réinitialisée.',
  'footer.support': 'Ko-fi'
}

const EN = {
  'app.tagline': 'WHEP / WebRTC stream viewer',
  'header.addStream': 'Add stream',
  'header.settings': 'Settings',
  'form.namePlaceholder': 'e.g. Player view',
  'form.urlPlaceholder': 'https://server.example.com/camera/whep',
  'form.add': 'Add',
  'form.cancel': 'Cancel',
  'form.hint':
    'Streams do not start automatically. The indicator shows whether the stream is available.',
  'form.invalidUrl': 'Invalid URL: use an http:// or https:// address.',
  'form.duplicateUrl': 'This stream is already in the list.',
  'empty.title': 'Your video space is ready',
  'empty.body': 'Add a WHEP stream to get started.',
  'empty.action': 'Add your first stream',
  'workspace.title': 'Main view',
  'workspace.count': '{count} configured stream(s)',
  'stream.status.stopped': 'Stopped',
  'stream.status.checking': 'Checking stream…',
  'stream.status.online': 'stream detected',
  'stream.status.offline': 'stream unavailable',
  'stream.status.connecting': 'Connecting WebRTC…',
  'stream.status.negotiating': 'Connecting to WHEP server…',
  'stream.status.waiting': 'Negotiation complete, waiting for stream…',
  'stream.status.live': 'Connected · WHEP',
  'stream.status.disconnected': 'Connection interrupted — reconnecting…',
  'stream.status.error': 'Connection error',
  'stream.start': 'Start stream',
  'stream.stop': 'Stop stream',
  'stream.edit': 'Edit stream',
  'stream.settings.title': 'Stream settings',
  'stream.settings.save': 'Save',
  'stream.delete': 'Delete stream',
  'stream.deleteLabel': 'Delete {name}',
  'stream.delete.title': 'Delete stream',
  'stream.delete.message': '“{name}” will be removed from MultiView. This cannot be undone.',
  'stream.delete.confirm': 'Delete',
  'stream.name': 'Stream name',
  'stream.url': 'WHEP stream URL',
  'stream.fullscreen': 'Fullscreen',
  'stream.exitFullscreen': 'Exit fullscreen',
  'stream.mute': 'Mute',
  'stream.unmute': 'Unmute',
  'stream.volume': 'Volume',
  'stream.volumeFor': 'Volume for {name}',
  'stream.solo': 'Solo audio',
  'stream.soloHint': 'Mute the other streams',
  'stream.resize': 'Resize {name}',
  'stream.resizeHint': 'Resize while preserving video aspect ratio',
  'stream.stats': 'Statistics',
  'stream.offlineHint':
    'No stream detected on this server. Playback will be available as soon as the stream goes live.',
  'stream.startUnavailable': 'Stream unavailable — playback disabled',
  'stream.retry': 'Retry',
  'stats.bitrate': 'Bitrate',
  'stats.fps': 'FPS',
  'stats.resolution': 'Resolution',
  'stats.buffer': 'Video buffer',
  'stats.dropped': 'Dropped frames',
  'stats.jitter': 'Jitter',
  'availability.online': 'Stream available',
  'availability.offline': 'Stream unavailable',
  'availability.checking': 'Checking',
  'error.http': 'HTTP error {status}',
  'error.timeout': 'The WHEP server is not responding (timed out).',
  'error.network': 'Unable to reach the server. Check the URL and your network.',
  'error.protocol': 'Invalid WHEP answer: {message}',
  'error.unknown': 'Unknown error: {message}',
  'settings.title': 'Settings',
  'settings.close': 'Close',
  'settings.network.title': 'Network (advanced)',
  'settings.network.stun': 'STUN server',
  'settings.network.turn': 'TURN server',
  'settings.network.username': 'TURN username',
  'settings.network.password': 'TURN password',
  'settings.network.hint':
    'Leave empty to use the default configuration. A TURN server is required when your network blocks streams.',
  'settings.data.title': 'Data',
  'settings.data.export': 'Export streams',
  'settings.data.import': 'Import streams',
  'settings.data.reset': 'Reset layout',
  'settings.data.resetHint': 'Tile sizes will be forgotten.',
  'settings.notice.exported': 'Streams exported.',
  'settings.notice.exportFailed': 'Export failed.',
  'settings.notice.imported': '{count} stream(s) imported.',
  'settings.notice.importSkipped': '{count} entr(y/ies) skipped.',
  'settings.notice.importFailed': 'No stream imported.',
  'settings.notice.reset': 'Layout reset.',
  'footer.support': 'Ko-fi'
}

let language = 'FR'

function t(key, vars) {
  const dict = language === 'EN' ? EN : FR
  let text = dict[key] ?? FR[key] ?? key
  if (vars) {
    for (const [name, value] of Object.entries(vars)) {
      text = text.replaceAll(`{${name}}`, String(value))
    }
  }
  return text
}

/* ----------------------------- icônes ------------------------------------ */

const ICONS = {
  play: '<path d="M8 5.2 18.6 12 8 18.8Z" fill="currentColor" stroke="none"/>',
  stop: '<rect x="6.5" y="6.5" width="11" height="11" rx="1.6" fill="currentColor" stroke="none"/>',
  edit:
    '<path d="M4 20h4.2L19 9.2a2 2 0 0 0 0-2.8l-1.4-1.4a2 2 0 0 0-2.8 0L4 15.8V20Z"/>' +
    '<path d="M14.4 6.6 17.4 9.6"/>',
  trash: '<path d="M4 7h16M9 7V4h6v3m-9 0 1 13h10l1-13M10 11v5m4-5v5"/>',
  fullscreen:
    '<path d="M4 9V5.5A1.5 1.5 0 0 1 5.5 4H9M20 9V5.5A1.5 1.5 0 0 0 18.5 4H15M4 15v3.5A1.5 1.5 0 0 0 5.5 20H9M20 15v3.5a1.5 1.5 0 0 1-1.5 1.5H15"/>',
  exitFullscreen: '<path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5"/>',
  stats: '<path d="M4 20h16"/><path d="M7.5 20v-6M12 20V7.5M16.5 20v-9"/>',
  volume:
    '<path d="M4 9.5h3L11 6v12l-4-3.5H4Z"/><path d="M15 9.2a4 4 0 0 1 0 5.6"/>' +
    '<path d="M17.6 6.6a7.5 7.5 0 0 1 0 10.8"/>',
  mute:
    '<path d="M4 9.5h3L11 6v12l-4-3.5H4Z"/><path d="M15.8 9.8l4.4 4.4M20.2 9.8l-4.4 4.4"/>',
  solo:
    '<path d="M4 15v-2.5a8 8 0 0 1 16 0V15"/><path d="M4 15h3v5H5.5A1.5 1.5 0 0 1 4 18.5Z"/>' +
    '<path d="M20 15h-3v5h1.5A1.5 1.5 0 0 0 20 18.5Z"/>',
  close: '<path d="M6 6l12 12M18 6 6 18"/>',
  refresh: '<path d="M20 12a8 8 0 1 1-2.4-5.7"/><path d="M20 4v5h-5"/>',
  offline: '<circle cx="12" cy="12" r="8"/><path d="M6.6 17.4 17.4 6.6"/>',
  spinner: '<circle cx="12" cy="12" r="8" opacity="0.25"/><path d="M20 12a8 8 0 0 0-8-8"/>'
}

function icon(name, size = 16, cls) {
  const className = cls ? `icon ${cls}` : 'icon'
  return (
    `<svg class="${className}" viewBox="0 0 24 24" width="${size}" height="${size}" ` +
    'fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" ' +
    `stroke-linejoin="round" aria-hidden="true" focusable="false">${ICONS[name]}</svg>`
  )
}

/* --------------------------- utilitaires --------------------------------- */

function newStreamId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

/**
 * Normalise une saisie utilisateur en URL WHEP exploitable :
 * `server.local/cam/whep` devient `https://server.local/cam/whep`.
 */
function normalizeStreamUrl(input) {
  const trimmed = String(input ?? '').trim()
  if (!trimmed) return null

  const candidate = /^[a-z][a-z\d+.-]*:/i.test(trimmed) ? trimmed : `https://${trimmed}`

  try {
    const url = new URL(candidate)
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null
    if (!url.hostname) return null
    return url.toString()
  } catch {
    return null
  }
}

function isDuplicateStreamUrl(streams, url, ignoreId) {
  return streams.some((stream) => stream.id !== ignoreId && stream.url === url)
}

function nextDefaultName(streams) {
  const used = new Set()

  for (const stream of streams) {
    const match = /^Flux\s+(\d+)$/i.exec(stream.name)
    if (match) used.add(Number(match[1]))
  }

  let number = 1
  while (used.has(number)) number += 1

  return `Flux ${number}`
}

/* -------------------------- formatage / erreurs -------------------------- */

function formatBitrate(kbps) {
  if (kbps === null || !Number.isFinite(kbps)) return '—'
  if (kbps >= 1000) return `${(kbps / 1000).toFixed(1)} Mb/s`
  return `${Math.round(kbps)} kb/s`
}

function formatFps(fps) {
  if (fps === null || !Number.isFinite(fps)) return '—'
  return `${Math.round(fps)} fps`
}

function formatResolution(width, height) {
  if (!width || !height) return '—'
  return `${width}×${height}`
}

function formatCount(value) {
  if (value === null || !Number.isFinite(value)) return '—'
  return Math.round(value).toLocaleString(language === 'EN' ? 'en' : 'fr')
}

function formatMs(ms) {
  if (ms === null || !Number.isFinite(ms)) return '—'
  return `${Math.round(ms)} ms`
}

function describeWhepError(error) {
  switch (error.code) {
    case 'http':
      return t('error.http', { status: error.status ?? 0 })
    case 'timeout':
      return t('error.timeout')
    case 'network':
      return t('error.network')
    case 'protocol':
      return t('error.protocol', { message: error.message })
    default:
      return t('error.unknown', { message: error.message })
  }
}

/* ----------------------------- latence ----------------------------------- */

/**
 * Réglages de lecture faible latence, portés de lib/latency.ts : la cible du
 * jitter buffer vidéo reste au minimum pour réduire la latence verre à verre,
 * et n'est relevée que si la gigue mesurée reste élevée.
 */
const VIDEO_MIN_BUFFER_MS = 0
const VIDEO_SAFE_BUFFER_MS = 120
const AUDIO_BUFFER_MS = 50

const JITTER_HIGH_MS = 40
const JITTER_LOW_MS = 15
const HIGH_JITTER_SAMPLES = 3

const INITIAL_LATENCY_STATE = { targetMs: VIDEO_MIN_BUFFER_MS, highSamples: 0 }

function nextLatencyState(state, jitterMs) {
  if (jitterMs === null || !Number.isFinite(jitterMs)) return state

  if (jitterMs >= JITTER_HIGH_MS) {
    const highSamples = Math.min(state.highSamples + 1, HIGH_JITTER_SAMPLES)
    return {
      targetMs: highSamples >= HIGH_JITTER_SAMPLES ? VIDEO_SAFE_BUFFER_MS : state.targetMs,
      highSamples
    }
  }

  if (jitterMs <= JITTER_LOW_MS) {
    return { targetMs: VIDEO_MIN_BUFFER_MS, highSamples: 0 }
  }

  return { targetMs: state.targetMs, highSamples: 0 }
}

/* Au-delà de ce tampon accumulé, la lecture est accélérée pour résorber le
 * retard ; le rythme normal revient dès que le retard est comblé. */
const CATCH_UP_START_S = 0.4
const CATCH_UP_STOP_S = 0.15
const CATCH_UP_RATE = 1.06

function nextPlaybackRate(aheadSeconds, currentRate) {
  if (!Number.isFinite(aheadSeconds)) return 1
  if (aheadSeconds > CATCH_UP_START_S) return CATCH_UP_RATE
  if (aheadSeconds < CATCH_UP_STOP_S) return 1
  return currentRate
}

/**
 * Temps moyen passé dans le jitter buffer depuis le prélèvement précédent.
 * Les compteurs WebRTC sont cumulatifs : ce delta reflète la latence courante.
 */
function bufferDeltaMs(previous, current) {
  if (!previous || !current) return null

  const delay = current.delaySeconds - previous.delaySeconds
  const count = current.emittedCount - previous.emittedCount

  if (count <= 0 || delay < 0) return null

  return Math.round((delay / count) * 1000)
}

/* --------------------------- reconnexion --------------------------------- */

const RETRY_DELAYS_MS = [1000, 2000, 4000, 8000, 15000]

function retryDelay(attempt) {
  const index = Math.min(Math.max(0, Math.floor(attempt)), RETRY_DELAYS_MS.length - 1)
  return RETRY_DELAYS_MS[index]
}

/** Fenêtre de reconnexion avant de revenir à l'état arrêté (comme le desktop). */
const RECONNECT_WINDOW_MS = 5 * 60_000

/* --------------------------- client WHEP --------------------------------- */

class WhepError extends Error {
  constructor(code, message, status) {
    super(message)
    this.name = 'WhepError'
    this.code = code
    this.status = status
  }
}

function toWhepError(error) {
  if (error instanceof WhepError) return error

  if (error instanceof DOMException) {
    if (error.name === 'TimeoutError' || error.name === 'AbortError') {
      return new WhepError('timeout', 'timeout')
    }
    return new WhepError('network', error.message)
  }

  if (error instanceof TypeError) return new WhepError('network', error.message)

  return new WhepError('unknown', error instanceof Error ? error.message : String(error))
}

const DEFAULT_CONNECT_TIMEOUT_MS = 10_000
const DROP_GRACE_MS = 4_000

/** Résolution de la cueillette ICE peu après le dernier candidat. */
const ICE_IDLE_MS = 400
const ICE_MAX_MS = 4_000

function applyLowLatency(receiver, targetMs) {
  try {
    if ('jitterBufferTarget' in receiver) receiver.jitterBufferTarget = targetMs
  } catch {
    // Non pris en charge.
  }

  // Note deprecatede, toujours honorée par certains builds Chromium. Ne
  // s'applique qu'à la vidéo : forcee sur l'audio, elle fait crachoter le son.
  if (targetMs === VIDEO_MIN_BUFFER_MS) {
    try {
      receiver.playoutDelayHint = 0
    } catch {
      // Non pris en charge.
    }
  }
}

/**
 * Client WHEP minimal : une peer connection recvonly, un timeout explicite et
 * une fermeture qui libère la session côté serveur (DELETE sur la Location).
 */
class WhepSession {
  constructor(options = {}) {
    this.options = options
    this.pc = new RTCPeerConnection({ iceServers: options.iceServers ?? [] })
    this.pc.addTransceiver('video', { direction: 'recvonly' })
    this.pc.addTransceiver('audio', { direction: 'recvonly' })

    this.resourceUrl = null
    this.abortController = null
    this.dropTimer = undefined
    this.closed = false
    this.videoReceiver = null
    this.videoTargetMs = VIDEO_MIN_BUFFER_MS

    this.media = new MediaStream()
    this.lastBytes = 0
    this.lastStatsAt = 0
    this.lastBuffer = null

    this.pc.ontrack = (event) => {
      if (this.closed) return

      if (event.track.kind === 'video') {
        this.videoReceiver = event.receiver
        this.videoTargetMs = VIDEO_MIN_BUFFER_MS
        applyLowLatency(event.receiver, VIDEO_MIN_BUFFER_MS)
      } else {
        applyLowLatency(event.receiver, AUDIO_BUFFER_MS)
      }

      this.media.addTrack(event.track)
      this.options.onTrack?.(this.media)
    }

    this.pc.onconnectionstatechange = () => this.handleConnectionState()
  }

  handleConnectionState() {
    if (this.closed) return

    switch (this.pc.connectionState) {
      case 'connected':
        if (this.dropTimer) {
          clearTimeout(this.dropTimer)
          this.dropTimer = undefined
        }
        this.options.onStatus?.('live')
        break

      case 'disconnected':
        this.options.onStatus?.('disconnected')
        if (this.dropTimer) clearTimeout(this.dropTimer)
        this.dropTimer = setTimeout(() => {
          if (!this.closed) this.options.onDrop?.()
        }, DROP_GRACE_MS)
        break

      case 'failed':
        this.options.onDrop?.()
        break

      default:
        break
    }
  }

  async start(url) {
    if (this.closed) throw new WhepError('unknown', 'session closed')

    this.options.onStatus?.('connecting')
    const offer = await this.pc.createOffer()
    await this.pc.setLocalDescription(offer)
    await this.waitForIce()

    if (this.closed) return
    this.options.onStatus?.('negotiating')

    const controller = new AbortController()
    this.abortController = controller
    const timeoutMs = this.options.connectTimeoutMs ?? DEFAULT_CONNECT_TIMEOUT_MS
    const timeout = setTimeout(() => {
      controller.abort(new DOMException('timeout', 'TimeoutError'))
    }, timeoutMs)

    let response
    try {
      response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/sdp', Accept: 'application/sdp' },
        body: this.pc.localDescription?.sdp,
        cache: 'no-store',
        signal: controller.signal
      })
    } catch (error) {
      throw toWhepError(error)
    } finally {
      clearTimeout(timeout)
    }

    if (this.closed) return

    if (!response.ok) {
      const details = await response.text().catch(() => '')
      const error = new WhepError(
        'http',
        details.trim().slice(0, 300) || response.statusText || 'HTTP error',
        response.status
      )
      this.options.onError?.(error)
      throw error
    }

    const answer = await response.text()
    const location = response.headers.get('Location')

    if (location) {
      try {
        this.resourceUrl = new URL(location, url).toString()
      } catch {
        this.resourceUrl = null
      }
    }

    try {
      await this.pc.setRemoteDescription({ type: 'answer', sdp: answer })
    } catch (error) {
      const failure = new WhepError(
        'protocol',
        error instanceof Error ? error.message : 'invalid answer'
      )
      this.options.onError?.(failure)
      throw failure
    }

    if (!this.closed) this.options.onStatus?.('waiting')
  }

  /** Filet de sécurité adaptatif : la cible remonte seulement si la gigue est haute. */
  setVideoLatencyTarget(targetMs) {
    if (this.closed || !this.videoReceiver) return
    if (targetMs === this.videoTargetMs) return

    try {
      if ('jitterBufferTarget' in this.videoReceiver) {
        this.videoReceiver.jitterBufferTarget = targetMs
        this.videoTargetMs = targetMs
      }
    } catch {
      // Non pris en charge ou hors plage : on garde la cible courante.
    }
  }

  async collectStats() {
    if (this.closed) return null

    try {
      const report = await this.pc.getStats()
      let inbound

      report.forEach((stat) => {
        if (stat.type === 'inbound-rtp' && stat.kind === 'video') inbound = stat
      })

      if (!inbound) return null

      const now = performance.now()
      const bytes = inbound.bytesReceived ?? 0

      let bitrateKbps = null
      if (this.lastStatsAt > 0 && now > this.lastStatsAt) {
        bitrateKbps = Math.round(((bytes - this.lastBytes) * 8) / (now - this.lastStatsAt))
      }

      this.lastBytes = bytes
      this.lastStatsAt = now

      const sample =
        typeof inbound.jitterBufferDelay === 'number' &&
        typeof inbound.jitterBufferEmittedCount === 'number'
          ? { delaySeconds: inbound.jitterBufferDelay, emittedCount: inbound.jitterBufferEmittedCount }
          : null
      const bufferMs = bufferDeltaMs(this.lastBuffer, sample)
      if (sample) this.lastBuffer = sample

      return {
        bitrateKbps,
        fps: inbound.framesPerSecond ?? null,
        width: inbound.frameWidth ?? null,
        height: inbound.frameHeight ?? null,
        droppedFrames: inbound.framesDropped ?? null,
        jitterMs: typeof inbound.jitter === 'number' ? inbound.jitter * 1000 : null,
        bufferMs
      }
    } catch {
      return null
    }
  }

  /** Ferme la peer connection et libère la session WHEP côté serveur. */
  async close() {
    if (this.closed) return
    this.closed = true

    if (this.dropTimer) {
      clearTimeout(this.dropTimer)
      this.dropTimer = undefined
    }

    this.abortController?.abort()
    this.abortController = null

    const resourceUrl = this.resourceUrl
    this.resourceUrl = null

    this.pc.onconnectionstatechange = null
    this.pc.ontrack = null

    for (const track of this.media.getTracks()) {
      this.media.removeTrack(track)
      track.stop()
    }

    try {
      this.pc.close()
    } catch {
      // Déjà fermée.
    }

    this.options.onStatus?.('idle')

    if (resourceUrl) {
      try {
        await fetch(resourceUrl, { method: 'DELETE', signal: AbortSignal.timeout(3000) })
      } catch {
        // Tous les points d'entrée WHEP ne gèrent pas DELETE ; le serveur expire.
      }
    }
  }

  async waitForIce() {
    if (this.pc.iceGatheringState === 'complete') return

    // La fenêtre complète n'est gardée que si un STUN/TURN est configuré et
    // n'a pas encore fourni son candidat réflexe. Sinon l'offre part peu après
    // le dernier candidat, ce qui retire jusqu'à quelques secondes.
    const hasUrl = (scheme) =>
      (this.options.iceServers ?? []).some((server) => {
        const urls = Array.isArray(server.urls) ? server.urls : [server.urls]
        return urls.some(
          (url) => typeof url === 'string' && url.trim().toLowerCase().startsWith(scheme)
        )
      })

    const needsReflexive = hasUrl('stun') || hasUrl('turn')

    await new Promise((resolve) => {
      let idleTimer
      let maxTimer = null
      let sawReflexive = false

      const finish = () => {
        this.pc.removeEventListener('icegatheringstatechange', onChange)
        this.pc.removeEventListener('icecandidate', onCandidate)
        if (idleTimer) clearTimeout(idleTimer)
        if (maxTimer) clearTimeout(maxTimer)
        resolve()
      }

      const onChange = () => {
        if (this.pc.iceGatheringState === 'complete') finish()
      }

      const onCandidate = (event) => {
        if (!event.candidate) return

        if (event.candidate.type === 'srflx' || event.candidate.type === 'relay') {
          sawReflexive = true
        }

        if (needsReflexive && !sawReflexive) return

        if (idleTimer) clearTimeout(idleTimer)
        idleTimer = setTimeout(finish, ICE_IDLE_MS)
      }

      this.pc.addEventListener('icegatheringstatechange', onChange)
      this.pc.addEventListener('icecandidate', onCandidate)

      // La cueillette a pu se terminer pendant la pose des écouteurs.
      if (this.pc.iceGatheringState === 'complete') {
        finish()
        return
      }

      maxTimer = setTimeout(finish, ICE_MAX_MS)
    })
  }
}

/* ----------------------- sondes de disponibilité ------------------------- */

const PROBE_TIMEOUT_MS = 10_000
const CACHE_TTL_MS = 20_000

const probeCache = new Map()
const probeInFlight = new Map()
const probeGenerations = new Map()

function probeGenerationOf(url) {
  return probeGenerations.get(url) ?? 0
}

/**
 * Ouvre une session WHEP de courte durée et attend une image décodée : une
 * réponse OPTIONS ne prouve pas qu'un flux est réellement en direct.
 */
async function probeStream(url, iceServers) {
  const video = document.createElement('video')
  video.muted = true
  video.autoplay = true
  video.playsInline = true
  video.style.cssText =
    'position:fixed;left:-10px;top:-10px;width:2px;height:2px;opacity:0.01;pointer-events:none'
  document.body.appendChild(video)

  let finish = () => undefined
  const resultPromise = new Promise((resolve) => {
    finish = resolve
  })

  const session = new WhepSession({
    iceServers,
    connectTimeoutMs: 8000,
    onTrack: (stream) => {
      video.srcObject = stream
      video.play().catch(() => undefined)
    },
    onDrop: () => finish(false),
    onError: () => finish(false)
  })

  video.addEventListener(
    'loadeddata',
    () => finish(video.videoWidth > 0 && video.videoHeight > 0),
    { once: true }
  )

  const timer = setTimeout(() => finish(false), PROBE_TIMEOUT_MS)

  try {
    await session.start(url)
  } catch {
    finish(false)
  }

  const result = await resultPromise
  clearTimeout(timer)

  video.pause()
  video.srcObject = null
  video.remove()

  // Libère la session serveur avec DELETE au lieu de la laisser fuir.
  await session.close()

  return result
}

/**
 * Déduplique les sondes par URL et met le résultat en cache : une tuile
 * arrêtée coûte au plus une courte session par minute, jamais une par rendu.
 */
function probeStreamCached(url, iceServers, maxAgeMs = CACHE_TTL_MS) {
  const hit = probeCache.get(url)
  if (hit && Date.now() - hit.checkedAt < maxAgeMs) return Promise.resolve(hit.result)

  const pending = probeInFlight.get(url)
  if (pending) return pending

  const generation = probeGenerationOf(url)

  const promise = probeStream(url, iceServers)
    .then((result) => {
      // Une invalidation a eu lieu pendant la sonde : résultat périmé.
      if (probeGenerationOf(url) === generation) {
        probeCache.set(url, { result, checkedAt: Date.now() })
      }
      return result
    })
    .catch(() => false)
    .finally(() => {
      if (probeInFlight.get(url) === promise) probeInFlight.delete(url)
    })

  probeInFlight.set(url, promise)
  return promise
}

/** Oublie le résultat en cache pour une URL : la prochaine sonde fait foi. */
function invalidateProbeCache(url) {
  probeGenerations.set(url, probeGenerationOf(url) + 1)
  probeCache.delete(url)
  probeInFlight.delete(url)
}

/* --------- magasin de disponibilité partagé (par URL de flux) ------------ */

const availabilityStates = new Map()
const availabilityListeners = new Set()

function getAvailability(url) {
  return availabilityStates.get(url) ?? 'checking'
}

function setAvailability(url, value) {
  if (availabilityStates.get(url) === value) return

  availabilityStates.set(url, value)
  for (const listener of [...availabilityListeners]) listener()
}

function subscribeAvailability(listener) {
  availabilityListeners.add(listener)
  return () => availabilityListeners.delete(listener)
}

/* ---------------------------- stockage local ----------------------------- */

const STORAGE_KEYS = {
  streams: 'multiview-streams',
  tileSizes: 'multiview-tile-sizes',
  audio: 'multiview-audio',
  language: 'multiview-language',
  ice: 'multiview-ice'
}

const DEFAULT_AUDIO = { volume: 70, muted: true }

const DEFAULT_ICE_CONFIG = { stun: '', turn: '', username: '', password: '' }

const DEFAULT_TILE_WIDTH = 440
const MIN_TILE_WIDTH = 280
const MIN_TILE_HEIGHT = 200

function isRecord(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isHttpUrl(value) {
  if (typeof value !== 'string' || !value.trim()) return false

  try {
    const { protocol } = new URL(value)
    return protocol === 'http:' || protocol === 'https:'
  } catch {
    return false
  }
}

function parseJson(raw) {
  if (!raw) return null
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

/** Accepte les identifiants numériques v1 pour garder les listes existantes. */
function parseStreams(raw) {
  const parsed = parseJson(raw)
  if (!Array.isArray(parsed)) return []

  const streams = []
  const seen = new Set()

  for (const item of parsed) {
    if (!isRecord(item)) continue

    const id =
      typeof item.id === 'string' ? item.id : typeof item.id === 'number' ? String(item.id) : null
    if (!id || seen.has(id)) continue
    if (!isHttpUrl(item.url)) continue

    const name =
      typeof item.name === 'string' && item.name.trim() ? item.name.trim().slice(0, 80) : 'Flux'

    seen.add(id)
    streams.push({ id, name, url: item.url.trim() })
  }

  return streams
}

function parseTileSizes(raw) {
  const parsed = parseJson(raw)
  if (!isRecord(parsed)) return {}

  const sizes = {}

  for (const [id, value] of Object.entries(parsed)) {
    if (!isRecord(value)) continue

    const width = Number(value.width)
    const height = Number(value.height)
    if (!Number.isFinite(width) || !Number.isFinite(height)) continue
    if (width < MIN_TILE_WIDTH || height < MIN_TILE_HEIGHT) continue

    sizes[id] = { width: Math.round(width), height: Math.round(height) }
  }

  return sizes
}

function parseAudioMap(raw) {
  const parsed = parseJson(raw)
  if (!isRecord(parsed)) return {}

  const audio = {}

  for (const [id, value] of Object.entries(parsed)) {
    if (!isRecord(value)) continue

    const volume = Number(value.volume)
    if (!Number.isFinite(volume)) continue

    audio[id] = {
      volume: Math.min(100, Math.max(0, Math.round(volume))),
      muted: value.muted === true
    }
  }

  return audio
}

function parseLanguage(raw) {
  if (!raw) return 'FR'

  const value = raw.startsWith('"') ? parseJson(raw) : raw
  return value === 'EN' ? 'EN' : 'FR'
}

function sanitizeIceConfig(value) {
  return {
    stun: typeof value?.stun === 'string' ? value.stun.trim() : '',
    turn: typeof value?.turn === 'string' ? value.turn.trim() : '',
    username: typeof value?.username === 'string' ? value.username.trim() : '',
    password: typeof value?.password === 'string' ? value.password : ''
  }
}

function parseIceConfig(raw) {
  if (!raw) return { ...DEFAULT_ICE_CONFIG }

  try {
    return sanitizeIceConfig(parseJson(raw))
  } catch {
    return { ...DEFAULT_ICE_CONFIG }
  }
}

/** Une configuration vide garde le comportement par défaut : candidats locaux. */
function toIceServers(config) {
  const servers = []

  const splitUrls = (value) =>
    value
      .split(/[\s,]+/)
      .map((entry) => entry.trim())
      .filter(Boolean)

  const stunUrls = splitUrls(config.stun)
  if (stunUrls.length > 0) servers.push({ urls: stunUrls })

  const turnUrls = splitUrls(config.turn)
  if (turnUrls.length > 0) {
    servers.push({
      urls: turnUrls,
      username: config.username || undefined,
      credential: config.password || undefined
    })
  }

  return servers
}

function readJson(key, parse, fallback) {
  try {
    return parse(localStorage.getItem(key)) ?? fallback
  } catch {
    return fallback
  }
}

function writeJson(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch (error) {
    console.error(`[MultiView] Unable to persist ${key}:`, error)
  }
}

/* ------------------------------- état ------------------------------------ */

const state = {
  streams: readJson(STORAGE_KEYS.streams, parseStreams, []),
  running: new Set(),
  audioMap: readJson(STORAGE_KEYS.audio, parseAudioMap, {}),
  tileSizes: readJson(STORAGE_KEYS.tileSizes, parseTileSizes, {}),
  /** Ratios mesurés à l'exécution, non persistés. */
  aspectRatios: {},
  ice: readJson(STORAGE_KEYS.ice, (raw) => parseIceConfig(raw), { ...DEFAULT_ICE_CONFIG })
}

language = parseLanguage(localStorage.getItem(STORAGE_KEYS.language))

function getAudio(id) {
  return state.audioMap[id] ?? { ...DEFAULT_AUDIO }
}

function updateAudio(id, audio) {
  state.audioMap[id] = audio
  writeJson(STORAGE_KEYS.audio, state.audioMap)
}

/** Solo : seul le flux concerné reste actif, les autres sont coupés. */
function soloStream(id) {
  for (const stream of state.streams) {
    const audio = state.audioMap[stream.id] ?? { ...DEFAULT_AUDIO }
    state.audioMap[stream.id] =
      stream.id === id
        ? { volume: audio.volume || 40, muted: false }
        : { ...audio, muted: true }
  }

  writeJson(STORAGE_KEYS.audio, state.audioMap)

  for (const tile of tiles.values()) tile.refreshAudio()
}

function isSolo(id) {
  const unmuted = state.streams.filter((stream) => !getAudio(stream.id).muted)
  return unmuted.length === 1 && unmuted[0].id === id
}

/* --------------------------- références DOM ------------------------------ */

const gridEl = document.getElementById('stream-grid')
const emptyEl = document.getElementById('empty-state')
const countEl = document.getElementById('stream-count')

const formBackdrop = document.getElementById('form-backdrop')
const settingsBackdrop = document.getElementById('settings-backdrop')
const confirmBackdrop = document.getElementById('confirm-backdrop')

/* ------------------------------ lecteur ---------------------------------- */

/**
 * Portage de hooks/useWhepPlayer.ts : connexion WHEP, reconnexion avec backoff
 * pendant 5 minutes, statistiques toutes les 2 s et résorption du retard.
 */
class Player {
  constructor(tile) {
    this.tile = tile
    this.a = null
  }

  get active() {
    return this.a !== null
  }

  activate() {
    this.deactivate()

    const a = {
      cancelled: false,
      finished: false,
      attempt: 0,
      recovering: false,
      session: null,
      retryTimer: null,
      statsTimer: null,
      tuningTimer: null,
      deadlineTimer: null,
      latencyState: INITIAL_LATENCY_STATE,
      appliedLatencyMs: VIDEO_MIN_BUFFER_MS
    }
    this.a = a

    this.beginRecovery(a)
    this.connect(a)
  }

  deactivate() {
    const a = this.a
    if (!a) return
    this.a = null
    a.cancelled = true

    if (a.retryTimer) clearTimeout(a.retryTimer)
    this.clearDeadline(a)
    this.stopStats(a)
    this.stopTuning(a)

    if (a.session) a.session.close()

    const video = this.tile.video
    if (video) video.srcObject = null

    this.tile.setStatus('idle')
    this.tile.setError(null)
    this.tile.setStats(null)
  }

  retry() {
    if (this.tile.running) this.activate()
  }

  beginRecovery(a) {
    if (a.cancelled || a.finished || a.recovering) return
    a.recovering = true
    a.deadlineTimer = setTimeout(() => this.giveUp(a), RECONNECT_WINDOW_MS)
  }

  endRecovery(a) {
    a.recovering = false
    a.attempt = 0
    this.clearDeadline(a)
  }

  clearDeadline(a) {
    if (a.deadlineTimer) {
      clearTimeout(a.deadlineTimer)
      a.deadlineTimer = null
    }
  }

  stopStats(a) {
    if (a.statsTimer) {
      clearInterval(a.statsTimer)
      a.statsTimer = null
    }
  }

  stopTuning(a) {
    if (a.tuningTimer) {
      clearInterval(a.tuningTimer)
      a.tuningTimer = null
    }

    const video = this.tile.video
    if (video && video.playbackRate !== 1) video.playbackRate = 1
  }

  giveUp(a) {
    if (a.cancelled || a.finished) return
    a.finished = true

    this.clearDeadline(a)
    if (a.retryTimer) {
      clearTimeout(a.retryTimer)
      a.retryTimer = null
    }

    this.stopStats(a)
    this.stopTuning(a)
    this.tile.setStats(null)

    const session = a.session
    a.session = null
    if (session) session.close()

    this.tile.setStatus('error')
    this.tile.onUnavailable()
  }

  scheduleRetry(a) {
    if (a.cancelled || a.finished) return

    this.beginRecovery(a)
    if (a.retryTimer) clearTimeout(a.retryTimer)
    const delay = retryDelay(a.attempt)
    a.attempt += 1
    this.tile.setStatus('disconnected')
    a.retryTimer = setTimeout(() => {
      a.retryTimer = null
      this.connect(a)
    }, delay)
  }

  startStats(a, session) {
    this.stopStats(a)
    let ticks = 0

    // Les statistiques arrivent plus rarement que le réglage de lecture, mais
    // l'adaptation de la cible de tampon se fait ici.
    a.statsTimer = setInterval(() => {
      ticks += 1

      session.collectStats().then((value) => {
        if (a.cancelled || a.finished || !value) return

        // Le premier relevé ne sert qu'à amorcer le calcul du débit.
        if (ticks > 1) this.tile.setStats(value)

        a.latencyState = nextLatencyState(a.latencyState, value.jitterMs)
        if (a.latencyState.targetMs !== a.appliedLatencyMs) {
          a.appliedLatencyMs = a.latencyState.targetMs
          session.setVideoLatencyTarget(a.appliedLatencyMs)
        }
      })
    }, 2000)
  }

  startTuning(a) {
    this.stopTuning(a)

    const tunePlayout = () => {
      const video = this.tile.video
      if (!video) return

      if (video.paused || video.readyState < 2) {
        if (video.playbackRate !== 1) video.playbackRate = 1
        return
      }

      const buffered = video.buffered
      if (buffered.length === 0) return

      const ahead = buffered.end(buffered.length - 1) - video.currentTime
      const rate = nextPlaybackRate(ahead, video.playbackRate)
      if (rate !== video.playbackRate) video.playbackRate = rate
    }

    a.tuningTimer = setInterval(tunePlayout, 500)
  }

  async connect(a) {
    if (a.cancelled || a.finished) return

    if (a.retryTimer) {
      clearTimeout(a.retryTimer)
      a.retryTimer = null
    }

    this.stopStats(a)
    this.stopTuning(a)
    this.tile.setStats(null)

    a.latencyState = INITIAL_LATENCY_STATE
    a.appliedLatencyMs = VIDEO_MIN_BUFFER_MS

    const previous = a.session
    a.session = null
    if (previous) previous.close()

    const url = this.tile.stream.url
    const video = this.tile.video

    const session = new WhepSession({
      iceServers: toIceServers(state.ice),
      onStatus: (value) => {
        if (a.cancelled || a.finished) return
        if (value === 'live') this.endRecovery(a)
        this.tile.setStatus(value)
      },
      onTrack: (stream) => {
        if (!video) return
        if (video.srcObject !== stream) video.srcObject = stream
        video.play().catch(() => undefined)
      },
      onDrop: () => {
        if (a.cancelled || a.finished) return
        // La session a peut-être déjà été remplacée par une reconnexion.
        if (a.session !== session) return

        a.session = null
        session.close()
        this.stopStats(a)
        this.stopTuning(a)
        this.scheduleRetry(a)
      },
      onError: (value) => {
        if (!a.cancelled && !a.finished) this.tile.setError(value)
      }
    })

    a.session = session

    try {
      await session.start(url)
      if (a.cancelled || a.finished) return
      if (a.session !== session) return

      this.tile.setError(null)
      this.startStats(a, session)
      this.startTuning(a)
    } catch (failure) {
      if (a.cancelled || a.finished) return

      // Une coupure a pu fermer cette session pendant start() et déjà planifier
      // la tentative suivante.
      if (a.session !== session) return

      const whepError = toWhepError(failure)
      this.tile.setError(whepError)

      a.session = null
      session.close()

      // Les réponses 4xx (dont le 404 d'un flux non publié) restent traitées
      // comme temporaires : un flux relancé doit pouvoir revenir pendant la
      // fenêtre de reconnexion.
      this.scheduleRetry(a)
    }
  }
}

/* -------------------------------- tuile ---------------------------------- */

const STATUS_KEYS = {
  connecting: 'stream.status.connecting',
  negotiating: 'stream.status.negotiating',
  waiting: 'stream.status.waiting',
  live: 'stream.status.live',
  disconnected: 'stream.status.disconnected',
  error: 'stream.status.error'
}

const AVAILABILITY_KEYS = {
  online: 'availability.online',
  offline: 'availability.offline',
  checking: 'availability.checking'
}

const STATS_ROWS = [
  ['stats.bitrate', (s) => formatBitrate(s.bitrateKbps)],
  ['stats.fps', (s) => formatFps(s.fps)],
  ['stats.resolution', (s) => formatResolution(s.width, s.height)],
  ['stats.buffer', (s) => formatMs(s.bufferMs)],
  ['stats.jitter', (s) => formatMs(s.jitterMs)],
  ['stats.dropped', (s) => formatCount(s.droppedFrames)]
]

/** Boucle de sondage de la disponibilité, comme useStreamAvailability. */
const OFFLINE_INTERVAL_MS = 30_000
const ONLINE_INTERVAL_MS = 60_000
const HIDDEN_INTERVAL_MS = 15_000

class Tile {
  constructor(stream) {
    this.stream = stream
    this.player = new Player(this)
    this.status = 'idle'
    this.error = null
    this.stats = null
    this.hasVideo = false
    this.statsOpen = false
    this.aspectRatio = null
    this.availLoop = null
    this.onVisibilityChange = null

    const el = document.createElement('div')
    el.className = 'sortable-stream'
    el.draggable = true
    el.innerHTML = `
      <article class="stream-card">
        <div class="stream-info">
          <div class="stream-details">
            <h3 class="stream-name"></h3>
            <p class="stream-url"></p>
            <div class="status-line">
              <span class="availability-dot checking" title=""></span>
              <span class="stream-status"></span>
            </div>
            <p class="player-error inline-error" hidden></p>
          </div>
          <div class="stream-actions">
            <button class="icon-button" data-act="toggle" type="button"></button>
            <button class="icon-button" data-act="stats" type="button" hidden>${icon('stats', 15)}</button>
            <button class="icon-button" data-act="edit" type="button">${icon('edit', 15)}</button>
            <button class="delete-button" data-act="delete" type="button">${icon('trash', 17)}</button>
          </div>
        </div>
        <div class="video-container">
          <video playsinline autoplay></video>
          <div class="player-overlay idle-overlay">
            <span class="video-symbol"></span>
            <span class="overlay-title"></span>
            <span class="overlay-hint" hidden></span>
            <button class="overlay-action" data-act="start" type="button" hidden></button>
          </div>
          <div class="player-overlay busy-overlay" hidden>
            <span class="video-symbol"></span>
            <span class="overlay-title"></span>
            <p class="player-error" hidden title=""></p>
            <button class="overlay-action" data-act="retry" type="button" hidden></button>
          </div>
          <div class="view-controls">
            <button type="button" data-act="fullscreen"></button>
          </div>
          <div class="stats-panel" hidden>
            <dl>
              ${STATS_ROWS.map(
                ([key]) =>
                  `<div class="stats-row"><dt data-stats-label="${key}"></dt><dd data-stats-value="${key}">—</dd></div>`
              ).join('')}
            </dl>
          </div>
          <div class="audio-controls">
            <button type="button" class="mute-button" aria-pressed="false"></button>
            <input type="range" min="0" max="100" value="${getAudio(stream.id).volume}" />
            <button type="button" class="solo-button" aria-pressed="false">${icon('solo', 15)}</button>
          </div>
        </div>
        <button type="button" class="resize-grip"></button>
      </article>`

    this.el = el
    this.info = el.querySelector('.stream-info')
    this.videoContainer = el.querySelector('.video-container')
    this.video = el.querySelector('video')
    this.nameEl = el.querySelector('.stream-name')
    this.urlEl = el.querySelector('.stream-url')
    this.dot = el.querySelector('.availability-dot')
    this.statusTextEl = el.querySelector('.stream-status')
    this.inlineErrorEl = el.querySelector('.inline-error')
    this.toggleBtn = el.querySelector('[data-act="toggle"]')
    this.statsBtn = el.querySelector('[data-act="stats"]')
    this.editBtn = el.querySelector('[data-act="edit"]')
    this.deleteBtn = el.querySelector('[data-act="delete"]')
    this.idleOverlay = el.querySelector('.idle-overlay')
    this.busyOverlay = el.querySelector('.busy-overlay')
    this.fullscreenBtn = el.querySelector('[data-act="fullscreen"]')
    this.statsPanel = el.querySelector('.stats-panel')
    this.muteBtn = el.querySelector('.mute-button')
    this.soloBtn = el.querySelector('.solo-button')
    this.volumeInput = el.querySelector('.audio-controls input[type="range"]')
    this.grip = el.querySelector('.resize-grip')

    this.bindEvents()
    this.refreshAll()
    this.startAvailabilityLoop()
  }

  get running() {
    return state.running.has(this.stream.id)
  }

  destroy() {
    this.player.deactivate()
    this.stopAvailabilityLoop()
    this.el.remove()
  }

  bindEvents() {
    this.toggleBtn.addEventListener('click', () => toggleRunning(this.stream.id))

    this.statsBtn.addEventListener('click', () => {
      this.statsOpen = !this.statsOpen
      this.statsPanel.hidden = !this.statsOpen
      this.statsBtn.classList.toggle('active', this.statsOpen)
      this.setStats(null)
    })

    this.editBtn.addEventListener('click', () => openStreamForm(this.stream))
    this.deleteBtn.addEventListener('click', () => openConfirm(this.stream))

    this.video.addEventListener('click', () => {
      if (this.running) this.video.play().catch(() => undefined)
    })

    this.video.addEventListener('loadedmetadata', () => {
      const { videoWidth, videoHeight } = this.video
      if (videoWidth > 0 && videoHeight > 0) {
        this.aspectRatio = videoWidth / videoHeight
        state.aspectRatios[this.stream.id] = this.aspectRatio
      }
    })

    this.video.addEventListener('loadeddata', () => {
      this.hasVideo = true
      this.refreshStatus()
    })

    this.video.addEventListener('emptied', () => {
      this.hasVideo = false
      this.refreshStatus()
    })

    this.fullscreenBtn.addEventListener('click', () => {
      if (document.fullscreenElement === this.videoContainer) {
        document.exitFullscreen().catch(() => undefined)
      } else {
        this.videoContainer.requestFullscreen().catch((error) => {
          console.error('[MultiView] Fullscreen failed:', error)
        })
      }
    })

    document.addEventListener('fullscreenchange', () => this.refreshFullscreenButton())

    this.idleOverlay.querySelector('[data-act="start"]').addEventListener('click', () => {
      toggleRunning(this.stream.id)
    })

    this.busyOverlay.querySelector('[data-act="retry"]').addEventListener('click', () => {
      this.player.retry()
    })

    this.muteBtn.addEventListener('click', () => {
      const audio = getAudio(this.stream.id)
      const muted = audio.muted || audio.volume === 0
      updateAudio(
        this.stream.id,
        muted ? { volume: audio.volume || 40, muted: false } : { ...audio, muted: true }
      )
      this.refreshAudio()
    })

    this.volumeInput.addEventListener('input', () => {
      const audio = getAudio(this.stream.id)
      const volume = Number(this.volumeInput.value)
      updateAudio(this.stream.id, { volume, muted: volume === 0 })
      this.refreshAudio()
    })

    this.soloBtn.addEventListener('click', () => soloStream(this.stream.id))

    this.grip.addEventListener('pointerdown', (event) => this.startResize(event))

    // Réordonnancement par glisser-déposer, comme dans l'application desktop.
    {
      this.el.addEventListener('dragstart', (event) => {
        const target = event.target
        if (
          target &&
          typeof target.closest === 'function' &&
          target.closest(
            'button, input, video, .view-controls, .audio-controls, .video-container'
          )
        ) {
          event.preventDefault()
          return
        }

        draggedId = this.stream.id
        this.el.classList.add('dragging')
      })

      this.el.addEventListener('dragend', () => {
        draggedId = null
        this.el.classList.remove('dragging')
      })

      this.el.addEventListener('dragover', (event) => event.preventDefault())

      this.el.addEventListener('drop', (event) => {
        event.preventDefault()
        reorderStream(this.stream.id)
      })
    }
  }

  /* -------- boucle de disponibilité (portage de useStreamAvailability) ---- */

  startAvailabilityLoop() {
    this.stopAvailabilityLoop()

    const loop = { cancelled: false, timer: null }
    this.availLoop = loop

    const schedule = (delay) => {
      if (loop.cancelled) return
      if (loop.timer) clearTimeout(loop.timer)
      loop.timer = setTimeout(() => check(), delay)
    }

    const check = async () => {
      if (loop.cancelled) return

      if (document.hidden) {
        schedule(HIDDEN_INTERVAL_MS)
        return
      }

      const online = await probeStreamCached(this.stream.url, toIceServers(state.ice))
      if (loop.cancelled) return

      setAvailability(this.stream.url, online ? 'online' : 'offline')
      schedule(online ? ONLINE_INTERVAL_MS : OFFLINE_INTERVAL_MS)
    }

    this.onVisibilityChange = () => {
      if (!document.hidden) schedule(0)
    }
    document.addEventListener('visibilitychange', this.onVisibilityChange)

    // Décalage aléatoire pour que la grille ne sonde pas tout d'un coup.
    schedule(600 + Math.random() * 1200)
  }

  stopAvailabilityLoop() {
    if (this.availLoop) {
      this.availLoop.cancelled = true
      if (this.availLoop.timer) clearTimeout(this.availLoop.timer)
      this.availLoop = null
    }

    if (this.onVisibilityChange) {
      document.removeEventListener('visibilitychange', this.onVisibilityChange)
      this.onVisibilityChange = null
    }
  }

  /* ----------------------------- actions -------------------------------- */

  onUnavailable() {
    // Reconnexion échouée pendant toute la fenêtre : on oublie tout résultat
    // « online » précédent et une nouvelle sonde tranchera.
    invalidateProbeCache(this.stream.url)
    setAvailability(this.stream.url, 'checking')

    if (state.running.delete(this.stream.id)) {
      this.refreshRunning()
      this.startAvailabilityLoop()
    }
  }

  restartPlayer() {
    if (this.running) this.player.activate()
  }

  startResize(event) {
    event.preventDefault()
    event.stopPropagation()

    const rect = this.el.getBoundingClientRect()
    const headerHeight = this.info.getBoundingClientRect().height || 72
    const ratio =
      this.aspectRatio || state.aspectRatios[this.stream.id] || rect.width / Math.max(1, rect.height - headerHeight)
    const maxWidth = Math.max(MIN_TILE_WIDTH, gridEl.getBoundingClientRect().width)

    const startX = event.clientX
    let frame = 0
    let pendingWidth = rect.width

    const apply = () => {
      frame = 0
      const width = Math.max(MIN_TILE_WIDTH, Math.min(maxWidth, pendingWidth))
      const height = Math.max(MIN_TILE_HEIGHT, width / ratio + headerHeight)
      state.tileSizes[this.stream.id] = { width, height }
      writeJson(STORAGE_KEYS.tileSizes, state.tileSizes)
      this.refreshSize()
    }

    const onMove = (moveEvent) => {
      pendingWidth = rect.width + moveEvent.clientX - startX
      if (!frame) frame = requestAnimationFrame(apply)
    }

    const onUp = () => {
      if (frame) cancelAnimationFrame(frame)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
    }

    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp, { once: true })
    window.addEventListener('pointercancel', onUp, { once: true })
  }

  /* ------------------------- mise à jour du rendu ------------------------ */

  setStatus(status) {
    this.status = status
    this.refreshStatus()
  }

  setError(error) {
    this.error = error
    this.refreshStatus()
  }

  setStats(stats) {
    this.stats = stats

    for (const [key, format] of STATS_ROWS) {
      const cell = this.statsPanel.querySelector(`[data-stats-value="${key}"]`)
      cell.textContent = stats ? format(stats) : '—'
    }
  }

  refreshAll() {
    this.refreshLabels()
    this.refreshRunning()
    this.refreshStatus()
    this.refreshAvailability()
    this.refreshAudio()
    this.refreshSize()
    this.refreshFullscreenButton()
    this.setStats(this.stats)
  }

  refreshLabels() {
    this.nameEl.textContent = this.stream.name
    this.urlEl.textContent = this.stream.url
    this.urlEl.title = this.stream.url
    this.editBtn.title = t('stream.edit')
    this.editBtn.setAttribute('aria-label', t('stream.edit'))
    this.deleteBtn.title = t('stream.delete')
    this.deleteBtn.setAttribute('aria-label', t('stream.deleteLabel', { name: this.stream.name }))
    this.grip.title = t('stream.resizeHint')
    this.grip.setAttribute('aria-label', t('stream.resize', { name: this.stream.name }))
    this.statsBtn.title = t('stream.stats')
    this.statsBtn.setAttribute('aria-label', t('stream.stats'))

    for (const [key] of STATS_ROWS) {
      const label = this.statsPanel.querySelector(`[data-stats-label="${key}"]`)
      label.textContent = t(key)
    }

    const retryBtn = this.busyOverlay.querySelector('[data-act="retry"]')
    retryBtn.innerHTML = `${icon('refresh', 14)}<span>${t('stream.retry')}</span>`

    this.refreshRunning()
    this.refreshStatus()
    this.refreshAvailability()
    this.refreshAudio()
    this.refreshFullscreenButton()
  }

  refreshRunning() {
    const running = this.running
    const availability = getAvailability(this.stream.url)

    // Lecture impossible tant que le flux n'a pas été détecté.
    const startBlocked = !running && availability === 'offline'
    const startLabel = running
      ? t('stream.stop')
      : startBlocked
        ? t('stream.startUnavailable')
        : t('stream.start')

    this.toggleBtn.innerHTML = icon(running ? 'stop' : 'play', 18)
    this.toggleBtn.title = startLabel
    this.toggleBtn.setAttribute('aria-label', startLabel)
    this.toggleBtn.disabled = startBlocked

    this.statsBtn.hidden = !running
    if (!running) {
      this.statsOpen = false
      this.statsPanel.hidden = true
      this.statsBtn.classList.remove('active')
    }

    this.idleOverlay.hidden = running
    this.busyOverlay.hidden = !running
  }

  refreshStatus() {
    const running = this.running
    const availability = getAvailability(this.stream.url)

    const dotState = running
      ? this.status === 'live'
        ? 'online'
        : this.status === 'error'
          ? 'offline'
          : 'checking'
      : availability

    this.dot.className = `availability-dot ${dotState}`
    this.dot.title = t(AVAILABILITY_KEYS[dotState])

    this.statusTextEl.textContent = running
      ? t(STATUS_KEYS[this.status] ?? 'stream.status.stopped')
      : `${t('stream.status.stopped')} · ${t(
          availability === 'online'
            ? 'stream.status.online'
            : availability === 'offline'
              ? 'stream.status.offline'
              : 'stream.status.checking'
        )}`

    if (this.error && running) {
      this.inlineErrorEl.textContent = describeWhepError(this.error)
      this.inlineErrorEl.title = this.error.message
      this.inlineErrorEl.hidden = false
    } else {
      this.inlineErrorEl.hidden = true
    }

    if (running) {
      const showBusy = !this.hasVideo || this.status !== 'live'
      this.busyOverlay.hidden = !showBusy

      if (showBusy) {
        const symbol = this.busyOverlay.querySelector('.video-symbol')
        symbol.innerHTML =
          this.status === 'error'
            ? icon('offline', 20)
            : icon('spinner', 20, 'icon-spin')

        this.busyOverlay.querySelector('.overlay-title').textContent = t(
          STATUS_KEYS[this.status] ?? 'stream.status.stopped'
        )

        const errorEl = this.busyOverlay.querySelector('.player-error')
        if (this.error) {
          errorEl.textContent = describeWhepError(this.error)
          errorEl.title = this.error.message
          errorEl.hidden = false
        } else {
          errorEl.hidden = true
        }

        const retryBtn = this.busyOverlay.querySelector('[data-act="retry"]')
        retryBtn.hidden = !(this.status === 'error' || this.status === 'disconnected')
      }
    }
  }

  refreshAvailability() {
    if (this.running) return

    const availability = getAvailability(this.stream.url)
    const symbol = this.idleOverlay.querySelector('.video-symbol')
    symbol.innerHTML =
      availability === 'online'
        ? icon('play', 20)
        : availability === 'offline'
          ? icon('offline', 20)
          : icon('spinner', 20, 'icon-spin')

    this.idleOverlay.querySelector('.overlay-title').textContent = t(
      AVAILABILITY_KEYS[availability]
    )

    this.idleOverlay.classList.toggle('is-offline', availability === 'offline')

    const hint = this.idleOverlay.querySelector('.overlay-hint')
    hint.textContent = t('stream.offlineHint')
    hint.hidden = availability !== 'offline'

    const startBtn = this.idleOverlay.querySelector('[data-act="start"]')
    startBtn.innerHTML = `${icon('play', 14)}<span>${t('stream.start')}</span>`
    startBtn.hidden = availability !== 'online'

    this.refreshRunning()
    this.refreshStatus()
  }

  refreshAudio() {
    const audio = getAudio(this.stream.id)
    const muted = audio.muted || audio.volume === 0

    this.video.volume = audio.volume / 100
    this.video.muted = audio.muted

    this.muteBtn.innerHTML = icon(muted ? 'mute' : 'volume', 16)
    this.muteBtn.title = muted ? t('stream.unmute') : t('stream.mute')
    this.muteBtn.setAttribute('aria-label', muted ? t('stream.unmute') : t('stream.mute'))
    this.muteBtn.setAttribute('aria-pressed', String(!muted))

    this.volumeInput.value = String(audio.volume)
    this.volumeInput.setAttribute('aria-label', t('stream.volumeFor', { name: this.stream.name }))
    this.volumeInput.title = t('stream.volume')

    const solo = isSolo(this.stream.id)
    this.soloBtn.classList.toggle('active', solo)
    this.soloBtn.title = t('stream.soloHint')
    this.soloBtn.setAttribute('aria-label', t('stream.solo'))
    this.soloBtn.setAttribute('aria-pressed', String(solo))
  }

  refreshSize() {
    const size = state.tileSizes[this.stream.id]

    if (size) {
      this.el.style.flex = `0 0 ${size.width}px`
      this.el.style.width = `${size.width}px`
      this.el.style.maxWidth = 'none'
      this.el.style.height = `${size.height}px`
      this.videoContainer.classList.add('sized-video-container')
      this.videoContainer.style.aspectRatio = ''
    } else {
      this.el.style.flex = ''
      this.el.style.width = ''
      this.el.style.maxWidth = ''
      this.el.style.height = ''
      this.videoContainer.classList.remove('sized-video-container')
      this.videoContainer.style.aspectRatio = this.aspectRatio ? String(this.aspectRatio) : ''
    }
  }

  refreshFullscreenButton() {
    const isFullscreen = document.fullscreenElement === this.videoContainer
    this.fullscreenBtn.innerHTML = `${icon(isFullscreen ? 'exitFullscreen' : 'fullscreen', 14)}<span>${
      isFullscreen ? t('stream.exitFullscreen') : t('stream.fullscreen')
    }</span>`
  }
}

/* ------------------------- gestion de la grille -------------------------- */

const tiles = new Map()
let draggedId = null

function renderGrid() {
  // Détruit les tuiles des flux supprimés.
  for (const [id, tile] of tiles) {
    if (!state.streams.some((stream) => stream.id === id)) {
      tile.destroy()
      tiles.delete(id)
    }
  }

  // Crée les nouvelles tuiles et réordonne par append (les éléments existants
  // sont déplacés, les flux vidéo en cours ne sont donc pas coupés).
  for (const stream of state.streams) {
    let tile = tiles.get(stream.id)
    if (!tile) {
      tile = new Tile(stream)
      tiles.set(stream.id, tile)
    }
    tile.stream = stream
    tile.refreshLabels()
    gridEl.appendChild(tile.el)
  }

  emptyEl.hidden = state.streams.length !== 0
  gridEl.hidden = state.streams.length === 0
  countEl.textContent = t('workspace.count', { count: state.streams.length })
}

function toggleRunning(id) {
  const tile = tiles.get(id)
  if (!tile) return

  if (state.running.has(id)) {
    state.running.delete(id)
    tile.player.deactivate()
    tile.refreshRunning()
    tile.startAvailabilityLoop()
  } else {
    // La présence est inconnue pendant la lecture : aucune sonde, et le
    // résultat d'une sonde antérieure ne doit pas resservir au prochain arrêt.
    state.running.add(id)
    tile.player.activate()
    tile.stopAvailabilityLoop()
    invalidateProbeCache(tile.stream.url)
    tile.refreshRunning()
  }
}

function reorderStream(targetId) {
  if (!draggedId || draggedId === targetId) return

  const from = state.streams.findIndex((stream) => stream.id === draggedId)
  const to = state.streams.findIndex((stream) => stream.id === targetId)
  draggedId = null
  if (from < 0 || to < 0) return

  const [moved] = state.streams.splice(from, 1)
  state.streams.splice(to, 0, moved)

  writeJson(STORAGE_KEYS.streams, state.streams)
  renderGrid()
}

function deleteStream(id) {
  state.streams = state.streams.filter((stream) => stream.id !== id)
  state.running.delete(id)
  delete state.tileSizes[id]
  delete state.audioMap[id]
  delete state.aspectRatios[id]

  writeJson(STORAGE_KEYS.streams, state.streams)
  writeJson(STORAGE_KEYS.tileSizes, state.tileSizes)
  writeJson(STORAGE_KEYS.audio, state.audioMap)

  renderGrid()
}

/* ------------------------------ dialogues -------------------------------- */

const openDialogs = []

function openDialog(backdrop) {
  backdrop.hidden = false
  openDialogs.push(backdrop)
}

function closeTopDialog() {
  const backdrop = openDialogs.pop()
  if (backdrop) backdrop.hidden = true
}

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && openDialogs.length > 0) closeTopDialog()
})

for (const backdrop of [formBackdrop, settingsBackdrop, confirmBackdrop]) {
  backdrop.addEventListener('mousedown', (event) => {
    if (event.target === backdrop) closeTopDialog()
  })
}

/* --------- formulaire ajout / modification d'un flux ---------------------- */

const formTitleEl = document.getElementById('form-title')
const formNameEl = document.getElementById('form-name')
const formUrlEl = document.getElementById('form-url')
const formErrorEl = document.getElementById('form-error')
const formHintEl = document.getElementById('form-hint')
const formSubmitEl = document.getElementById('form-submit')

let editingId = null

function openStreamForm(stream) {
  editingId = stream ? stream.id : null

  formTitleEl.textContent = stream ? t('stream.settings.title') : t('header.addStream')
  formSubmitEl.textContent = stream ? t('stream.settings.save') : t('form.add')
  formNameEl.value = stream ? stream.name : ''
  formUrlEl.value = stream ? stream.url : ''
  formErrorEl.hidden = true
  formHintEl.hidden = false
  formHintEl.textContent = t('form.hint')

  openDialog(formBackdrop)
  ;(stream ? formNameEl : formUrlEl).focus()
}

document.getElementById('form-close').innerHTML = icon('close', 15)
document.getElementById('settings-close').innerHTML = icon('close', 15)
document.getElementById('form-cancel').addEventListener('click', closeTopDialog)
document.getElementById('form-close').addEventListener('click', closeTopDialog)

document.getElementById('stream-form').addEventListener('submit', (event) => {
  event.preventDefault()

  const normalized = normalizeStreamUrl(formUrlEl.value)
  if (!normalized) {
    formErrorEl.textContent = t('form.invalidUrl')
    formErrorEl.hidden = false
    formHintEl.hidden = true
    return
  }

  if (isDuplicateStreamUrl(state.streams, normalized, editingId ?? undefined)) {
    formErrorEl.textContent = t('form.duplicateUrl')
    formErrorEl.hidden = false
    formHintEl.hidden = true
    return
  }

  const trimmed = formNameEl.value.trim()

  if (editingId === null) {
    state.streams.push({
      id: newStreamId(),
      name: trimmed || nextDefaultName(state.streams),
      url: normalized
    })
  } else {
    const stream = state.streams.find((item) => item.id === editingId)
    if (stream) {
      const tile = tiles.get(editingId)
      const oldUrl = stream.url

      stream.name = trimmed || stream.name
      stream.url = normalized

      if (oldUrl !== normalized) {
        invalidateProbeCache(oldUrl)
        delete state.aspectRatios[editingId]
        if (tile) {
          tile.aspectRatio = null
          tile.refreshSize()
          tile.restartPlayer()
        }
      }
    }
  }

  writeJson(STORAGE_KEYS.streams, state.streams)
  closeTopDialog()
  renderGrid()
})

/* ------------------------------ paramètres ------------------------------- */

const settingsNoticeEl = document.getElementById('settings-notice')

function setSettingsNotice(message) {
  settingsNoticeEl.textContent = message
  settingsNoticeEl.hidden = !message
}

const iceInputs = {
  stun: document.getElementById('ice-stun'),
  turn: document.getElementById('ice-turn'),
  username: document.getElementById('ice-username'),
  password: document.getElementById('ice-password')
}

function syncIceInputs() {
  iceInputs.stun.value = state.ice.stun
  iceInputs.turn.value = state.ice.turn
  iceInputs.username.value = state.ice.username
  iceInputs.password.value = state.ice.password
}

for (const [key, input] of Object.entries(iceInputs)) {
  input.addEventListener('input', () => {
    state.ice = sanitizeIceConfig({ ...state.ice, [key]: input.value })
    writeJson(STORAGE_KEYS.ice, state.ice)
  })
}

document.getElementById('open-settings').addEventListener('click', () => {
  setSettingsNotice('')
  syncIceInputs()
  openDialog(settingsBackdrop)
})

document.getElementById('settings-close').addEventListener('click', closeTopDialog)

/* --------- export / import compatibles avec l'app desktop ---------------- */

document.getElementById('data-export').addEventListener('click', () => {
  try {
    const payload = {
      version: 1,
      exportedAt: new Date().toISOString(),
      streams: parseStreams(JSON.stringify(state.streams))
    }

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'multiview-streams.json'
    link.click()
    setTimeout(() => URL.revokeObjectURL(url), 10_000)

    setSettingsNotice(t('settings.notice.exported'))
  } catch (error) {
    console.error('[MultiView] Unable to export streams:', error)
    setSettingsNotice(t('settings.notice.exportFailed'))
  }
})

const importInput = document.getElementById('import-file')

document.getElementById('data-import').addEventListener('click', () => importInput.click())

importInput.addEventListener('change', () => {
  const file = importInput.files[0]
  importInput.value = ''
  if (!file) return

  const reader = new FileReader()
  reader.onerror = () => setSettingsNotice(t('settings.notice.importFailed'))
  reader.onload = () => {
    let imported = []

    try {
      const parsed = JSON.parse(reader.result)
      // Le fichier exporté par MultiView est { version, exportedAt, streams } ;
      // une liste nue est acceptée aussi.
      const list = Array.isArray(parsed) ? parsed : parsed?.streams
      imported = parseStreams(JSON.stringify(list ?? []))
    } catch {
      setSettingsNotice(t('settings.notice.importFailed'))
      return
    }

    if (imported.length === 0) {
      setSettingsNotice(t('settings.notice.importFailed'))
      return
    }

    const seen = new Set(state.streams.map((stream) => stream.url))
    let added = 0

    for (const stream of imported) {
      if (seen.has(stream.url)) continue
      seen.add(stream.url)
      state.streams.push(stream)
      added += 1
    }

    writeJson(STORAGE_KEYS.streams, state.streams)
    renderGrid()

    let message = t('settings.notice.imported', { count: added })
    const skipped = imported.length - added
    if (skipped > 0) {
      message += ` ${t('settings.notice.importSkipped', { count: skipped })}`
    }
    setSettingsNotice(message)
  }

  reader.readAsText(file)
})

document.getElementById('data-reset').addEventListener('click', () => {
  state.tileSizes = {}
  writeJson(STORAGE_KEYS.tileSizes, state.tileSizes)
  for (const tile of tiles.values()) tile.refreshSize()
  setSettingsNotice(t('settings.notice.reset'))
})

/* ------------------------- confirmation suppression ---------------------- */

const confirmMessageEl = document.getElementById('confirm-message')
let pendingRemoval = null

function openConfirm(stream) {
  pendingRemoval = stream
  confirmMessageEl.textContent = t('stream.delete.message', { name: stream.name })
  openDialog(confirmBackdrop)
}

document.getElementById('confirm-cancel').addEventListener('click', () => {
  pendingRemoval = null
  closeTopDialog()
})

document.getElementById('confirm-ok').addEventListener('click', () => {
  if (!pendingRemoval) return

  const id = pendingRemoval.id
  pendingRemoval = null
  closeTopDialog()
  deleteStream(id)
})

/* ------------------------------- langue ---------------------------------- */

const langFrBtn = document.getElementById('lang-fr')
const langEnBtn = document.getElementById('lang-en')

function applyLanguage() {
  document.documentElement.lang = language === 'EN' ? 'en' : 'fr'

  document.querySelectorAll('[data-i18n]').forEach((el) => {
    el.textContent = t(el.getAttribute('data-i18n'))
  })
  document.querySelectorAll('[data-i18n-title]').forEach((el) => {
    el.title = t(el.getAttribute('data-i18n-title'))
  })
  document.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
    el.placeholder = t(el.getAttribute('data-i18n-placeholder'))
  })

  langFrBtn.classList.toggle('language-active', language === 'FR')
  langEnBtn.classList.toggle('language-active', language === 'EN')

  countEl.textContent = t('workspace.count', { count: state.streams.length })

  for (const tile of tiles.values()) tile.refreshLabels()

  // Libellés des boutons du formulaire ouvert.
  if (!formBackdrop.hidden) {
    const editing = editingId !== null
    formTitleEl.textContent = editing ? t('stream.settings.title') : t('header.addStream')
    formSubmitEl.textContent = editing ? t('stream.settings.save') : t('form.add')
    formHintEl.textContent = t('form.hint')
  }

  if (!confirmBackdrop.hidden && pendingRemoval) {
    confirmMessageEl.textContent = t('stream.delete.message', { name: pendingRemoval.name })
  }
}

function setLanguage(next) {
  if (language === next) return
  language = next
  writeJson(STORAGE_KEYS.language, next)
  applyLanguage()
}

langFrBtn.addEventListener('click', () => setLanguage('FR'))
langEnBtn.addEventListener('click', () => setLanguage('EN'))

/* -------------------------- en-tête / espace vide ------------------------ */

document.getElementById('add-stream').addEventListener('click', () => openStreamForm(null))
document.getElementById('empty-add').addEventListener('click', () => openStreamForm(null))

/* ------------------------------ démarrage -------------------------------- */

subscribeAvailability(() => {
  for (const tile of tiles.values()) tile.refreshAvailability()
})

renderGrid()
applyLanguage()
