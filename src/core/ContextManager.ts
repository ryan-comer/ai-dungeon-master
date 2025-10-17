import { IContextManager } from "./interfaces/IContextManager";
import { IEntityManager } from "./interfaces/IEntityManager";

import { Context } from "./models/Context";
import { Setting } from "./models/Setting";
import { Campaign } from "./models/Campaign";
import { Character } from "./models/Character";
import { Location } from "./models/Location";
import { Faction } from "./models/Faction";
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

        const characters: Character[] = await this.entityManager.getCharacters(this.loadedSetting, this.loadedCampaign);
        const locations: Location[] = await this.entityManager.getLocations(this.loadedSetting, this.loadedCampaign);
        const factions: Faction[] = await this.entityManager.getFactions(this.loadedSetting, this.loadedCampaign);
        const players: Player[] = await this.getPlayers();
        const aiPlayers = this.currentSession?.players.filter(p => p.isAIControlled).map(p => p.name) || [];

        // Compose the original base prompt
        const basePrompt = `
        You are a text-based AI Dungeon Master (DM) for a tabletop role-playing game (RPG).
        You will provide a narrative and respond to player actions in a collaborative storytelling experience.
        Your goal is to create an engaging and immersive story for the players.
        You will use the context of the game, including the setting, characters, and events, to guide the narrative.
        You will also respond to player actions and decisions, adapting the story as needed.
        You will provide descriptions, dialogue, and challenges for the players to overcome.
        You will also keep track of the game world, including locations, items, and NPCs.
        You will use your creativity and imagination to create a unique and exciting story for the players.
        You will also be able to generate random events and encounters to keep the game interesting.
        You will use your knowledge of RPG mechanics and storytelling techniques to create a balanced and enjoyable experience for the players.

        The game mechanics are available to you through tools that you can call. Make sure to call the tools whenever you need the information or functionality they provide.
        You will use the rules and mechanics to create a fair and balanced game for the players.
        Do not assume mechanics. If you need to know something about the mechanics, call the appropriate tool to get the information.

        You can ask the players to roll dice to resolve certain actions and events.
        Make sure to ask for roles when appropriate, and provide the players with the results of their rolls.
        The player will reply with the results of the dice rolls and any other relevant information.
        Use the results of the dice rolls to determine the outcome of actions and events in the game.
        If the situation arises where any of these checks make sense, then make sure you ask for the roll.

        Keep the campaign interesting and engaging for the players, and keep them on their toes.
        You can add random events and encounters to keep the game interesting.
        You can also add plot twists and surprises to keep the players engaged.
        It's good to create challenges and obstacles for the players to overcome, but make sure to give them opportunities to succeed.

        When replying to the players, be as concise as possible.
        It's okay to add a lot of detail when describing a scene, but not all responses need to be long.

        I will provide you with the setting, campaign, and the storyline to get started.

        This is the setting for the game:
        ${JSON.stringify(this.loadedSetting, null, 2)}

        This is the campaign for the game:
        ${JSON.stringify((() => {
            const { progress, ...campaignWithoutProgress } = this.loadedCampaign;
            return campaignWithoutProgress;
        })(), null, 2)}

        These are all the characters for the game:
        ${JSON.stringify(characters, null, 2)}

        These are all the locations for the game:
        ${JSON.stringify(locations, null, 2)}

        These are all the factions for the game:
        ${JSON.stringify(factions, null, 2)}

        These are the players in the game:
        ${JSON.stringify(players, null, 2)}
        
        These players are AI-controlled and should speak for themselves when appropriate:
        ${JSON.stringify(aiPlayers, null, 2)}

        Do not have any player characters speak for themselves unless they are marked as AI-controlled,
        Only the AI-controlled players can speak for themselves.

        Don't end the the back-and-forth dialogue until it's ready for the players to respond.
        By players I mean the non-AI controlled players. I mean the real players.
        If the AI players respond, then keep the dialogue going until it's the real players' turn.

        Start off by describing the setting and the current situation in the game world.
        Include any important characters, locations, and events that are relevant to the players.
        Make sure to set the tone and atmosphere for the game, and provide hooks for the players to engage with the story.
        Don't make the intro too generic, the players need to know where they are and who they are talking to (if anyone).
        If there are any characters present, it's ok to add dialogue to the intro.
        The players need to know what they can do and what is happening around them.

        Only respond with the narrative and do not include any system messages or instructions.
        
        IMPORTANT: Output should be a valid JSON array of objects, each with "speaker" and "message" fields. Do NOT include any text outside the JSON array.

        Remember to return an array of dialogue.
        The DM dialogue should be them describing the world.
        The character dialogue should be that character talking.
        Don't have th DM dialogue include any characters talking. If the character needs to say something, then it should be in it's own dialogue

        Don't abruptly end the story, always let the players take actions and make decisions.
        It is possible for players to die in the game, but make sure to give them opportunities to succeed and survive.
        If a player dies, make sure to describe the situation and the consequences of their actions.
        As long as there are some players, the story continues.

        It is possible for combat encounters to start.
        A combat encounter will start if the scenario the players are in warrants it.
        If a combat encounter starts, make sure to say 'Roll Initiative!'
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