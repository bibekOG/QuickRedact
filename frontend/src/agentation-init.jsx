import React from 'react'
import ReactDOM from 'react-dom/client'
import { Agentation } from 'agentation'

export function initAgentation() {
  if (import.meta.env.DEV) {
    const rootElement = document.getElementById('agentation-root')
    if (rootElement) {
      ReactDOM.createRoot(rootElement).render(
        <React.StrictMode>
          <Agentation />
        </React.StrictMode>
      )
    }
  }
}
