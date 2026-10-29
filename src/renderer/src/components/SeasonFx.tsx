import { useFestival } from '../lib/season'

interface Particle {
  x: number
  size: number
  delay: number
  duration: number
  drift: number
  spin: number
}

/** Deterministic petals for Nowruz and embers for Yalda: no random jitter between renders. */
const PETALS: Particle[] = [
  { x: 11, size: 4, delay: -1, duration: 11, drift: 16, spin: 220 },
  { x: 24, size: 3, delay: -6, duration: 13, drift: -12, spin: -180 },
  { x: 37, size: 5, delay: -3.5, duration: 12, drift: 20, spin: 260 },
  { x: 49, size: 3, delay: -9, duration: 14, drift: -18, spin: -220 },
  { x: 61, size: 4, delay: -2, duration: 10.5, drift: 12, spin: 200 },
  { x: 73, size: 3, delay: -7.5, duration: 13.5, drift: -14, spin: -240 },
  { x: 85, size: 4.5, delay: -4.5, duration: 12.5, drift: 18, spin: 230 },
  { x: 43, size: 3, delay: -11, duration: 15, drift: 10, spin: -200 }
]

const EMBERS: Particle[] = [
  { x: 9, size: 3, delay: -2, duration: 9, drift: 12, spin: 0 },
  { x: 21, size: 2.5, delay: -5.5, duration: 11, drift: -10, spin: 0 },
  { x: 34, size: 3.5, delay: -1, duration: 10, drift: 14, spin: 0 },
  { x: 47, size: 2.5, delay: -7, duration: 12, drift: -12, spin: 0 },
  { x: 59, size: 3, delay: -3.5, duration: 9.5, drift: 10, spin: 0 },
  { x: 72, size: 2.5, delay: -8.5, duration: 11.5, drift: -8, spin: 0 },
  { x: 84, size: 3.5, delay: -4, duration: 10.5, drift: 12, spin: 0 }
]

/** A few drifting particles over the shell during Nowruz and Yalda nights. */
export function SeasonFx({ on }: { on: boolean }) {
  const festival = useFestival(on)
  if (!festival) return null
  const particles = festival === 'nowruz' ? PETALS : EMBERS

  return (
    <span className={`season-fx ${festival}`} aria-hidden="true">
      {particles.map((particle, index) => (
        <span
          key={index}
          style={{
            left: `${particle.x}%`,
            width: particle.size,
            height: particle.size,
            animationDelay: `${particle.delay}s`,
            animationDuration: `${particle.duration}s`,
            ['--drift' as string]: `${particle.drift}px`,
            ['--spin' as string]: `${particle.spin}deg`
          }}
        />
      ))}
    </span>
  )
}
