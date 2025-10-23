import { IContextManager } from "./interfaces/IContextManager";
import { IEntityManager } from "./interfaces/IEntityManager";

import { Context } from "./models/Context";
import { Setting } from "./models/Setting";
import { Campaign } from "./models/Campaign";
import { ChatData } from "./interfaces/ICoreManager";

import { ILogger } from "../utils/interfaces/ILogger";
import { IFileStore } from "../utils/interfaces/IFileStore";

import { ITextGenerationClient } from "../generation/clients/interfaces/ITextGenerationClient";
import { IImageGenerationClient } from "../generation/clients/interfaces/IImageGenerationClient";
import { ITextToSpeechClient } from "../generation/clients/interfaces/ITextToSpeechClient";
import { sendChatMessage } from "../utils/utils";
import { MessageSchema } from "./models/google/MessageSchema";
import { ITool } from "../tools/interfaces/ITool";

import { ICommand } from "../commands/interfaces/ICommand";
import { ChatCommand } from "../commands/ChatCommand";
import { SceneViewCommand } from "../commands/SceneViewCommand";
import { EncounterCommand } from "../commands/EncounterCommand";
import { Player } from "./models/Player";
import { Session } from "./models/Session";
import { SessionPlayer } from "./models/SessionPlayer";
import { ChatMessage as DMChatMessage } from "./models/ChatMessage";

import { stripInvalidFilenameChars } from "../utils/utils";
import { cons } from "fp-ts/lib/ReadonlyNonEmptyArray";

import { RAGManager } from "./RAGManager";

class ContextManager implements IContextManager {

    public textGenerationClient: ITextGenerationClient;
    public imageGenerationClient: IImageGenerationClient;   
    public textToSpeechClient: ITextToSpeechClient;
    public fileStore: IFileStore;
    public logger: ILogger;
    public tools: ITool[] = []; // Store all available tools
    public ragManager?: RAGManager; // Optional RAG manager

    private entityManager: IEntityManager;

    private loadedCampaign: Campaign | null = null; // Store the loaded campaign
    private loadedSetting: Setting | null = null; // Store the loaded setting
    private commands: {name: string, command: ICommand}[] = []; // Store the commands

    private currentSession: Session | null = null; // Store the current session
    
    constructor(
        textGenerationClient: ITextGenerationClient,
        imageGenerationClient: IImageGenerationClient,
        textToSpeechClient: ITextToSpeechClient,
        fileStore: IFileStore,
        entityManager: IEntityManager,
        logger: ILogger,
        tools: ITool[], // Accept tools as a parameter
        ragManager?: RAGManager // Optionally accept a RAG manager
    ) {
        this.textGenerationClient = textGenerationClient;
        this.imageGenerationClient = imageGenerationClient;
        this.textToSpeechClient = textToSpeechClient;
        this.fileStore = fileStore;
        this.logger = logger;
        this.entityManager = entityManager;
        this.tools = tools; // Initialize tools
        this.ragManager = ragManager;

        this.commands = [
            {name: "/aidm", command: new ChatCommand()},
            {name: "/aishow", command: new SceneViewCommand()},
            {name: "/aiencounter", command: new EncounterCommand()},
        ]
    }



    // Get the list of players in the campaign
    async getPlayers (): Promise<Player[]> {
    // Convert actors collection to array, guard against undefined
    const actorsCollection = game.actors;
    const allActors: any[] = actorsCollection ? Array.from(actorsCollection.values()) : [];
        const playersFolder = game.folders?.find(f => f.name === 'Players' && f.type === 'Actor');
        let playerActors: any[] = [];
        if (playersFolder) {
            playerActors = allActors.filter((actor: any) => actor.folder?.id === playersFolder.id);
        } else {
            console.warn("Players folder not found, falling back to actors with player owner");
            playerActors = allActors.filter((actor: any) => actor.hasPlayerOwner);
        }

        const players: Player[] = playerActors.map((actor: any) => {
            return {
                name: actor.name,
                level: actor.items.filter((i:any) => i.type == "class").reduce((acc: number, i: any) => acc + i.system.levels, 0),
                attributes: {
                    strength: actor.system.abilities.str.value,
                    dexterity: actor.system.abilities.dex.value,
                    constitution: actor.system.abilities.con.value,
                    intelligence: actor.system.abilities.int.value,
                    wisdom: actor.system.abilities.wis.value,
                    charisma: actor.system.abilities.cha.value
                },
                details: {
                    biography: actor.system.details.biography.value,
                    ideals: actor.system.details.ideal,
                    bonds: actor.system.details.bond,
                    flaws: actor.system.details.flaw,
                    personalityTraits: actor.system.details.trait,
                    appearance: actor.system.details.appearance
                },
                ac: actor.system.attributes.ac.value,
                hp: actor.system.attributes.hp.max,
            };
        });

        return players;
    }



