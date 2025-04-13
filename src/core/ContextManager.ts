import { IContextManager } from "./interfaces/IContextManager";
import { IEntityManager } from "./interfaces/IEntityManager";
import { Context } from "./models/Context";
import { Setting } from "./models/Setting";
import { Campaign } from "./models/Campaign";
import { Storyline } from "./models/Storyline";
import { Character } from "./models/Character";
import { Location } from "./models/Location";
import { Faction } from "./models/Faction";
import { ChatData } from "./interfaces/ICoreManager";

import { ILogger } from "../utils/interfaces/ILogger";
import { IFileStore } from "../utils/interfaces/IFileStore";

import { ITextGenerationClient } from "../generation/clients/interfaces/ITextGenerationClient";
import { IImageGenerationClient } from "../generation/clients/interfaces/IImageGenerationClient";
import { sendChatMessage } from "../utils/utils";
import { ITool } from "../tools/interfaces/ITool";
import { SceneViewerTool } from "../tools/SceneViewerTool";
import { CreateEncounterTool } from "../tools/CreateEncounterTool";

import { ICommand } from "../commands/interfaces/ICommand";
import { ChatCommand } from "../commands/ChatCommand";
import { SceneViewCommand } from "../commands/SceneViewCommand";
import { EncounterCommand } from "../commands/EncounterCommand";

class ContextManager implements IContextManager {

    public chatHistory: string[] = []; // Store the chat history
    public textGenerationClient: ITextGenerationClient;
    public imageGenerationClient: IImageGenerationClient;   
    public fileStore: IFileStore;
    public logger: ILogger;
    public tools: ITool[] = []; // Store all available tools

    private entityManager: IEntityManager;

    private loadedCampaign: Campaign | null = null; // Store the loaded campaign
    private loadedSetting: Setting | null = null; // Store the loaded setting
    private currentStoryline: Storyline | null = null; // Store the current storyline
    private commands: {name: string, command: ICommand}[] = []; // Store the commands

    constructor(
        textGenerationClient: ITextGenerationClient,
        imageGenerationClient: IImageGenerationClient,
        fileStore: IFileStore,
        entityManager: IEntityManager,
        logger: ILogger,
        tools: ITool[] // Accept tools as a parameter
    ) {
        this.textGenerationClient = textGenerationClient;
        this.imageGenerationClient = imageGenerationClient;
        this.fileStore = fileStore;
        this.logger = logger;
        this.entityManager = entityManager;
        this.tools = tools; // Initialize tools

        this.commands = [
            {name: "/aidm", command: new ChatCommand()},
            {name: "/aishow", command: new SceneViewCommand()},
            {name: "/aiencounter", command: new EncounterCommand()},
        ]
    }

    async loadContext(setting: Setting, campaign: Campaign): Promise<Context | null> {
        // Implement the logic to load the context based on settingName and campaignName
        // For now, returning null as a placeholder
        this.loadedSetting = setting;
        this.loadedCampaign = campaign;

        // Get the current storyline from the campaign
        const storylineName: string = campaign.milestones[0].name;
        this.currentStoryline = await this.fileStore.getStoryline(
            setting.name,
            campaign.name,
            storylineName
        )

        return null;
    }

