export default function Home() {
	return (
		<main>
			<div className="container">
				<h1>Welcome to Cobalt</h1>
				<p>A TypeScript full-stack application with CQRS architecture</p>

				<div className="links">
					<a href="/api/health" target="_blank" rel="noopener noreferrer">
						Health Check
					</a>
					<a href="/api/status" target="_blank" rel="noopener noreferrer">
						System Status
					</a>
				</div>
			</div>
		</main>
	);
}
