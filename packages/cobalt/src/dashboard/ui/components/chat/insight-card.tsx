import { Sparkle } from '@phosphor-icons/react'
import { useEffect, useState } from 'react'
import type { AnalysisResponse } from '../../api/chat'
import { getCompareAnalysis, getRunAnalysis } from '../../api/chat'
import { Skeleton } from '../ui/skeleton'

interface InsightCardProps {
	runId?: string
	compareIds?: string[]
	chatEnabled: boolean
}

export function InsightCard({ runId, compareIds, chatEnabled }: InsightCardProps) {
	const [analysis, setAnalysis] = useState<string | null>(null)
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState(false)

	useEffect(() => {
		if (!chatEnabled) return

		let cancelled = false
		setLoading(true)
		setError(false)

		const fetch = async () => {
			try {
				let result: AnalysisResponse
				if (runId) {
					result = await getRunAnalysis(runId)
				} else if (compareIds?.length) {
					result = await getCompareAnalysis(compareIds)
				} else {
					return
				}
				if (!cancelled) setAnalysis(result.analysis)
			} catch {
				if (!cancelled) setError(true)
			} finally {
				if (!cancelled) setLoading(false)
			}
		}

		fetch()
		return () => {
			cancelled = true
		}
	}, [runId, compareIds, chatEnabled])

	if (!chatEnabled) {
		return (
			<div className="rounded-xl border border-dashed bg-card p-4">
				<div className="flex items-center gap-2">
					<Sparkle className="h-4 w-4 text-muted-foreground" />
					<span className="text-xs text-muted-foreground">
						AI insights require configuration. Add{' '}
						<code className="text-[10px] bg-muted px-1 py-0.5 rounded">dashboard.chat</code> to your
						cobalt.config.ts
					</span>
				</div>
			</div>
		)
	}

	if (loading) {
		return (
			<div className="rounded-xl border bg-card p-4 shadow-sm">
				<div className="flex items-center gap-2">
					<Sparkle className="h-4 w-4 text-brand animate-pulse" weight="fill" />
					<span className="text-xs font-medium text-muted-foreground animate-pulse">
						Analyzing results...
					</span>
				</div>
				<div className="mt-3 space-y-2">
					<Skeleton className="h-3 w-full rounded" />
					<Skeleton className="h-3 w-4/5 rounded" />
					<Skeleton className="h-3 w-3/5 rounded" />
				</div>
			</div>
		)
	}

	if (error || !analysis) return null

	return (
		<div className="rounded-xl border bg-card p-4 shadow-sm">
			<div className="flex items-center gap-2 mb-2">
				<Sparkle className="h-4 w-4 text-brand" weight="fill" />
				<span className="text-xs font-medium text-muted-foreground">AI Analysis</span>
			</div>
			<p className="text-sm text-muted-foreground whitespace-pre-wrap">{analysis}</p>
		</div>
	)
}
