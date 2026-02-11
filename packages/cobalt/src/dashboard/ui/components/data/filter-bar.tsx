import { FunnelSimple, Plus, X } from '@phosphor-icons/react';
import { useState } from 'react';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';

export interface FilterDef {
	key: string;
	label: string;
	type: 'text' | 'number' | 'boolean' | 'select';
	options?: string[];
}

export interface FilterValue {
	key: string;
	operator: 'eq' | 'gt' | 'lt' | 'gte' | 'lte' | 'contains';
	value: string;
}

interface FilterBarProps {
	filters: FilterValue[];
	onFiltersChange: (filters: FilterValue[]) => void;
	filterDefs: FilterDef[];
}

export function FilterBar({ filters, onFiltersChange, filterDefs }: FilterBarProps) {
	const [isAdding, setIsAdding] = useState(false);
	const [newFilterKey, setNewFilterKey] = useState('');
	const [newFilterValue, setNewFilterValue] = useState('');
	const [newFilterOperator, setNewFilterOperator] = useState<FilterValue['operator']>('contains');

	function removeFilter(index: number) {
		onFiltersChange(filters.filter((_, i) => i !== index));
	}

	function addFilter() {
		if (!newFilterKey || !newFilterValue) return;
		onFiltersChange([
			...filters,
			{ key: newFilterKey, operator: newFilterOperator, value: newFilterValue },
		]);
		setNewFilterKey('');
		setNewFilterValue('');
		setIsAdding(false);
	}

	const selectedDef = filterDefs.find((d) => d.key === newFilterKey);
	const operators =
		selectedDef?.type === 'number'
			? (['eq', 'gt', 'lt', 'gte', 'lte'] as const)
			: selectedDef?.type === 'boolean'
				? (['eq'] as const)
				: (['contains', 'eq'] as const);

	return (
		<div className="flex items-center gap-2 flex-wrap">
			{filters.length > 0 && <FunnelSimple className="h-4 w-4 text-muted-foreground shrink-0" />}

			{filters.map((filter, i) => {
				const def = filterDefs.find((d) => d.key === filter.key);
				return (
					<Badge
						key={`${filter.key}-${filter.operator}-${filter.value}`}
						color="sand"
						size="sm"
						variant="outline"
					>
						<span className="font-medium">{def?.label ?? filter.key}</span>
						<span className="text-muted-foreground mx-0.5">{operatorLabel(filter.operator)}</span>
						<span>{filter.value}</span>
						<button
							type="button"
							onClick={() => removeFilter(i)}
							className="ml-1 hover:text-foreground text-muted-foreground"
						>
							<X className="h-3 w-3" />
						</button>
					</Badge>
				);
			})}

			<Popover open={isAdding} onOpenChange={setIsAdding}>
				<PopoverTrigger asChild>
					<Button variant="ghost" size="sm" className="h-7 px-2 text-muted-foreground">
						<Plus className="h-3.5 w-3.5 mr-1" />
						{filters.length === 0 ? 'Add filter' : 'Add'}
					</Button>
				</PopoverTrigger>
				<PopoverContent align="start" className="w-64">
					<div className="space-y-3">
						<div>
							<label className="text-xs font-medium text-muted-foreground" htmlFor="filter-field">
								Field
							</label>
							<select
								id="filter-field"
								className="mt-1 w-full rounded-md border bg-background px-2 py-1.5 text-sm"
								value={newFilterKey}
								onChange={(e) => {
									setNewFilterKey(e.target.value);
									const def = filterDefs.find((d) => d.key === e.target.value);
									setNewFilterOperator(def?.type === 'number' ? 'gte' : 'contains');
								}}
							>
								<option value="">Select field...</option>
								{filterDefs.map((def) => (
									<option key={def.key} value={def.key}>
										{def.label}
									</option>
								))}
							</select>
						</div>

						{newFilterKey && (
							<>
								<div>
									<label className="text-xs font-medium text-muted-foreground" htmlFor="filter-op">
										Operator
									</label>
									<select
										id="filter-op"
										className="mt-1 w-full rounded-md border bg-background px-2 py-1.5 text-sm"
										value={newFilterOperator}
										onChange={(e) =>
											setNewFilterOperator(e.target.value as FilterValue['operator'])
										}
									>
										{operators.map((op) => (
											<option key={op} value={op}>
												{operatorLabel(op)}
											</option>
										))}
									</select>
								</div>

								<div>
									<label className="text-xs font-medium text-muted-foreground" htmlFor="filter-val">
										Value
									</label>
									{selectedDef?.type === 'select' && selectedDef.options ? (
										<select
											id="filter-val"
											className="mt-1 w-full rounded-md border bg-background px-2 py-1.5 text-sm"
											value={newFilterValue}
											onChange={(e) => setNewFilterValue(e.target.value)}
										>
											<option value="">Select...</option>
											{selectedDef.options.map((opt) => (
												<option key={opt} value={opt}>
													{opt}
												</option>
											))}
										</select>
									) : selectedDef?.type === 'boolean' ? (
										<select
											id="filter-val"
											className="mt-1 w-full rounded-md border bg-background px-2 py-1.5 text-sm"
											value={newFilterValue}
											onChange={(e) => setNewFilterValue(e.target.value)}
										>
											<option value="">Select...</option>
											<option value="true">Yes</option>
											<option value="false">No</option>
										</select>
									) : (
										<input
											id="filter-val"
											type={selectedDef?.type === 'number' ? 'number' : 'text'}
											className="mt-1 w-full rounded-md border bg-background px-2 py-1.5 text-sm"
											placeholder="Value..."
											value={newFilterValue}
											onChange={(e) => setNewFilterValue(e.target.value)}
											onKeyDown={(e) => e.key === 'Enter' && addFilter()}
										/>
									)}
								</div>

								<Button size="sm" className="w-full" onClick={addFilter} disabled={!newFilterValue}>
									Apply filter
								</Button>
							</>
						)}
					</div>
				</PopoverContent>
			</Popover>
		</div>
	);
}

function operatorLabel(op: FilterValue['operator']): string {
	switch (op) {
		case 'eq':
			return '=';
		case 'gt':
			return '>';
		case 'lt':
			return '<';
		case 'gte':
			return '>=';
		case 'lte':
			return '<=';
		case 'contains':
			return 'contains';
	}
}

/** Apply filters to a list of items. Each item is a Record-like object. */
export function applyFilters<T extends Record<string, unknown>>(
	items: T[],
	filters: FilterValue[],
): T[] {
	if (filters.length === 0) return items;
	return items.filter((item) =>
		filters.every((filter) => {
			const raw = getNestedValue(item, filter.key);
			if (raw == null) return false;
			const val = typeof raw === 'number' ? raw : String(raw);
			const filterVal = filter.value;

			switch (filter.operator) {
				case 'contains':
					return String(val).toLowerCase().includes(filterVal.toLowerCase());
				case 'eq':
					return String(val).toLowerCase() === filterVal.toLowerCase();
				case 'gt':
					return Number(val) > Number(filterVal);
				case 'lt':
					return Number(val) < Number(filterVal);
				case 'gte':
					return Number(val) >= Number(filterVal);
				case 'lte':
					return Number(val) <= Number(filterVal);
				default:
					return true;
			}
		}),
	);
}

function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
	return path.split('.').reduce<unknown>((acc, key) => {
		if (acc != null && typeof acc === 'object') return (acc as Record<string, unknown>)[key];
		return undefined;
	}, obj);
}
