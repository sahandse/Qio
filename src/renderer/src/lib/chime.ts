let context: AudioContext | null = null

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

/** Two soft bells: rising for focus start, falling for a finished session. */
export function playChime(kind: 'start' | 'end' | 'break' = 'end'): void {
  primeAudio()
  const ctx = context
  if (!ctx) return
  const now = ctx.currentTime + 0.02
  const notes = kind === 'start' ? [523.25, 783.99] : kind === 'break' ? [659.25, 987.77] : [783.99, 523.25]
  tone(ctx, notes[0], now, 0.55, 0.16)
  tone(ctx, notes[1], now + 0.22, 0.75, 0.12)
}
