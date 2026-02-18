import { ChatCircle, Moon, Sun } from '@phosphor-icons/react'
import { Link, useLocation } from 'react-router'
import logoSrc from '../../assets/logo.png'
import { useTheme } from '../../hooks/use-theme'
import { cn } from '../../lib/utils'
import { Button } from '../ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip'

const navLinks = [
	{ to: '/', label: 'Runs' },
	{ to: '/trends', label: 'Trends' },
]

interface TopBarProps {
	chatEnabled?: boolean
	chatOpen?: boolean
	onChatToggle?: () => void
}

export function TopBar({ chatEnabled, chatOpen, onChatToggle }: TopBarProps) {
	const location = useLocation()
	const { theme, toggleTheme } = useTheme()

	return (
		<header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
			<div className="flex h-14 items-center px-6 gap-6">
				<Link to="/" className="flex items-center gap-1">
					<img src={logoSrc} alt="Cobalt" className="h-7" />
				</Link>

				<nav className="flex items-center gap-1">
					{navLinks.map(link => (
						<Link
							key={link.to}
							to={link.to}
							className={cn(
								'px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
								location.pathname === link.to
									? 'bg-accent text-foreground'
									: 'text-muted-foreground hover:text-foreground hover:bg-accent/50',
							)}
						>
							{link.label}
						</Link>
					))}
				</nav>

				<div className="ml-auto flex items-center gap-2">
					<Button variant="ghost" size="icon" onClick={toggleTheme} aria-label="Toggle theme">
						{theme === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
					</Button>

					{chatEnabled ? (
						<Button
							variant={chatOpen ? 'secondary' : 'ghost'}
							size="icon"
							onClick={onChatToggle}
							aria-label="Toggle AI chat"
						>
							<ChatCircle className="h-4 w-4" weight={chatOpen ? 'fill' : 'regular'} />
						</Button>
					) : (
						<Tooltip>
							<TooltipTrigger asChild>
								<Button variant="ghost" size="icon" disabled aria-label="AI chat disabled">
									<ChatCircle className="h-4 w-4" />
								</Button>
							</TooltipTrigger>
							<TooltipContent>
								<p className="text-xs">Configure AI chat in cobalt.config.ts</p>
							</TooltipContent>
						</Tooltip>
					)}
				</div>
			</div>
		</header>
	)
}