    async startSession(): Promise<void> {
        if (!this.loadedSetting || !this.loadedCampaign) {
            this.logger.error("No loaded setting or campaign to start.");
            return;
        }

        const prompt: string = await this.getInitialPrompt();

        const response: string = await this.textGenerationClient.generateText(
            prompt
        );
        this.chatHistory.push(prompt); // Add initial prompt to chat history
        this.chatHistory.push(response); // Add AI response to chat history
        sendChatMessage(response);

        this.logger.info(`Started session: ${this.loadedCampaign.name}`);
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

    // Get the initial prompt for the AI DM
    async getInitialPrompt(): Promise<string> {
        if (!this.loadedSetting || !this.loadedCampaign) {
            this.logger.error("No loaded setting or campaign to generate prompt.");
            throw new Error("No loaded setting or campaign to generate prompt.");
        }

        const characters: Character[] = await this.entityManager.getCharacters(this.loadedSetting, this.loadedCampaign);
        const locations: Location[] = await this.entityManager.getLocations(this.loadedSetting, this.loadedCampaign);
        const factions: Faction[] = await this.entityManager.getFactions(this.loadedSetting, this.loadedCampaign);

        return `
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

        The game mechanics are from the 5th edition of Dungeons and Dragons (D&D 5e).
        You will use the rules and mechanics of D&D 5e to create a fair and balanced game for the players.
        You can ask the players to roll dice to resolve certain actions and events.
        Make sure to ask for roles when appropriate, and provide the players with the results of their rolls.
        The player will reply with the results of the dice rolls and any other relevant information.
        Use the results of the dice rolls to determine the outcome of actions and events in the game.
        These are the checks that can be rolled in the game:
        
        Strength
        - Athletics: Measures prowess in activities requiring physical effort, such as climbing, swimming, and jumping. For example, attempting to scale a cliff, swim across a river, or leap over a chasm would necessitate an Athletics check.

        Dexterity
        - Acrobatics: Assesses balance and agility. This check is used when attempting tasks like walking a tightrope, performing flips, or staying upright on shifting terrain.
        - Sleight of Hand: Pertains to manual dexterity, often for tasks like pickpocketing or concealing objects. For instance, slipping something into your pocket without notice requires a Sleight of Hand check.
        - Stealth: Determines the ability to move silently and hide from detection. Sneaking past guards or hiding from enemies involves a Stealth check.

        Intelligence
        - Arcana: Reflects knowledge of magical lore, including spells, symbols, and magical traditions. Identifying a spell being cast or recalling information about a legendary wizard would require an Arcana check.
        - History: Measures knowledge of past events, significant people, ancient kingdoms, and historical lore. Remembering details about a historic battle or ancient civilization involves a History check.
        - Investigation: Used to deduce information from clues, make inferences, and solve puzzles. Examining a crime scene for clues or determining the cause of a malfunctioning trap requires an Investigation check.
        - Nature: Assesses understanding of the natural world, including flora, fauna, weather, and natural cycles. Identifying a plant species or predicting the weather involves a Nature check.
        - Religion: Reflects knowledge of deities, religious rituals, and holy symbols. Recognizing a religious ceremony or recalling the tenets of a particular faith requires a Religion check.

        Wisdom
        - Animal Handling: Determines the ability to calm, control, or train animals. Soothing a spooked horse or teaching a dog a trick involves an Animal Handling check.
        - Insight: Measures the ability to read people and situations, discerning true intentions or detecting lies. Sensing if someone is being deceitful or understanding a creature's mood requires an Insight check.
        - Medicine: Pertains to the ability to diagnose illnesses, stabilize dying companions, and understand medical procedures. Stabilizing a wounded ally or identifying a disease involves a Medicine check.
        - Perception: Reflects the ability to notice subtle details or detect hidden things. Spotting a hidden door or hearing distant footsteps requires a Perception check.
        - Survival: Measures proficiency in outdoor skills like tracking, hunting, and navigating. Following tracks in the wilderness or finding shelter involves a Survival check.

        Charisma
        - Deception: Assesses the ability to convincingly hide the truth, whether through lies or misdirection. Bluffing your way past a guard or conning a merchant requires a Deception check.
        - Intimidation: Determines the ability to influence others through threats or forceful presence. Coercing someone to act through threats involves an Intimidation check.
        - Performance: Measures the ability to entertain through various forms of art, such as music, dance, or storytelling. Playing an instrument in a tavern or delivering a captivating speech requires a Performance check.
        - Persuasion: Reflects the ability to influence others through tact, social graces, or good nature. Convincing a noble to support your cause or negotiating a deal involves a Persuasion check.

        If the situation arises where any of these checks make sense, then make sure you ask for the roll.

        Keep the campaign interesting and engaging for the players, and keep them on their toes.
        You can add random events and encounters to keep the game interesting.
        You can also add plot twists and surprises to keep the players engaged.
        It's good to create challenges and obstacles for the players to overcome, but make sure to give them opportunities to succeed.

        I will provide you with the setting, campaign, and the storyline to get started.

        This is the setting for the game:
        ${JSON.stringify(this.loadedSetting, null, 2)}

        This is the campaign for the game:
        ${JSON.stringify(this.loadedCampaign, null, 2)}

        These are all the characters for the game:
        ${JSON.stringify(characters, null, 2)}

        These are all the locations for the game:
        ${JSON.stringify(locations, null, 2)}

        These are all the factions for the game:
        ${JSON.stringify(factions, null, 2)}

        This is the current storyline for the game:
        ${JSON.stringify(this.currentStoryline, null, 2)}

        Start off by describing the setting and the current situation in the game world.
        Include any important characters, locations, and events that are relevant to the players.
        Make sure to set the tone and atmosphere for the game, and provide hooks for the players to engage with the story.
        Don't make the intro too generic, the players need to know where they are and who they are talking to (if anyone).
        If there are any characters present, it's ok to add dialogue to the intro.
        The players need to know what they can do and what is happening around them.

        Only respond with the narrative and do not include any system messages or instructions.

        Don't abruptly end the story, always let the players take actions and make decisions.
        It is possible for players to die in the game, but make sure to give them opportunities to succeed and survive.
        If a player dies, make sure to describe the situation and the consequences of their actions.
        As long as there are some players, the story continues.

        It is possible for combat encounters to start.
        A combat encounter will start if the scenario the players are in warrants it.
        If a combat encounter starts, make sure to say 'Roll Initiative!'
        `;
    }

    getMessagePrompt(message: string): string {
        return `
        ${message}
        `;
    }

}

export { ContextManager };