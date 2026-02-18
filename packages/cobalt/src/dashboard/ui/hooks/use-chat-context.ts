import { createContext, useContext } from 'react';

export interface ChatContextValue {
	page: 'runs' | 'run-detail' | 'compare' | 'trends';
	runId?: string;
	compareIds?: string[];
	experiment?: string;
}

const ChatContext = createContext<ChatContextValue>({ page: 'runs' });

export function useChatContext() {
	return useContext(ChatContext);
}

export { ChatContext };
