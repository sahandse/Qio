import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { SettingsPage } from './components/SettingsPanel'
import './styles.css'

const container = document.getElementById('settings-root')
if (container) {
  createRoot(container).render(
    <StrictMode>
      <SettingsPage />
    </StrictMode>
  )
}