    async loadContext(setting: Setting, campaign: Campaign, session: Session): Promise<Context | null> {
        // Implement the logic to load the context based on settingName and campaignName
        this.loadedSetting = setting;
        this.loadedCampaign = campaign;

        // Get the initial prompt (always generate fresh to reflect current context like players)
        const prompt: string = await this.getInitialPrompt();
        
        // Check if this is a new session or we need to update the initial prompt
        if (session.chatMessages.length === 0) {
            console.log("Adding initial system prompt to new session...");
            
            // Always add the base prompt first as context
            session.chatMessages.push({ speaker: 'System', message: prompt });
            
            let aiMessages: DMChatMessage[];
            
            // If RAG is available, use it with a two-pass approach
            if (this.ragManager) {
                const ragResult = await this.ragManager.generateWithRAG(prompt, this.loadedSetting.name, this.loadedCampaign.name);
                
                // Second pass: convert RAG response to structured messages
                try {
                    aiMessages = await this.textGenerationClient.generateText<DMChatMessage[]>(
                        `Convert this response to structured chat messages with appropriate speakers:\n${ragResult.finalResponse}`,
                        [],
                        {model: 'gemini-2.5-flash-lite'},
                        undefined,
                        MessageSchema
                    );
                } catch (error) {
                    // Fallback: create a single narrator message
                    this.logger.warn("Failed to structure RAG response, using fallback");
                    aiMessages = [{
                        speaker: "Narrator",
                        message: ragResult.finalResponse
                    }];
                }
            } else {
                // Fallback: use regular text generation with schema
                aiMessages = await this.textGenerationClient.generateText<DMChatMessage[]>(
                    prompt,
                    undefined,
                    undefined,
                    undefined,
                    MessageSchema
                );
            }
            
            // Append each AI message and deliver
            for (const msg of aiMessages) {
                session.chatMessages.push(msg);
                sendChatMessage(`${msg.speaker}: ${msg.message}`);
                if (this.textToSpeechClient) {
                    try {
                        await this.textToSpeechClient.speak(msg.message);
                    } catch (error) {
                        this.logger.error("Error speaking text:", error);
                    }
                }
            }
            this.logger.info(`Started session: ${this.loadedCampaign.name}`);
        } else {
            // Update the initial system prompt (first message) to reflect current context
            console.log("Updating initial system prompt for existing session...");
            if (session.chatMessages.length > 0 && session.chatMessages[0].speaker === 'System') {
                session.chatMessages[0].message = prompt;
            } else {
                // If first message isn't System, insert the system prompt at the beginning
                session.chatMessages.unshift({ speaker: 'System', message: prompt });
            }
        }

        await this.fileStore.saveSession(this.loadedSetting.name, this.loadedCampaign.name, session.name, session); // Save the session with updated chat messages

        return null;
    }

    async createSession(settingName: string, campaignName: string, sessionName: string): Promise<Session> {
        const settingNameStripped: string = stripInvalidFilenameChars(settingName);
        const campaignNameStripped: string = stripInvalidFilenameChars(campaignName);
        const sessionNameStripped: string = stripInvalidFilenameChars(sessionName);

        const session: Session = new Session(sessionName);

        logger.info("Saving session...");
        await this.fileStore.saveSession(settingNameStripped, campaignNameStripped, sessionNameStripped, session);

        return session;
    }

