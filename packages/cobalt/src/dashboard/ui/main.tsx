import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router'
import { router } from './router'
import './styles/globals.css'

const root = document.getElementById('root')
if (!root) throw new Error('Root element not found')

createRoot(root).render(
	<StrictMode>
		<RouterProvider router={router} />
	</StrictMode>,
)
