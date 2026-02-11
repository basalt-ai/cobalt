import { Link } from 'react-router';
import { Button } from '../components/ui/button';

export function NotFoundPage() {
	return (
		<div className="flex flex-col items-center justify-center py-20 text-center">
			<p className="text-4xl font-bold text-muted-foreground">404</p>
			<p className="mt-2 text-lg font-medium">Page not found</p>
			<p className="mt-1 text-sm text-muted-foreground">
				The page you're looking for doesn't exist
			</p>
			<Link to="/">
				<Button variant="outline" size="sm" className="mt-4">
					Back to runs
				</Button>
			</Link>
		</div>
	);
}
