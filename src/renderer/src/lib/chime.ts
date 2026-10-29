let context: AudioContext | null = null

/** Every cue the app can make; each one is a pair of soft tones at most. */
export type Cue = 'start' | 'pause' | 'end' | 'break' | 'error'

const CUES: Record<Cue, { notes: number[]; gap: number; duration: number; gain: number }> = {
  start: { notes: [523.25, 783.99], gap: 0.22, duration: 0.6, gain: 0.16 },
  pause: { notes: [523.25], gap: 0, duration: 0.4, gain: 0.1 },
  end: { notes: [783.99, 523.25], gap: 0.22, duration: 0.7, gain: 0.14 },
  break: { notes: [659.25, 987.77], gap: 0.2, duration: 0.6, gain: 0.14 },
  error: { notes: [311.13, 233.08], gap: 0.16, duration: 0.45, gain: 0.12 }
}

/** Browsers keep audio suspended until the user interacts, so warm it up on the first click. */
export function primeAudio(): void {
  try {
    context ??= new AudioContext()
    if (context.state === 'suspended') void context.resume()
  } catch {
    context = null
  }
}

function tone(ctx: AudioContext, frequency: number, startAt: number, duration: number, gain: number): void {
  const oscillator = ctx.createOscillator()
  const amp = ctx.createGain()
  oscillator.type = 'sine'
  oscillator.frequency.setValueAtTime(frequency, startAt)
  amp.gain.setValueAtTime(0.0001, startAt)
  amp.gain.exponentialRampToValueAtTime(gain, startAt + 0.02)
  amp.gain.exponentialRampToValueAtTime(0.0001, startAt + duration)
  oscillator.connect(amp).connect(ctx.destination)
  oscillator.start(startAt)
  oscillator.stop(startAt + duration + 0.05)
}

/** Plays a cue; the caller decides whether the moment calls for it. */
export function playChime(kind: Cue = 'end'): void {
  primeAudio()
  const ctx = context
  if (!ctx) return
  const cue = CUES[kind]
  const start = ctx.currentTime + 0.02
  cue.notes.forEach((frequency, index) => {
    tone(ctx, frequency, start + index * cue.gap, cue.duration, cue.gain)
  })
}

/** One gate for every cue: honours the system mute and the user's chime preference. */
export function playCue(kind: Cue, options: { muted?: boolean; enabled?: boolean } = {}): void {
  if (options.muted || options.enabled === false) return
  playChime(kind)
}
