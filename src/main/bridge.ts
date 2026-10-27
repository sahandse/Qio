import { spawn } from 'node:child_process'
import type { ChildProcess } from 'node:child_process'
import { randomBytes } from 'node:crypto'
import { EventEmitter } from 'node:events'
import { createServer } from 'node:net'
import type { Server, Socket } from 'node:net'
import { join } from 'node:path'
import { createInterface } from 'node:readline'
import { app } from 'electron'
import type { MediaState, OverlayPayload } from '@shared/types'

interface BridgeMessage {
  type: string
  [key: string]: unknown
}

/**
 * Runs resources/bridge/qio-bridge.ps1: one long-lived PowerShell process that
 * watches Windows media sessions, volume, brightness and battery, and streams
 * JSON lines to Qio over a loopback socket. A socket (rather than stdio) is used
 * because a spawned PowerShell buffers and slows down redirected console writes,
 * which made the notch feel seconds late.
 */
export class WindowsBridge extends EventEmitter {
  private server: Server | null = null
  private socket: Socket | null = null
  private proc: ChildProcess | null = null
  private token = ''
  private port = 0
  private stopping = false
  private restarts = 0
  private ready = false
  private lastPower: { battery: number; charging: boolean } | null = null

  constructor(private readonly scriptPath: string = WindowsBridge.resolveScript()) {
    super()
  }

  static resolveScript(): string {
    return app.isPackaged
      ? join(process.resourcesPath, 'bridge', 'qio-bridge.ps1')
      : join(app.getAppPath(), 'resources', 'bridge', 'qio-bridge.ps1')
  }

  get isReady(): boolean {
    return this.ready
  }

  get lastPowerSnapshot(): { battery: number; charging: boolean } | null {
    return this.lastPower
  }

  start(): void {
    if (this.server || this.proc) return
    this.stopping = false
    void this.listen()
  }

  stop(): void {
    this.stopping = true
    this.send({ cmd: 'quit' })
    const proc = this.proc
    this.proc = null
    this.socket?.destroy()
    this.socket = null
    this.server?.close()
    this.server = null
    if (proc) setTimeout(() => proc.kill(), 300)
  }

  send(command: Record<string, unknown>): void {
    if (!this.socket || this.socket.destroyed) return
    try {
      this.socket.write(`${JSON.stringify(command)}\n`)
    } catch (error) {
      console.error('[qio] bridge send failed', error)
    }
  }

  mediaCommand(command: string, position?: number): void {
    this.send(position === undefined ? { cmd: `media-${command}` } : { cmd: `media-${command}`, position })
  }

  setVolume(level: number): void {
    this.send({ cmd: 'volume-set', level })
  }

  nudgeVolume(step: number): void {
    this.send({ cmd: 'volume-nudge', step })
  }

  setBrightness(level: number): void {
    this.send({ cmd: 'brightness-set', level })
  }

  setMuted(muted: boolean): void {
    this.send({ cmd: 'mute-set', muted })
  }

  private async listen(): Promise<void> {
    this.token = randomBytes(16).toString('hex')
    const server = createServer()
    this.server = server

    await new Promise<void>((resolve, reject) => {
      server.once('error', reject)
      server.listen(0, '127.0.0.1', () => resolve())
    }).catch((error) => {
      console.error('[qio] could not open the bridge socket', error)
    })

    const address = server.address()
    this.port = typeof address === 'object' && address ? address.port : 0
    if (!this.port) {
      console.error('[qio] bridge socket has no port')
      return
    }

    server.on('connection', (socket) => this.attach(socket))
    this.spawnBridge()
  }