    async startSession(setting: Setting, campaign: Campaign, sessionName: string, players?: SessionPlayer[]): Promise<void> {

        const session: Session | null = await this.getSession(setting.name, campaign.name, sessionName);
        if (!session) {
            this.logger.error(`Session ${sessionName} not found in campaign ${campaign.name}`);
            return;
        }
        this.currentSession = session; // Set the current session

        // Initialize session players: use provided flags or default to human-controlled
        if (players && players.length > 0) {
            this.currentSession.players = players;
        } else if (!this.currentSession.players || this.currentSession.players.length === 0) {
            try {
                const playerList = await this.getPlayers();
                this.currentSession.players = playerList.map(p => ({ name: p.name, isAIControlled: false }));
            } catch (err) {
                this.logger.error('Failed to initialize session players', err);
            }
        }

        // Load the context for the session
        await this.loadContext(setting, campaign, this.currentSession);
        console.log("Loaded context:", this.currentSession);

        // Update the session indices
        if (this.currentSession.sessionIndices.length > 0 && this.currentSession.sessionIndices[this.currentSession.sessionIndices.length - 1] !== this.currentSession.chatMessages.length - 1) {
            console.log("Adding last index to session indices...");
            this.currentSession.sessionIndices.push(this.currentSession.chatMessages.length - 1); // Add the last index
        }

        const lastSessionSummary: string = await this.getSessionSummary(this.currentSession);
        if (lastSessionSummary) {
            sendChatMessage(lastSessionSummary);

            // Send to TTS
            if (this.textToSpeechClient) {
                try {
                    await this.textToSpeechClient.speak(lastSessionSummary);
                } catch (error) {
                    this.logger.error("Error speaking text:", error);
                }
            }
        }

        if (this.currentSession.sessionIndices.length === 0) {
            console.log("Adding first index to session indices...");
            this.currentSession.sessionIndices.push(1); // Add the first index
        }
        console.log("Context loaded:", this.currentSession);
        await this.fileStore.saveSession(setting.name, campaign.name, this.currentSession.name, session); // Save the session with updated chat history
    }

    async getSessions(settingName: string, campaignName: string): Promise<Session[]> {
        const settingNameStripped: string = stripInvalidFilenameChars(settingName);
        const campaignNameStripped: string = stripInvalidFilenameChars(campaignName);

        const sessions: Session[] = await this.fileStore.getSessions(settingNameStripped, campaignNameStripped);
        return sessions;
    }

    async getSession(settingName: string, campaignName: string, sessionName: string): Promise<Session | null> {
        const settingNameStripped: string = stripInvalidFilenameChars(settingName);
        const campaignNameStripped: string = stripInvalidFilenameChars(campaignName);
        const sessionNameStripped: string = stripInvalidFilenameChars(sessionName);

        const session: Session | null = await this.fileStore.getSession(settingNameStripped, campaignNameStripped, sessionNameStripped);
        return session;
    }

    // User sent a message to the AI DM
    async sendUserMessage(message: string, chatData: ChatData): Promise<void> {
        //sendChatMessage(message); // Send the user message to the chat
        const command: ICommand | undefined = this.commands.find(cmd => cmd.name === message.split(" ")[0])?.command;
        if (command) {
            await command.execute(message, chatData, this); // Execute the command
            return;
        }
    }
    // Add a structured chat message to current session and save
    async addChatMessage(message: DMChatMessage): Promise<void> {
        if (!this.currentSession || !this.loadedSetting || !this.loadedCampaign) {
            this.logger.error("No current session to add chat message.");
            return;
        }
        this.currentSession.chatMessages.push(message);
        await this.fileStore.saveSession(
            this.loadedSetting.name,
            this.loadedCampaign.name,
            this.currentSession.name,
            this.currentSession
        );
    }

    // Get structured chat messages from current session
    async getChatMessages(): Promise<DMChatMessage[]> {
        if (!this.currentSession) {
            this.logger.error("No current session to get chat messages.");
            return [];
        }
        return this.currentSession.chatMessages;
    }



    async getSessionSummary(session: Session): Promise<string> {
        // Check if we need to summarize what happened in the last session
        if (session.sessionIndices.length > 0) {
            const len = session.sessionIndices.length;
            const startIndex = session.sessionIndices[len - 2];
            const endIndex = session.sessionIndices[len - 1];
            // Prepare text from structured chat messages
            const segment = session.chatMessages.slice(startIndex, endIndex);
            const sessionText = segment.map(msg => `${msg.speaker}: ${msg.message}`).join("\n");
            const summaryPrompt = `
            The following is the chat history for a tabletop RPG session.
            Summarize what happened in the last session and provide a brief overview of the events, characters, and locations involved.
            Only reply with the summary and do not include any system messages or instructions.
            The chat history is as follows:
            ${sessionText}
            `;
            const summary: string = await this.textGenerationClient.generateText(summaryPrompt);
            return summary;
        }
        return "";
    }

