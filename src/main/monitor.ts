/**
 * System readings for the monitor tool. Everything here is read on demand, from
 * data the OS already publishes: no native module, no background sampling, and
 * nothing happens unless the panel asks for a sample.
 */
import { app } from 'electron'
import { execFile } from 'node:child_process'
import { existsSync, statfsSync } from 'node:fs'
import os from 'node:os'
import { promisify } from 'node:util'
import type { SystemDisk, SystemSample } from '@shared/types'

const run = promisify(execFile)

interface CpuTimes {
  idle: number
  total: number
}

function cpuTimes(): CpuTimes {
  let idle = 0
  let total = 0
  for (const cpu of os.cpus()) {
    idle += cpu.times.idle
    total += cpu.times.user + cpu.times.nice + cpu.times.sys + cpu.times.idle + cpu.times.irq
  }
  return { idle, total }
}

/** `netstat -e` totals, the only network counters Windows exposes without a driver. */
async function netTotals(): Promise<{ rx: number; tx: number } | null> {
  if (process.platform !== 'win32') return null
  try {
    const { stdout } = await run('netstat', ['-e'], { windowsHide: true, timeout: 4000 })
    const match = /^\s*Bytes\s+(\d+)\s+(\d+)/m.exec(stdout)
    if (!match) return null
    return { rx: Number(match[1]), tx: Number(match[2]) }
  } catch {
    return null
  }
}

function disks(): SystemDisk[] {
  if (process.platform !== 'win32') return []
  const found: SystemDisk[] = []
  for (const letter of 'CDEFGHIJKLMNOPQRSTUVWXYZ') {
    const root = `${letter}:\\`
    if (!existsSync(root)) continue
    try {
      const info = statfsSync(root)
      const total = info.blocks * info.bsize
      const free = info.bavail * info.bsize
      if (total <= 0) continue
      found.push({ name: `${letter}:`, used: total - free, total })
    } catch {
      // A drive can disappear between the existence check and the stat: skip it.
    }
  }
  return found
}

/** The monitoring tab is the only caller, so a single instance is enough. */
export class MonitorService {
  private lastCpu = cpuTimes()
  private lastNet: { rx: number; tx: number; at: number } | null = null

  /** Bytes per second since the previous sample; null until two samples exist. */
  private netRate(now: number, totals: { rx: number; tx: number } | null): { rx: number; tx: number } | null {
    const previous = this.lastNet
    this.lastNet = totals ? { ...totals, at: now } : null
    if (!totals || !previous) return null
    const seconds = Math.max(0.2, (now - previous.at) / 1000)
    return {
      rx: Math.max(0, (totals.rx - previous.rx) / seconds),
      tx: Math.max(0, (totals.tx - previous.tx) / seconds)
    }
  }

  async sample(): Promise<SystemSample> {
    const now = Date.now()
    const cpu = cpuTimes()
    const idle = cpu.idle - this.lastCpu.idle
    const total = cpu.total - this.lastCpu.total
    this.lastCpu = cpu
    const usage = total > 0 ? Math.min(1, Math.max(0, 1 - idle / total)) : 0

    const totals = await netTotals()
    const net = this.netRate(now, totals)

    let workingSet = 0
    let cpuPercent = 0
    for (const metric of app.getAppMetrics()) {
      workingSet += (metric.memory?.workingSetSize ?? 0) * 1024
      cpuPercent += metric.cpu?.percentCPUUsage ?? 0
    }

    return {
      cpu: { usage, cores: os.cpus().length, model: os.cpus()[0]?.model ?? '' },
      mem: { used: os.totalmem() - os.freemem(), total: os.totalmem() },
      disks: disks(),
      net,
      app: { cpu: cpuPercent, memory: workingSet },
      at: now
    }
  }
}
