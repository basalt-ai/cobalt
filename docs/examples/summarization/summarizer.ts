import OpenAI from 'openai';

const client = new OpenAI({
	apiKey: process.env.OPENAI_API_KEY,
});

export interface SummaryResponse {
	summary: string;
	model: string;
	tokens: number;
	duration: number;
}

/**
 * Summarize a document using OpenAI
 *
 * @param title - Article title
 * @param content - Full article text
 * @param maxWords - Target summary length in words (default: 100)
 * @returns Summary with metadata
 */
export async function summarize(
	title: string,
	content: string,
	maxWords = 100,
): Promise<SummaryResponse> {
	const startTime = Date.now();

	const completion = await client.chat.completions.create({
		model: 'gpt-5-mini',
		messages: [
			{
				role: 'system',
				content: `You are an expert summarizer. Create concise, accurate summaries that:
- Preserve all key facts and main points
- Use approximately ${maxWords} words
- Maintain factual accuracy (no hallucinations)
- Are clear and well-structured

Do not include opinions or information not in the source.`,
			},
			{
				role: 'user',
				content: `Title: ${title}\n\nContent:\n${content}\n\nProvide a ${maxWords}-word summary:`,
			},
		],
		temperature: 0.3,
		max_tokens: maxWords * 2, // Allow some buffer
	});

	const summary = completion.choices[0].message.content || '';
	const tokens = completion.usage?.total_tokens || 0;
	const duration = Date.now() - startTime;

	return {
		summary,
		model: 'gpt-5-mini',
		tokens,
		duration,
	};
}

// For testing the summarizer directly
if (import.meta.url === `file://${process.argv[1]}`) {
	const testContent = `Artificial intelligence (AI) has made remarkable progress in recent years,
	transforming industries from healthcare to finance. Machine learning models can now perform
	complex tasks like image recognition, natural language processing, and game playing with
	superhuman accuracy. However, concerns about AI safety, bias, and ethical implications remain.`;

	console.log('Summarizing test content...');

	summarize('AI Progress', testContent, 50)
		.then((response) => {
			console.log(`Summary: ${response.summary}`);
			console.log(`Tokens: ${response.tokens}`);
			console.log(`Duration: ${response.duration}ms`);
		})
		.catch((error) => {
			console.error('Error:', error.message);
			process.exit(1);
		});
}
