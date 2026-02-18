import { useChat } from '@ai-sdk/react'
import { PaperPlaneTilt, X } from '@phosphor-icons/react'
import { type FormEvent, useEffect, useRef, useState } from 'react'
import { useChatContext } from '../../hooks/use-chat-context'
import { cn } from '../../lib/utils'
import { Button } from '../ui/button'
import { ChatMessage } from './chat-message'

interface ChatPanelProps {
	open: boolean
	onClose: () => void
}

export function ChatPanel({ open, onClose }: ChatPanelProps) {
	const chatContext = useChatContext()
	const scrollRef = useRef<HTMLDivElement>(null)
	const [input, setInput] = useState('')

	const { messages, sendMessage, status } = useChat({
		api: '/api/chat',
	})

	const isLoading = status === 'submitted' || status === 'streaming'

	// Auto-scroll to bottom on new messages
	useEffect(() => {
		if (messages.length > 0 && scrollRef.current) {
			scrollRef.current.scrollTop = scrollRef.current.scrollHeight
		}
	}, [messages.length])

	const onSubmit = (e: FormEvent) => {
		e.preventDefault()
		const text = input.trim()
		if (!text || isLoading) return
		setInput('')
		sendMessage({ text }, { body: { context: chatContext } })
	}

	if (!open) return null

	return (
		<aside className="fixed right-0 top-14 bottom-0 w-96 border-l bg-card flex flex-col z-30">
			{/* Header */}
			<div className="flex items-center justify-between border-b px-4 py-3">
				<div>
					<p className="text-sm font-semibold">AI Assistant</p>
					<p className="text-[10px] text-muted-foreground capitalize">
						{chatContext.page.replace('-', ' ')}
					</p>
				</div>
				<Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
					<X className="h-4 w-4" />
				</Button>
			</div>

			{/* Messages */}
			<div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
				{messages.length === 0 && (
					<div className="flex flex-col items-center justify-center h-full text-center">
						<p className="text-sm text-muted-foreground">
							Ask me anything about your experiment results.
						</p>
						<p className="text-xs text-muted-foreground mt-1">
							I have context about the current page.
						</p>
					</div>
				)}
				{messages.map(m => (
					<ChatMessage key={m.id} message={m} />
				))}
				{isLoading && messages.length > 0 && messages[messages.length - 1].role === 'user' && (
					<div className="flex gap-2.5">
						<div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand/10 text-brand">
							<span className="animate-pulse text-xs">...</span>
						</div>
					</div>
				)}
			</div>

			{/* Input */}
			<form onSubmit={onSubmit} className="border-t px-4 py-3 flex gap-2">
				<input
					value={input}
					onChange={e => setInput(e.target.value)}
					placeholder="Ask about your experiments..."
					className={cn(
						'flex-1 h-9 rounded-md border bg-background px-3 text-sm',
						'focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand',
						'placeholder:text-muted-foreground',
					)}
					disabled={isLoading}
				/>
				<Button
					type="submit"
					size="icon"
					className="h-9 w-9 shrink-0"
					disabled={isLoading || !input.trim()}
				>
					<PaperPlaneTilt className="h-4 w-4" />
				</Button>
			</form>
		</aside>
	)
}