    // Get the initial prompt for the AI DM, using RAG if available
    async getInitialPrompt(): Promise<string> {
        if (!this.loadedSetting || !this.loadedCampaign) {
            this.logger.error("No loaded setting or campaign to generate prompt.");
            throw new Error("No loaded setting or campaign to generate prompt.");
        }

        const players: Player[] = await this.getPlayers();
        const aiPlayers = this.currentSession?.players.filter(p => p.isAIControlled).map(p => p.name) || [];

        // Compose a lean base prompt: no pre-generated entities; invent on the fly consistent with context
        const basePrompt = `
        You are a text-based AI Dungeon Master (DM) for a tabletop RPG. Create an engaging, coherent story by
        improvising NPCs, locations, factions, and plot beats as needed—consistent with the setting and campaign below.

        Use rules and mechanics only via tools when necessary; don't assume mechanics you can't access. Ask players to roll
        when appropriate and use the result they provide. Keep responses concise unless scene-setting benefits from detail.

        SETTING (name, description):
        ${JSON.stringify({ name: this.loadedSetting.name, description: this.loadedSetting.description, prompt: this.loadedSetting.prompt }, null, 2)}

        CAMPAIGN (name, description):
        ${JSON.stringify({ name: this.loadedCampaign.name, description: this.loadedCampaign.description, prompt: this.loadedCampaign.prompt }, null, 2)}

        PLAYERS:
        ${JSON.stringify(players, null, 2)}
        AI_CONTROLLED_PLAYERS:
        ${JSON.stringify(aiPlayers, null, 2)}

        Guidelines:
        - Only AI-controlled players may speak for themselves; do not speak for human-controlled players.
        - Introduce the current scene with clear sense of place, stakes, and immediate options.
        - Invent NPCs/locations/factions on demand; keep them grounded in the setting/campaign tone.
        - If RAG/manual info is available, you may reference those rules/themes, but don't block waiting for it.
        - Let the scene end with space for real players to act unless an AI-controlled player should respond first.

        Output format:
        - Return a JSON array of messages, each object with fields: { "speaker": string, "message": string }.
        - Do not include any text outside the JSON array.
        `;

        // If RAG is available, use it with the full original prompt
        // Note: This method should only be called when RAG is not being used for structured responses
        return basePrompt;
    }

    getMessagePrompt(message: string): string {
        return `
        ${message}
        `;
    }
    // Get players in the current session with control flags
    async getSessionPlayers(): Promise<SessionPlayer[]> {
        if (!this.currentSession) {
            this.logger.error("No current session to get players from.");
            return [];
        }
        return this.currentSession.players;
    }

    // Set control flag for a session player and save session
    async setPlayerControl(playerName: string, isAIControlled: boolean): Promise<void> {
        if (!this.currentSession || !this.loadedSetting || !this.loadedCampaign) {
            this.logger.error("Cannot set player control without an active session.");
            return;
        }
        const player = this.currentSession.players.find(p => p.name === playerName);
        if (!player) {
            this.logger.error(`Player ${playerName} not found in session.`);
            return;
        }
        player.isAIControlled = isAIControlled;
        await this.fileStore.saveSession(
            this.loadedSetting.name,
            this.loadedCampaign.name,
            this.currentSession.name,
            this.currentSession
        );
    }
    /**
     * Set multiple player control flags at once and save session
     */
    async setSessionPlayers(players: SessionPlayer[]): Promise<void> {
        if (!this.currentSession || !this.loadedSetting || !this.loadedCampaign) {
            this.logger.error("Cannot set session players without an active session.");
            return;
        }
        this.currentSession.players = players;
        await this.fileStore.saveSession(
            this.loadedSetting.name,
            this.loadedCampaign.name,
            this.currentSession.name,
            this.currentSession
        );
    }

    /**
     * Get the currently loaded setting
     */
    getCurrentSetting(): Setting | null {
        return this.loadedSetting;
    }

    /**
     * Get the currently loaded campaign
     */
    getCurrentCampaign(): Campaign | null {
        return this.loadedCampaign;
    }

}

export { ContextManager };