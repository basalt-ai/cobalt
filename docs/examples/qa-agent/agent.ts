import OpenAI from 'openai';

const client = new OpenAI({
	apiKey: process.env.OPENAI_API_KEY,
});

export interface QAResponse {
	answer: string;
	model: string;
	tokens: number;
	duration: number;
}

/**
 * Answer a question using OpenAI gpt-5-mini
 *
 * @param question - The question to answer
 * @returns The answer with metadata
 */
export async function answerQuestion(question: string): Promise<QAResponse> {
	const startTime = Date.now();

	const completion = await client.chat.completions.create({
		model: 'gpt-5-mini',
		messages: [
			{
				role: 'system',
				content:
					'You are a helpful assistant that provides accurate, concise answers to questions. Keep answers brief and factual. Answer in one or two sentences maximum.',
			},
			{
				role: 'user',
				content: question,
			},
		],
		temperature: 0.1, // Low temperature for factual answers
		max_tokens: 100, // Keep answers concise
	});

	const answer = completion.choices[0].message.content || '';
	const tokens = completion.usage?.total_tokens || 0;
	const duration = Date.now() - startTime;

	return {
		answer,
		model: 'gpt-5-mini',
		tokens,
		duration,
	};
}

// For testing the agent directly
if (import.meta.url === `file://${process.argv[1]}`) {
	const question = process.argv[2] || 'What is the capital of France?';

	console.log(`Question: ${question}`);

	answerQuestion(question)
		.then((response) => {
			console.log(`Answer: ${response.answer}`);
			console.log(`Model: ${response.model}`);
			console.log(`Tokens: ${response.tokens}`);
			console.log(`Duration: ${response.duration}ms`);
		})
		.catch((error) => {
			console.error('Error:', error.message);
			process.exit(1);
		});
}
