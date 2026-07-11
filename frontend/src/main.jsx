import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// Must run before App (and every page's own axios.create() call) —
// see src/api/authInterceptor.js for why.
import './api/authInterceptor.js'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