  private spawnBridge(): void {
    const proc = spawn(
      'powershell.exe',
      [
        '-NoProfile',
        '-NonInteractive',
        '-ExecutionPolicy',
        'Bypass',
        '-File',
        this.scriptPath,
        '-Port',
        String(this.port),
        '-Token',
        this.token
      ],
      { windowsHide: true, stdio: 'ignore' }
    )
    this.proc = proc

    proc.on('error', (error) => console.error('[qio] bridge failed to start', error))
    proc.on('exit', (code) => {
      this.proc = null
      this.socket = null
      this.ready = false
      if (this.stopping) return
      this.restarts += 1
      const delay = Math.min(15_000, 800 * 2 ** Math.min(this.restarts, 4))
      console.error(`[qio] bridge exited (code ${code}); restarting in ${delay}ms`)
      setTimeout(() => {
        if (!this.stopping && !this.proc) this.spawnBridge()
      }, delay)
    })
  }

  private attach(socket: Socket): void {
    socket.setNoDelay(true)
    let handshaken = false

    const reader = createInterface({ input: socket })
    reader.on('line', (line) => {
      const text = line.trim()
      if (!text) return

      if (!handshaken) {
        handshaken = true
        let hello: { type?: string; token?: string } | null = null
        try {
          hello = JSON.parse(text) as { type?: string; token?: string }
        } catch {
          hello = null
        }
        if (!hello || hello.type !== 'hello' || hello.token !== this.token) {
          console.error('[qio] bridge handshake rejected')
          socket.destroy()
          return
        }
        this.socket = socket
        return
      }

      this.handleMessage(text)
    })

    socket.on('close', () => {
      if (this.socket === socket) {
        this.socket = null
        this.ready = false
        this.emit('disconnected')
      }
    })
    socket.on('error', () => {
      // The reader and the process-exit handler look after recovery.
    })
  }

  private handleMessage(text: string): void {
    let message: BridgeMessage
    try {
      message = JSON.parse(text) as BridgeMessage
    } catch {
      return
    }

    switch (message.type) {
      case 'ready': {
        this.ready = true
        this.restarts = 0
        this.emit('ready')
        break
      }
      case 'media': {
        const media: MediaState = {
          status: (message.status as MediaState['status']) ?? 'unavailable',
          title: String(message.title ?? ''),
          artist: String(message.artist ?? ''),
          album: String(message.album ?? ''),
          duration: Number(message.duration ?? 0),
          position: Number(message.position ?? 0),
          app: String(message.app ?? ''),
          coverKey: '',
          canNext: Boolean(message.canNext),
          canPrevious: Boolean(message.canPrevious),
          canSeek: Boolean(message.canSeek),
          receivedAt: Date.now()
        }
        const artwork = typeof message.artwork === 'string' ? message.artwork : ''
        this.emit('media', media, artwork)
        break
      }
      case 'volume':
        this.emit('overlay', {
          kind: 'volume',
          value: typeof message.volume === 'number' ? message.volume : undefined,
          muted: Boolean(message.muted)
        } satisfies OverlayPayload)
        break
      case 'brightness':
        this.emit('overlay', {
          kind: 'brightness',
          value: typeof message.brightness === 'number' ? message.brightness : undefined
        } satisfies OverlayPayload)
        break
      case 'capslock':
        this.emit('overlay', { kind: 'capslock', capsLock: Boolean(message.capsLock) })
        break
      case 'layout':
        this.emit('overlay', { kind: 'layout', label: String(message.layout ?? '') })
        break
      case 'power': {
        const battery = Number(message.battery)
        const charging = Boolean(message.charging)
        this.lastPower = { battery, charging }
        this.emit('power', this.lastPower)
        break
      }
      case 'hour24':
        this.emit('hour24', Boolean(message.hour24))
        break
      case 'fullscreen':
        this.emit('fullscreen', Boolean(message.fullscreen))
        break
      case 'headphones':
        this.emit('headphones', {
          connected: Boolean(message.connected),
          name: String(message.name ?? '')
        })
        break
      case 'bridge-log':
        if (message.level === 'error') console.error('[qio] bridge:', message.message)
        else if (message.level === 'warn') console.warn('[qio] bridge:', message.message)
        else console.log('[qio] bridge:', message.message)
        break
      default:
        break
    }
  }
}
