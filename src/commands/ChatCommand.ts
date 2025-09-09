import { ICommand } from "./interfaces/ICommand";
import { IContextManager } from "../core/interfaces/IContextManager";
import { ChatData } from "../core/interfaces/ICoreManager";
import { sendChatMessage } from "../utils/utils";
import { ChatMessage as DMChatMessage } from "../core/models/ChatMessage";
import { MessageSchema } from "../core/models/google/MessageSchema";
import { ITool } from "../tools/interfaces/ITool";
import { GoogleClient } from "../generation/clients/GoogleClient";
import { RAGManager } from "../core/RAGManager";

class ChatCommand implements ICommand {
    name: string;
    description: string;
    private ragManager: RAGManager | null = null;

    constructor() {
        this.name = "ChatCommand";
        this.description = "Command for the AI DM to process a user message and generate a response with RAG support.";
    }

    async execute(message: string, chatData: ChatData, contextManager: IContextManager): Promise<any> {
        // Parse the message to extract the user input from /aidm
        const commandPrefix: string = "/aidm";
        message = message.slice(commandPrefix.length).trim(); // Remove the command prefix
        if (message.length === 0) {
            contextManager.logger.warn("No message provided after command prefix.");
            return;
        }

        const userSpeaker = chatData.speaker.alias;
        const newMessageText = message;
        // Create structured user message and add to session
        const userMessage: DMChatMessage = { speaker: userSpeaker, message: newMessageText };
        sendChatMessage(`${userSpeaker}: ${newMessageText}`);
        await contextManager.addChatMessage(userMessage);

        // Check if we can use RAG
        const setting = contextManager.getCurrentSetting();
        const campaign = contextManager.getCurrentCampaign();
        const canUseRAG = setting && campaign && 
                         contextManager.textGenerationClient instanceof GoogleClient;

        if (canUseRAG && !this.ragManager) {
            // Initialize RAG manager if not already done
            this.ragManager = new RAGManager(
                contextManager.textGenerationClient as GoogleClient,
                contextManager.fileStore,
                contextManager.logger
            );
        }

        // Generate structured AI messages with JSON schema
        // Prepare simple chat history array
        const dmHistory = await contextManager.getChatMessages();
        const history = dmHistory.map(m => `${m.speaker}: ${m.message}`);
        let aiMessages: DMChatMessage[] = [];

        try {
            if (canUseRAG && this.ragManager && setting && campaign) {
                // Use RAG-enhanced generation
                contextManager.logger.info("Using RAG-enhanced generation for user message");
                
                // Create a comprehensive prompt that includes the user message and context
                const ragPrompt = this.buildRAGPrompt(newMessageText, history);
                
                const ragResponse = await this.ragManager.generateWithRAG(
                    ragPrompt,
                    setting.name,
                    campaign.name,
                    history
                );

                // Convert the RAG response to structured messages
                if (ragResponse.finalResponse) {
                    // Parse the final response as structured messages or create a narrator message
                    try {
                        // Try to parse as structured output first
                        aiMessages = await contextManager.textGenerationClient.generateText<DMChatMessage[]>(
                            `Convert this response to structured chat messages:\n${ragResponse.finalResponse}`,
                            [],
                            undefined,
                            undefined,
                            MessageSchema
                        );
                    } catch (error) {
                        // Fallback: create a single narrator message
                        contextManager.logger.warn("Failed to structure RAG response, using fallback");
                        aiMessages = [{
                            speaker: "Narrator",
                            message: ragResponse.finalResponse
                        }];
                    }
                    
                    // Log search results if any
                    if (ragResponse.searchResults && ragResponse.searchResults.length > 0) {
                        contextManager.logger.info(
                            `RAG search found ${ragResponse.searchResults.length} relevant sections from manuals`
                        );
                    }
                }
            } else {
                // Standard generation without RAG
                contextManager.logger.info("Using standard generation (no RAG available)");
                aiMessages = await contextManager.textGenerationClient.generateText<DMChatMessage[]>(
                    newMessageText,
                    history,
                    undefined,
                    undefined,
                    MessageSchema
                );
            }
        } catch (error) {
            contextManager.logger.error("Error generating AI messages:", error);
            // Fallback response
            aiMessages = [{
                speaker: "Narrator",
                message: "I apologize, but I'm having trouble processing that request right now. Please try again."
            }];
        }

        // Append and deliver each AI message
        for (const msg of aiMessages) {
            sendChatMessage(`${msg.speaker}: ${msg.message}`);
            await contextManager.addChatMessage(msg);
            // Send to TTS
            if (contextManager.textToSpeechClient) {
                try {
                    await contextManager.textToSpeechClient.speak(msg.message);
                } catch (error) {
                    contextManager.logger.error("Error speaking text:", error);
                }
            }
        }

        // Check if any tools should be fired (existing tool logic)
        if (contextManager.tools.length > 0) {
            const toolsToFire = await this.checkForTools(contextManager);
            for (const tool of toolsToFire || []) {
                contextManager.logger.info(`Firing tool: ${tool.name}`);
                await tool.run(contextManager); // Run the tool
            }
        }
    }

    /**
     * Build a comprehensive prompt for RAG that includes context about the game state
     */
    private buildRAGPrompt(userMessage: string, chatHistory: string[]): string {
        const recentHistory = chatHistory.slice(-10).join('\n'); // Last 10 messages for context
        
        return `
You are an AI Dungeon Master running a tabletop RPG game. A player has just sent you this message:

"${userMessage}"

Recent conversation context:
${recentHistory}

Please respond as the Dungeon Master would. If you need specific information about rules, mechanics, spells, equipment, monsters, or other game content to provide an accurate response, you should search the relevant manuals.

Use search_player_manual for information that players would typically know (character creation, spells, equipment, basic rules).
Use search_gm_manual for information that is typically for the GM (monsters, NPCs, adventure content, advanced rules).

Provide a complete and engaging response that moves the story forward and follows the established rules and lore of the game.
`;
    }

    help(): string {
        return `Usage: /aidm {MESSAGE}`;
    }

    async checkForTools(contextManager: IContextManager): Promise<ITool[] | null> {
        const prompt: string = `
        I am going to give you a list of tools
        Each tool has a name an a description
        The description explains when the tools should be fired
        I want you to tell me which tools should be fired based on the current context of our conversation

        Here is the list of tools:
        [
            ${contextManager.tools.map(tool => JSON.stringify({
                name: tool.name,
                description: tool.description
            }))}
        ]

        I want you to respond with the names of the tool that should be fired
        Only respond with the names of the tool
        If multiple tools should be fired, respond with the names of all the tools separated by commas
        Example: "Tool1, Tool2, Tool3"
        It's possible that no tool should be fired, in that case respond with 'None'
        Do not respond with anything else
        `

        // Use structured chat messages for tool prompt context
        const dmMessages = await contextManager.getChatMessages();
        const chatHistory = dmMessages.map(m => `${m.speaker}: ${m.message}`);
        const response: string = await contextManager.textGenerationClient.generateText(prompt, chatHistory);

        if (response.trim() === "None") {
            return null; // No tool should be fired
        }

        const toolNames: string[] = response.split(",").map(name => name.trim());
        const toolsToFire: ITool[] = [];
        for (const toolName of toolNames) {
            const tool: ITool | undefined = contextManager.tools.find(t => t.name === toolName.trim());
            if (tool) {
                toolsToFire.push(tool); // Add the tool to the list of tools to fire
            } else {
                contextManager.logger.warn(`Tool not found: ${toolName}`);
            }
        }

        return toolsToFire; // Return the list of tools to fire
    }
}

export { ChatCommand };