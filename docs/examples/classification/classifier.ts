import OpenAI from 'openai';

const client = new OpenAI({
	apiKey: process.env.OPENAI_API_KEY,
});

export type Sentiment = 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL';

export interface ClassificationResponse {
	label: Sentiment;
	confidence: number;
	model: string;
	tokens: number;
	duration: number;
}

/**
 * Classify text sentiment using OpenAI
 *
 * @param text - Text to classify
 * @returns Classification with confidence score
 */
export async function classifySentiment(text: string): Promise<ClassificationResponse> {
	const startTime = Date.now();

	const completion = await client.chat.completions.create({
		model: 'gpt-5-mini',
		messages: [
			{
				role: 'system',
				content: `You are a sentiment classifier. Analyze the text and respond with ONLY one word: POSITIVE, NEGATIVE, or NEUTRAL.

Rules:
- POSITIVE: Clearly positive sentiment, enthusiasm, satisfaction
- NEGATIVE: Clearly negative sentiment, dissatisfaction, criticism
- NEUTRAL: Factual, balanced, or mixed sentiment

Respond with only the classification word, nothing else.`,
			},
			{
				role: 'user',
				content: text,
			},
		],
		temperature: 0.1,
		max_tokens: 10,
	});

	const label = (completion.choices[0].message.content?.trim().toUpperCase() ||
		'NEUTRAL') as Sentiment;

	// Simple confidence based on prompt (in real system, use logprobs)
	const confidence = 0.9;

	const tokens = completion.usage?.total_tokens || 0;
	const duration = Date.now() - startTime;

	return {
		label,
		confidence,
		model: 'gpt-5-mini',
		tokens,
		duration,
	};
}

// For testing directly
if (import.meta.url === `file://${process.argv[1]}`) {
	const testText = process.argv[2] || 'This product is amazing! Best purchase ever!';

	console.log(`Text: ${testText}`);

	classifySentiment(testText)
		.then((response) => {
			console.log(`Label: ${response.label}`);
			console.log(`Confidence: ${response.confidence}`);
			console.log(`Tokens: ${response.tokens}`);
		})
		.catch((error) => {
			console.error('Error:', error.message);
			process.exit(1);
		});
}
