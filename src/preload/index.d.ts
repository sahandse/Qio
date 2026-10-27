import type { QioApi } from '@shared/api'

declare global {
  interface Window {
    qio: QioApi
  }
}

export {}
