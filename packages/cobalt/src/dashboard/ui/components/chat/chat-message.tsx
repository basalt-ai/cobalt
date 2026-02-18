import { Robot, User } from '@phosphor-icons/react'
import { cn } from '../../lib/utils'

interface MessagePart {
	type: string
	text?: string
}

interface ChatMessageProps {
	message: {
		id: string
		role: 'user' | 'assistant' | 'system'
		parts?: MessagePart[]
		content?: string
	}
}

function getTextContent(message: ChatMessageProps['message']): string {
	if (message.parts?.length) {
		return message.parts
			.filter(p => p.type === 'text' && p.text)
			.map(p => p.text)
			.join('')
	}
	return message.content ?? ''
}

export function ChatMessage({ message }: ChatMessageProps) {
	const isUser = message.role === 'user'
	const text = getTextContent(message)

	if (!text) return null

	return (
		<div className={cn('flex gap-2.5', isUser && 'flex-row-reverse')}>
			<div
				className={cn(
					'flex h-6 w-6 shrink-0 items-center justify-center rounded-full',
					isUser ? 'bg-primary text-primary-foreground' : 'bg-brand/10 text-brand',
				)}
			>
				{isUser ? <User className="h-3.5 w-3.5" /> : <Robot className="h-3.5 w-3.5" />}
			</div>
			<div
				className={cn(
					'rounded-lg px-3 py-2 text-sm max-w-[85%]',
					isUser ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground',
				)}
			>
				<p className="whitespace-pre-wrap">{text}</p>
			</div>
		</div>
	)
}
