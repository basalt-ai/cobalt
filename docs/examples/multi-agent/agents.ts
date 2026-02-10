import OpenAI from 'openai';

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface WorkflowResult {
	research: string;
	article: string;
	reviewed: string;
	tokens: number;
}

/**
 * Agent 1: Researcher - Gathers key points
 */
async function researchAgent(topic: string): Promise<string> {
	const completion = await client.chat.completions.create({
		model: 'gpt-4o-mini',
		messages: [
			{
				role: 'system',
				content:
					'You are a research assistant. Generate 5 key points about the topic with supporting facts.',
			},
			{
				role: 'user',
				content: `Topic: ${topic}\n\nProvide research notes:`,
			},
		],
		temperature: 0.7,
		max_tokens: 300,
	});

	return completion.choices[0].message.content || '';
}

/**
 * Agent 2: Writer - Creates article from research
 */
async function writerAgent(topic: string, research: string): Promise<string> {
	const completion = await client.chat.completions.create({
		model: 'gpt-4o-mini',
		messages: [
			{
				role: 'system',
				content:
					'You are a professional writer. Create a well-structured article based on the research notes.',
			},
			{
				role: 'user',
				content: `Topic: ${topic}\n\nResearch Notes:\n${research}\n\nWrite an article (200 words):`,
			},
		],
		temperature: 0.7,
		max_tokens: 400,
	});

	return completion.choices[0].message.content || '';
}

/**
 * Agent 3: Reviewer - Reviews and improves article
 */
async function reviewerAgent(article: string): Promise<string> {
	const completion = await client.chat.completions.create({
		model: 'gpt-4o-mini',
		messages: [
			{
				role: 'system',
				content:
					'You are an editor. Review the article for quality, clarity, and accuracy. Return the final reviewed version.',
			},
			{
				role: 'user',
				content: `Article:\n${article}\n\nProvide reviewed version:`,
			},
		],
		temperature: 0.3,
		max_tokens: 400,
	});

	return completion.choices[0].message.content || '';
}

/**
 * Run the complete 3-agent workflow
 */
export async function runWorkflow(topic: string): Promise<WorkflowResult> {
	// Agent 1: Research
	const research = await researchAgent(topic);

	// Agent 2: Write (uses research)
	const article = await writerAgent(topic, research);

	// Agent 3: Review (uses article)
	const reviewed = await reviewerAgent(article);

	return {
		research,
		article,
		reviewed,
		tokens: 1000, // Approximate
	};
}

// For testing
if (import.meta.url === `file://${process.argv[1]}`) {
	const topic = process.argv[2] || 'Artificial Intelligence';

	console.log(`Running workflow for: ${topic}`);

	runWorkflow(topic)
		.then((result) => {
			console.log('\n=== RESEARCH ===');
			console.log(result.research);
			console.log('\n=== ARTICLE ===');
			console.log(result.article);
			console.log('\n=== REVIEWED ===');
			console.log(result.reviewed);
		})
		.catch((error) => {
			console.error('Error:', error.message);
			process.exit(1);
		});
}
