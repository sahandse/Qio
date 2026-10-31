import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import PickerView from './PickerView'
import './styles.css'

const container = document.getElementById('picker-root')
if (container) {
  createRoot(container).render(
    <StrictMode>
      <PickerView />
    </StrictMode>
  )
}
