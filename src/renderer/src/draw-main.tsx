import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import DrawView from './DrawView'
import './styles.css'

const container = document.getElementById('draw-root')
if (container) {
  createRoot(container).render(
    <StrictMode>
      <DrawView />
    </StrictMode>
  )
}
