import { FadersHorizontal } from '@phosphor-icons/react';
import { Button } from '../ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Switch } from '../ui/switch';

export interface ColumnVisibility {
	[key: string]: boolean;
}

interface DisplayOptionsProps {
	columns: { key: string; label: string }[];
	visibility: ColumnVisibility;
	onVisibilityChange: (visibility: ColumnVisibility) => void;
}

export function DisplayOptions({ columns, visibility, onVisibilityChange }: DisplayOptionsProps) {
	return (
		<Popover>
			<PopoverTrigger asChild>
				<Button variant="outline" size="sm">
					<FadersHorizontal className="h-4 w-4 mr-1.5" />
					Display
				</Button>
			</PopoverTrigger>
			<PopoverContent align="end" className="w-56">
				<div className="space-y-1">
					<p className="text-xs font-medium text-muted-foreground mb-2">Toggle columns</p>
					{columns.map((col) => (
						<div key={col.key} className="flex items-center justify-between py-1.5">
							<label htmlFor={`col-${col.key}`} className="text-sm cursor-pointer">
								{col.label}
							</label>
							<Switch
								id={`col-${col.key}`}
								checked={visibility[col.key] !== false}
								onCheckedChange={(checked) =>
									onVisibilityChange({ ...visibility, [col.key]: checked })
								}
							/>
						</div>
					))}
				</div>
			</PopoverContent>
		</Popover>
	);
}
