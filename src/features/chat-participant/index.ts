export { ChatParticipantFeature } from './ChatParticipantFeature';
export { ICommand } from './ICommand';
export { CommandRegistry } from './CommandRegistry';
export { ChatContext } from './ChatContext';
export { 
	getCodeContext, 
	isAutoModel, 
	listConcreteModels, 
	getValidModel,
	createBasePrompt,
	buildChatMessages,
	sendChatRequest
} from './chat-utils';
