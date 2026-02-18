import { useEffect, useMemo, useState } from 'react'
import { Outlet, useLocation, useSearchParams } from 'react-router'
import { getChatConfig } from '../api/chat'
import { ChatPanel } from '../components/chat/chat-panel'
import { TopBar } from '../components/layout/top-bar'
import { TooltipProvider } from '../components/ui/tooltip'
import { ChatContext, type ChatContextValue } from '../hooks/use-chat-context'
import { cn } from '../lib/utils'

export function RootLayout() {
	const [chatOpen, setChatOpen] = useState(false)
	const [chatEnabled, setChatEnabled] = useState(false)
	const location = useLocation()
	const [searchParams] = useSearchParams()

	// Check if chat is configured on mount
	useEffect(() => {
		getChatConfig()
			.then(config => setChatEnabled(config.enabled))
			.catch(() => setChatEnabled(false))
	}, [])

	// Derive chat context from current route
	const chatContext = useMemo<ChatContextValue>(() => {
		const path = location.pathname

		if (path.startsWith('/runs/')) {
			return { page: 'run-detail', runId: path.replace('/runs/', '') }
		}
		if (path.startsWith('/compare')) {
			const a = searchParams.get('a')
			const b = searchParams.get('b')
			const c = searchParams.get('c')
			const ids = [a, b, c].filter(Boolean) as string[]
			return { page: 'compare', compareIds: ids }
		}
		if (path.startsWith('/trends')) {
			return { page: 'trends', experiment: searchParams.get('experiment') ?? undefined }
		}
		return { page: 'runs' }
	}, [location.pathname, searchParams])

	return (
		<ChatContext value={chatContext}>
			<TooltipProvider delayDuration={300}>
				<div className="min-h-screen bg-background text-foreground">
					<TopBar
						chatEnabled={chatEnabled}
						chatOpen={chatOpen}
						onChatToggle={() => setChatOpen(!chatOpen)}
					/>
					<div className={cn('transition-all duration-200', chatOpen && chatEnabled && 'mr-96')}>
						<main className="mx-auto max-w-7xl px-6 py-6">
							<Outlet context={{ chatEnabled }} />
						</main>
					</div>
					{chatEnabled && <ChatPanel open={chatOpen} onClose={() => setChatOpen(false)} />}
				</div>
			</TooltipProvider>
		</ChatContext>
	)
}
