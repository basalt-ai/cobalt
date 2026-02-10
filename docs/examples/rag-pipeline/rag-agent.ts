import OpenAI from 'openai';

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface Document {
	id: string;
	content: string;
	metadata?: Record<string, any>;
}

export interface RAGResponse {
	answer: string;
	retrievedDocs: Document[];
	model: string;
	tokens: number;
}

/**
 * Simple RAG implementation: retrieve + generate
 */
export async function answerWithRAG(
	query: string,
	knowledgeBase: Document[],
): Promise<RAGResponse> {
	// Step 1: Retrieve relevant documents (simple keyword match)
	const retrievedDocs = retrieve(query, knowledgeBase, 3);

	// Step 2: Generate answer using context
	const context = retrievedDocs.map((d) => d.content).join('\n\n');

	const completion = await client.chat.completions.create({
		model: 'gpt-4o-mini',
		messages: [
			{
				role: 'system',
				content: `You are a helpful assistant. Answer questions using ONLY the provided context. If the context doesn't contain the answer, say "I don't have enough information."`,
			},
			{
				role: 'user',
				content: `Context:\n${context}\n\nQuestion: ${query}\n\nAnswer:`,
			},
		],
		temperature: 0.2,
		max_tokens: 200,
	});

	const answer = completion.choices[0].message.content || '';

	return {
		answer,
		retrievedDocs,
		model: 'gpt-4o-mini',
		tokens: completion.usage?.total_tokens || 0,
	};
}

/**
 * Simple keyword-based retrieval
 */
function retrieve(query: string, docs: Document[], topK: number): Document[] {
	const queryTokens = query.toLowerCase().split(/\s+/);

	// Score documents by keyword overlap
	const scored = docs.map((doc) => {
		const docTokens = doc.content.toLowerCase().split(/\s+/);
		const overlap = queryTokens.filter((t) => docTokens.includes(t)).length;
		return { doc, score: overlap };
	});

	// Return top K
	return scored
		.sort((a, b) => b.score - a.score)
		.slice(0, topK)
		.map((s) => s.doc);
}
