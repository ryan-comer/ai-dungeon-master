import { ICampaignManager } from "./interfaces/ICampaignManager";

import { IEntityManager } from "./interfaces/IEntityManager";

import { IFileStore } from "../utils/interfaces/IFileStore";
import { ILogger } from "../utils/interfaces/ILogger";
import { FoundryPdfChunker } from "../utils/FoundryPdfChunker";

import { ITextGenerationClient } from "../generation/clients/interfaces/ITextGenerationClient";
import { OllamaClient } from "../generation/clients/OllamaClient";
import { OpenAIClient } from "../generation/clients/OpenAIClient";
import { GoogleClient } from "../generation/clients/GoogleClient";
// import RepeatJsonGeneration removed; using structured output instead

import { IImageGenerationClient } from "../generation/clients/interfaces/IImageGenerationClient";
import { ForgeClient } from "../generation/clients/ForgeClient";

import { Campaign } from "./models/Campaign";
import { CampaignSchema } from "./models/google/CampaignSchema";
import { Setting } from "./models/Setting";
import { SettingSchema } from "./models/google/SettingSchema";
import { Storyline } from "./models/Storyline";
import { StorylineSchema } from "./models/google/StorylineSchema";
import { CampaignProgress, CampaignGenerationStage } from "./models/CampaignProgress";

import { isRight } from "fp-ts/lib/Either";
import { Schema, Type } from '@google/genai';

class CampaignManager implements ICampaignManager {

    private fileStore: IFileStore;
    private logger: ILogger;
    private textGenerationClient: ITextGenerationClient;
    private imageGenerationClient: IImageGenerationClient;
    private entityManager: IEntityManager;
    private pdfChunker: FoundryPdfChunker;

    constructor(textGenerationClient: ITextGenerationClient, imageGenerationClient: IImageGenerationClient, iFileStore: IFileStore, entityManager:IEntityManager, logger: ILogger) {
        this.textGenerationClient = textGenerationClient;
        this.imageGenerationClient = imageGenerationClient;
        this.fileStore = iFileStore;
        this.logger = logger;
        this.entityManager = entityManager;
        this.pdfChunker = new FoundryPdfChunker(logger);
    }

    private reconstructProgress(progressData: any): CampaignProgress {
        const progress = new CampaignProgress();
        
        // Copy over the data from the deserialized object
        if (progressData) {
            progress.stage = progressData.stage || CampaignGenerationStage.INITIAL_CREATION;
            progress.completedStages = progressData.completedStages || [];
            progress.currentStageProgress = progressData.currentStageProgress || 0;
            progress.totalStages = progressData.totalStages || 8; // Updated to 8 stages
            progress.storylineProgress = progressData.storylineProgress || [];
            progress.lastUpdated = new Date(progressData.lastUpdated || new Date());
            progress.error = progressData.error;
            progress.pdfManuals = {
                playerManualPath: progressData.pdfManuals?.playerManualPath,
                gmManualPath: progressData.pdfManuals?.gmManualPath,
                processed: progressData.pdfManuals?.processed || false
            };
            progress.analyzedEntities = progressData.analyzedEntities;
            progress.createdStorylines = progressData.createdStorylines;
        }
        
        return progress;
    }

    async createSetting(userPrompt: string): Promise<Setting> {
        const prompt: string = `
            Create a setting for a campaign in a tabletop RPG game. This will be a high-level description of the world, its inhabitants, places, and the general state of things.
            This setting will be used to generate storylines for players to play through.
            Make the setting super interesting and unique, and make sure it has a lot of potential for cool stories and adventures.
            Be as descriptive as possible, and make sure to include all the key elements of the setting. This will be used as the foundation for the campaign.

            ${userPrompt.length > 0 ? `The setting should match the following user prompt: ${userPrompt}` : ""}
        `;

        // Generate structured Setting output
        const settingJson: Setting = await this.textGenerationClient.generateText<Setting>(
            prompt,
            [],
            { model: "gemini-2.5-flash-lite" }, // Use faster model for campaign generation
            undefined,
            SettingSchema
        );
        console.dir(settingJson)
        console.log(typeof(settingJson))

        await this.fileStore.saveSetting(settingJson.name, settingJson);

        return settingJson;
    }

    async createCampaign(settingName: string, userPrompt: string, pdfManuals?: { playerManualFile?: File, gmManualFile?: File }): Promise<Campaign> {
        const settingJson: Setting | null = await this.fileStore.getSetting(settingName);
        if (settingJson == null) {
            throw new Error(`Setting ${settingName} not found`);
        }

        // Create campaign progress tracker
        const progress = new CampaignProgress();
        
        // We'll handle PDF uploads after campaign creation when we have the actual campaign name
        if (pdfManuals?.playerManualFile || pdfManuals?.gmManualFile) {
            progress.pdfManuals.playerManualPath = pdfManuals?.playerManualFile ? 'pending_upload' : undefined;
            progress.pdfManuals.gmManualPath = pdfManuals?.gmManualFile ? 'pending_upload' : undefined;
        }

        // Initialize storyline progress based on milestones (we'll get milestones count after initial creation)
        progress.setStage(CampaignGenerationStage.INITIAL_CREATION, 0);

        let campaignJson: Campaign;

        try {
            // Stage 1: Initial campaign creation
            this.logger.info("Creating initial campaign structure...");
            progress.setStage(CampaignGenerationStage.INITIAL_CREATION, 50);

            const setting: string = JSON.stringify(settingJson, null, 2);
            const prompt: string = `
                Create a campaign using the following setting:

                ${setting}

                ${userPrompt.length > 0 ? `The campaign should match the following user prompt: ${userPrompt}` : ""}

                The campaign will be a high-level description of the story, characters, locations, etc.
                The campaign is a larger storyline that the players will play through, and it will be made up of multiple storylines that the players will play through.
                The campaign should have a clear objective and premise that the players will work towards, and all the objectives should align with the premise and tell a cohesive story.
                The campaign will have milestones that the players will work towards. Each milestone should build on top of one another to tell the larger story of the campaign.
                The milestones will be used to create storylines that the players will play through, and each storyline should build towards the campaign's goals.
                Do not make the campaign generic or open-ended. Make it specific and focused on a clear objective that the players will work towards.
                Be as descriptive as possible, and make sure to include all the key elements of the campaign. This will be used as the foundation for the storylines.
            `;

            // Generate structured Campaign output
            campaignJson = await this.textGenerationClient.generateText<Campaign>(
                prompt,
                [],
                { model: "gemini-2.5-flash-lite" }, // Use faster model for campaign generation
                undefined,
                CampaignSchema
            );
            campaignJson.setting = settingName;
            campaignJson.progress = progress;

            // Initialize storyline progress based on milestones
            campaignJson.milestones.forEach((milestone, index) => {
                progress.updateStorylineProgress(index, milestone.name, false);
            });

            progress.markStageComplete(CampaignGenerationStage.INITIAL_CREATION);
            await this.fileStore.saveCampaign(settingName, campaignJson.name, campaignJson);

            // Process PDFs immediately after campaign creation if they were provided
            if (pdfManuals?.playerManualFile || pdfManuals?.gmManualFile) {
                try {
                    this.logger.info("Processing PDF manuals...");
                    progress.setStage(CampaignGenerationStage.PDF_PROCESSING, 0);

                    let playerManualPath: string | undefined;
                    let gmManualPath: string | undefined;

                    // Handle PDF uploads now that we have the campaign name
                    if (pdfManuals.playerManualFile) {
                        const renamedPlayerFile = new File([pdfManuals.playerManualFile], 'player-manual.pdf', { 
                            type: pdfManuals.playerManualFile.type 
                        });
                        
                        if (typeof FilePicker !== 'undefined') {
                            const destPath = this.fileStore.getCampaignDirectory(settingName, campaignJson.name);
                            const uploadResult = await (FilePicker as any).upload('data', destPath, renamedPlayerFile, {});
                            playerManualPath = uploadResult.path;
                        } else {
                            playerManualPath = `${settingName}/${campaignJson.name}/player-manual.pdf`;
                        }
                    }

                    if (pdfManuals.gmManualFile) {
                        const renamedGmFile = new File([pdfManuals.gmManualFile], 'gm-manual.pdf', { 
                            type: pdfManuals.gmManualFile.type 
                        });
                        
                        if (typeof FilePicker !== 'undefined') {
                            const destPath = this.fileStore.getCampaignDirectory(settingName, campaignJson.name);
                            const uploadResult = await (FilePicker as any).upload('data', destPath, renamedGmFile, {});
                            gmManualPath = uploadResult.path;
                        } else {
                            gmManualPath = `${settingName}/${campaignJson.name}/gm-manual.pdf`;
                        }
                    }

                    // Update progress with actual paths
                    progress.pdfManuals.playerManualPath = playerManualPath;
                    progress.pdfManuals.gmManualPath = gmManualPath;

                    // Process the uploaded PDFs
                    await this.processPdfManuals(settingName, campaignJson.name, playerManualPath, gmManualPath);
                    progress.pdfManuals.processed = true;
                    progress.markStageComplete(CampaignGenerationStage.PDF_PROCESSING);
                    
                    await this.fileStore.saveCampaign(settingName, campaignJson.name, campaignJson);
                    this.logger.info("PDF manuals processed successfully");
                } catch (pdfError) {
                    // Log the error but don't fail the entire campaign creation
                    const pdfErrorMessage = pdfError instanceof Error ? pdfError.message : String(pdfError);
                    this.logger.error(`Failed to process PDF manuals: ${pdfErrorMessage}`);
                    
                    // Clear the pending upload markers since processing failed
                    progress.pdfManuals.playerManualPath = undefined;
                    progress.pdfManuals.gmManualPath = undefined;
                    await this.fileStore.saveCampaign(settingName, campaignJson.name, campaignJson);
                }
            }

            // Continue with the full generation process
            await this.continueGeneration(settingJson, campaignJson);

            return campaignJson;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            progress.setError(`Failed during ${progress.stage}: ${errorMessage}`);
            
            // Save the campaign with error state if it was at least partially created
            if (campaignJson!) {
                campaignJson.progress = progress;
                await this.fileStore.saveCampaign(settingName, campaignJson.name, campaignJson);
            }
            
            throw error;
        }
    }

    async continueGeneration(setting: Setting, campaign: Campaign): Promise<Campaign> {
        if (!campaign.progress) {
            throw new Error("Campaign progress not found");
        }

        // Reconstruct the progress object if it's been deserialized from JSON
        const progress = this.reconstructProgress(campaign.progress);
        campaign.progress = progress;

        try {
            // Stage 2: Create Storylines (moved to happen earlier)
            if (!progress.completedStages.includes(CampaignGenerationStage.STORYLINES_CREATION)) {
                this.logger.info("Creating storylines...");
                progress.setStage(CampaignGenerationStage.STORYLINES_CREATION, 0);
                
                const totalStorylines = campaign.milestones.length;
                let completedStorylines = 0;
                const createdStorylines: Storyline[] = []; // Track created storylines

                for (let i = 0; i < campaign.milestones.length; i++) {
                    const storylineProgress = progress.storylineProgress.find((sp: any) => sp.milestoneIndex === i);
                    if (storylineProgress && storylineProgress.completed) {
                        completedStorylines++;
                        // Load existing storyline for entity analysis
                        try {
                            const storylineName = `storyline-${i}`;
                            const existingStoryline = await this.fileStore.getStoryline(setting.name, campaign.name, storylineName);
                            if (existingStoryline) {
                                createdStorylines.push(existingStoryline);
                            }
                        } catch (error) {
                            this.logger.warn(`Could not load existing storyline ${i}: ${error}`);
                        }
                        continue; // Skip already completed storylines
                    }

                    try {
                        this.logger.info(`Creating storyline for milestone ${i + 1}/${totalStorylines}: ${campaign.milestones[i].name}`);
                        const storylineProgressPercent = (completedStorylines / totalStorylines) * 100;
                        progress.setStage(CampaignGenerationStage.STORYLINES_CREATION, storylineProgressPercent);
                        
                        const storyline = await this.createStoryline(setting.name, campaign.name, i, campaign.milestones[i].description);
                        createdStorylines.push(storyline); // Add to our collection
                        
                        progress.updateStorylineProgress(i, campaign.milestones[i].name, true);
                        completedStorylines++;
                        
                        await this.fileStore.saveCampaign(setting.name, campaign.name, campaign);
                    } catch (error) {
                        const errorMessage = error instanceof Error ? error.message : String(error);
                        progress.updateStorylineProgress(i, campaign.milestones[i].name, false, errorMessage);
                        await this.fileStore.saveCampaign(setting.name, campaign.name, campaign);
                        throw error; // Re-throw to stop generation
                    }
                }

                // Store the created storylines in progress for entity analysis
                progress.createdStorylines = createdStorylines.map(storyline => JSON.stringify(storyline));
                
                progress.markStageComplete(CampaignGenerationStage.STORYLINES_CREATION);
                await this.fileStore.saveCampaign(setting.name, campaign.name, campaign);
            }

            // Stage 3: Analyze entities from all storylines
            if (!progress.completedStages.includes(CampaignGenerationStage.ENTITIES_ANALYSIS)) {
                this.logger.info("Analyzing entities from all storylines...");
                progress.setStage(CampaignGenerationStage.ENTITIES_ANALYSIS, 0);
                
                const entities = await this.analyzeEntitiesFromStorylines(setting, campaign, progress);
                
                progress.setStage(CampaignGenerationStage.ENTITIES_ANALYSIS, 30);
                
                // Deduplicate each entity type using LLM
                this.logger.info("Deduplicating entities using semantic analysis...");
                const deduplicatedCharacters = await this.deduplicateEntities(
                    Array.from(entities.characters), 'characters', setting, campaign
                );
                
                progress.setStage(CampaignGenerationStage.ENTITIES_ANALYSIS, 60);
                
                const deduplicatedFactions = await this.deduplicateEntities(
                    Array.from(entities.factions), 'factions', setting, campaign
                );
                
                progress.setStage(CampaignGenerationStage.ENTITIES_ANALYSIS, 80);
                
                const deduplicatedLocations = await this.deduplicateEntities(
                    Array.from(entities.locations), 'locations', setting, campaign
                );
                
                // Store the deduplicated entities in progress for the next stages
                progress.analyzedEntities = {
                    characters: deduplicatedCharacters,
                    factions: deduplicatedFactions,
                    locations: deduplicatedLocations
                };
                
                progress.markStageComplete(CampaignGenerationStage.ENTITIES_ANALYSIS);
                await this.fileStore.saveCampaign(setting.name, campaign.name, campaign);
            }

            // Stage 4: Initialize Characters (batch creation)
            if (!progress.completedStages.includes(CampaignGenerationStage.CHARACTERS_INIT)) {
                this.logger.info("Creating all characters in batch...");
                progress.setStage(CampaignGenerationStage.CHARACTERS_INIT, 0);
                
                const characters = progress.analyzedEntities?.characters || [];
                const totalCharacters = characters.length;
                
                for (let i = 0; i < characters.length; i++) {
                    const characterData = characters[i];
                    const characterObj = JSON.parse(characterData);
                    
                    // Check if character already exists
                    if (!(await this.entityManager.getCharacterFromContext(characterData, setting, campaign))) {
                        this.logger.info(`Creating character ${i + 1}/${totalCharacters}: ${characterObj.name}`);
                        await this.entityManager.createCharacter(characterData, setting, campaign);
                    }
                    
                    const progressPercent = ((i + 1) / totalCharacters) * 100;
                    progress.setStage(CampaignGenerationStage.CHARACTERS_INIT, progressPercent);
                    
                    // Save periodically
                    if ((i + 1) % 5 === 0) {
                        await this.fileStore.saveCampaign(setting.name, campaign.name, campaign);
                    }
                }
                
                progress.markStageComplete(CampaignGenerationStage.CHARACTERS_INIT);
                await this.fileStore.saveCampaign(setting.name, campaign.name, campaign);
            }

            // Stage 5: Initialize Factions (batch creation)
            if (!progress.completedStages.includes(CampaignGenerationStage.FACTIONS_INIT)) {
                this.logger.info("Creating all factions in batch...");
                progress.setStage(CampaignGenerationStage.FACTIONS_INIT, 0);
                
                const factions = progress.analyzedEntities?.factions || [];
                const totalFactions = factions.length;
                
                for (let i = 0; i < factions.length; i++) {
                    const factionData = factions[i];
                    const factionObj = JSON.parse(factionData);
                    
                    // Check if faction already exists
                    if (!(await this.entityManager.getFactionFromContext(factionData, setting, campaign))) {
                        this.logger.info(`Creating faction ${i + 1}/${totalFactions}: ${factionObj.name}`);
                        await this.entityManager.createFaction(factionData, setting, campaign);
                    }
                    
                    const progressPercent = ((i + 1) / totalFactions) * 100;
                    progress.setStage(CampaignGenerationStage.FACTIONS_INIT, progressPercent);
                    
                    // Save periodically
                    if ((i + 1) % 5 === 0) {
                        await this.fileStore.saveCampaign(setting.name, campaign.name, campaign);
                    }
                }
                
                progress.markStageComplete(CampaignGenerationStage.FACTIONS_INIT);
                await this.fileStore.saveCampaign(setting.name, campaign.name, campaign);
            }

            // Stage 6: Initialize Locations (batch creation)
            if (!progress.completedStages.includes(CampaignGenerationStage.LOCATIONS_INIT)) {
                this.logger.info("Creating all locations in batch...");
                progress.setStage(CampaignGenerationStage.LOCATIONS_INIT, 0);
                
                const locations = progress.analyzedEntities?.locations || [];
                const totalLocations = locations.length;
                
                for (let i = 0; i < locations.length; i++) {
                    const locationData = locations[i];
                    const locationObj = JSON.parse(locationData);
                    
                    // Check if location already exists
                    if (!(await this.entityManager.getLocationFromContext(locationData, setting, campaign))) {
                        this.logger.info(`Creating location ${i + 1}/${totalLocations}: ${locationObj.name}`);
                        await this.entityManager.createLocation(locationData, setting, campaign);
                    }
                    
                    const progressPercent = ((i + 1) / totalLocations) * 100;
                    progress.setStage(CampaignGenerationStage.LOCATIONS_INIT, progressPercent);
                    
                    // Save periodically
                    if ((i + 1) % 5 === 0) {
                        await this.fileStore.saveCampaign(setting.name, campaign.name, campaign);
                    }
                }
                
                progress.markStageComplete(CampaignGenerationStage.LOCATIONS_INIT);
                await this.fileStore.saveCampaign(setting.name, campaign.name, campaign);
            }

            // Mark as completed
            progress.setStage(CampaignGenerationStage.COMPLETED, 100);
            this.logger.info("Campaign generation completed successfully!");
            await this.fileStore.saveCampaign(setting.name, campaign.name, campaign);

            return campaign;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            progress.setError(`Failed during ${progress.stage}: ${errorMessage}`);
            await this.fileStore.saveCampaign(setting.name, campaign.name, campaign);
            throw error;
        }
    }

    async resumeGeneration(settingName: string, campaignName: string): Promise<Campaign> {
        const campaign = await this.fileStore.getCampaign(settingName, campaignName);
        if (!campaign) {
            throw new Error(`Campaign ${campaignName} not found in setting ${settingName}`);
        }

        const setting = await this.fileStore.getSetting(settingName);
        if (!setting) {
            throw new Error(`Setting ${settingName} not found`);
        }

        if (!campaign.progress) {
            throw new Error("Campaign does not have progress information");
        }

        // Reconstruct the progress object if it's been deserialized from JSON
        const progress = this.reconstructProgress(campaign.progress);
        campaign.progress = progress;

        if (progress.stage === CampaignGenerationStage.COMPLETED) {
            this.logger.info("Campaign generation is already complete");
            return campaign;
        }

        if (progress.stage === CampaignGenerationStage.FAILED) {
            this.logger.info("Resuming failed campaign generation...");
            // Reset from failed state
            progress.stage = progress.completedStages.length > 0 
                ? progress.completedStages[progress.completedStages.length - 1]
                : CampaignGenerationStage.INITIAL_CREATION;
            progress.error = undefined;
        }

        this.logger.info(`Resuming campaign generation from stage: ${campaign.progress.stage}`);
        return await this.continueGeneration(setting, campaign);
    }

    async processPdfManuals(settingName: string, campaignName: string, playerManualPath?: string, gmManualPath?: string): Promise<void> {
        this.logger.info("Processing PDF manuals for campaign");
        
        try {
            // Get the campaign directory
            const campaignDir = this.fileStore.getCampaignDirectory(settingName, campaignName);
            
            // Process player manual if provided
            if (playerManualPath) {
                this.logger.info("Chunking player manual");
                await this.pdfChunker.chunkPdfFromFoundry(playerManualPath, campaignDir, 'player');
            }
            
            // Process GM manual if provided
            if (gmManualPath) {
                this.logger.info("Chunking GM manual");
                await this.pdfChunker.chunkPdfFromFoundry(gmManualPath, campaignDir, 'gm');
            }
            
            this.logger.info("PDF manual processing completed");
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.logger.info("PDF processing failed: " + errorMessage);
            // Log the paths for manual processing later
            if (playerManualPath || gmManualPath) {
                this.logger.info(`PDF files saved to be processed later: Player: ${playerManualPath}, GM: ${gmManualPath}`);
            }
            throw error;
        }
    }

    async createStoryline(settingName: string, campaignName: string, milestoneIndex: number, userPrompt: string): Promise<Storyline> {
        const settingJson: Setting | null = await this.fileStore.getSetting(settingName);
        if (settingJson == null) {
            throw new Error(`Setting ${settingName} not found`);
        }
        const setting: string = JSON.stringify(settingJson, null, 2);
        const campaignJson: Campaign | null = await this.fileStore.getCampaign(settingName, campaignName);
        if (campaignJson == null) {
            throw new Error(`Campaign ${campaignName} not found`);
        }
        const campaign: string = JSON.stringify(campaignJson, null, 2);
        const milestone = JSON.parse(campaign).milestones[milestoneIndex];

        const prompt = `
        Create a storyline for a tabletop RPG game. This will be a self-contained story within the context of the campaign.

        This is the setting for the campaign:
        ${setting}

        This is the campaign that the storyline will be a part of:
        ${campaign}

        ${userPrompt.length > 0 ? `The storyline should match the following user prompt: ${userPrompt}` : ""}

        The storyline will be a self-contained story within the context of the campaign.
        The storyline should only be a part of the larger campaign, not the whole thing.
        The purpose of the storyline is to be a self-contained portion of the larger campaign that builds towards the campaign's goals.
        If the campaign is to save the world, the storyline could be about finding a powerful artifact that will help in the final battle.

        The storyline should be for the following milestone in the campaign. Make sure the storyline's objective aligns with the milestone's description.
        Here is the milestone to base the storyline on:

        ${milestone.toString()}

        The storyline should be broken into clear tasks that the players have to accomplish.
        Each task should build towards the storyline's objective and help progress the story.
        Don't make the segments and tasks too generic or open-ended. Make them specific and focused on the storyline's objective.
        Be as descriptive as possible, and make sure to include all the key elements of the storyline. This will be used as the foundation for the story that the players will play through.
        `;

        // Generate structured Storyline output
        const storylineJson: Storyline = await this.textGenerationClient.generateText<Storyline>(
            prompt,
            [],
            { model: "gemini-2.5-flash-lite" }, // Use faster model for campaign generation
            undefined,
            StorylineSchema
        );
        storylineJson.name = milestone.name; // Set the name of the storyline to the name of the milestone
        storylineJson.campaign = campaignName; // Set the campaign name for the storyline

        await this.fileStore.saveStoryline(settingName, campaignName, storylineJson);

        // Note: Entity initialization is now handled in batch after all storylines are created
        // This improves efficiency by avoiding duplicate entity creation

        return storylineJson;
    }

    async getSetting(settingName: string): Promise<Setting | null> {
        return this.fileStore.getSetting(settingName);
    }
    async getCampaign(settingName: string, campaignName: string): Promise<Campaign | null> {
        return this.fileStore.getCampaign(settingName, campaignName);
    }
    async getStoryline(settingName: string, campaignName: string, storylineName: string): Promise<Storyline | null> {
        return this.fileStore.getStoryline(settingName, campaignName, storylineName);
    }

    // Initialize the characters for the campaign
    private async initializeCharacters(setting: Setting, campaign: Campaign, storyline: Storyline|null): Promise<void> {

        // Initialize the setting characters
        for (const character of setting.notableFigures) {
            if (!(await this.entityManager.getCharacterFromContext(JSON.stringify(character), setting, campaign))) {
                this.logger.info(`Creating character: ${character.name}`);
                await this.entityManager.createCharacter(JSON.stringify(character), setting, campaign);
            }
        }

        // Initialize the campaign characters
        for (const character of campaign.characters) {
            if (!(await this.entityManager.getCharacterFromContext(JSON.stringify(character), setting, campaign))) {
                this.logger.info(`Creating character: ${character.name}`);
                await this.entityManager.createCharacter(JSON.stringify(character), setting, campaign);
            }
        }

        // Initialize the storyline characters
        if (storyline != null) {
            for (const segment of storyline.segments) {
                for (const character of segment.characters) {
                    if (!(await this.entityManager.getCharacterFromContext(JSON.stringify(character), setting, campaign))) {
                        this.logger.info(`Creating character: ${character.name}`);
                        await this.entityManager.createCharacter(JSON.stringify(character), setting, campaign, storyline);
                    }
                }
            }
        }

    }

    // Initialize the factions for the campaign
    private async initializeFactions(setting: Setting, campaign: Campaign, storyline: Storyline|null): Promise<void> {
        // Initialize the setting factions
        for (const faction of setting.factions) {
            if(!(await this.entityManager.getFactionFromContext(JSON.stringify(faction), setting, campaign))) {
                this.logger.info(`Creating faction: ${faction.name}`);
                await this.entityManager.createFaction(JSON.stringify(faction), setting, campaign);
            }
        }

        // Initialize the campaign factions
        for (const faction of campaign.factions) {
            if(!(await this.entityManager.getFactionFromContext(JSON.stringify(faction), setting, campaign))) {
                this.logger.info(`Creating faction: ${faction.name}`);
                await this.entityManager.createFaction(JSON.stringify(faction), setting, campaign);
            }
        }

        // Initialize the storyline factions
        if (storyline != null) {
            for (const faction of storyline.factions) {
                if(!(await this.entityManager.getFactionFromContext(JSON.stringify(faction), setting, campaign))) {
                    this.logger.info(`Creating faction: ${faction.name}`);
                    await this.entityManager.createFaction(JSON.stringify(faction), setting, campaign, storyline);
                }
            }
        }

    }

    // Initialize the locations for the campaign
    private async initializeLocations(setting: Setting, campaign: Campaign, storyline: Storyline|null): Promise<void> {
        // Initialize the setting locations
        for (const location of setting.geography) {
            for (const settlement of location.settlements) {
                if(!(await this.entityManager.getLocationFromContext(JSON.stringify(settlement), setting, campaign))) {
                    this.logger.info(`Creating location: ${settlement.name}`);
                    await this.entityManager.createLocation(JSON.stringify(settlement), setting, campaign);
                }
            }
        }

        // Initialize the campaign locations
        for (const location of campaign.locations) {
            if(!(await this.entityManager.getLocationFromContext(JSON.stringify(location), setting, campaign))) {
                this.logger.info(`Creating location: ${location.name}`);
                await this.entityManager.createLocation(JSON.stringify(location), setting, campaign);
            }
        }

        // Initialize the storyline locations
        if (storyline != null) {
            for (const segment of storyline.segments) {
                for (const location of segment.locations) {
                    if(!(await this.entityManager.getLocationFromContext(JSON.stringify(location), setting, campaign))) {
                        this.logger.info(`Creating location: ${location.name}`);
                        await this.entityManager.createLocation(JSON.stringify(location), setting, campaign, storyline);
                    }
                }
            }
        }

    }

    private async analyzeEntitiesFromStorylines(setting: Setting, campaign: Campaign, progress: CampaignProgress): Promise<{
        characters: Set<string>,
        factions: Set<string>, 
        locations: Set<string>
    }> {
        const characters = new Set<string>();
        const factions = new Set<string>();
        const locations = new Set<string>();

        this.logger.info("Analyzing entities from all storylines...");

        // First, extract any entities that might be referenced in the setting and campaign
        await this.extractEntitiesFromContext(setting, campaign, characters, factions, locations);
        
        // Also extract entities directly defined in setting and campaign
        await this.extractDirectEntities(setting, campaign, characters, factions, locations);

        // Use created storylines from progress if available, otherwise load from file store
        const createdStorylines = progress.createdStorylines || [];
        
        if (createdStorylines.length > 0) {
            this.logger.info(`Using ${createdStorylines.length} storylines from progress for entity analysis`);
            
            // Parse and extract entities from created storylines
            for (const storylineJson of createdStorylines) {
                try {
                    const storyline = JSON.parse(storylineJson);
                    
                    // Extract factions (top-level property)
                    for (const faction of storyline.factions || []) {
                        factions.add(JSON.stringify(faction));
                    }
                    
                    // Extract characters and locations from segments
                    for (const segment of storyline.segments || []) {
                        // Extract characters from this segment
                        for (const character of segment.characters || []) {
                            characters.add(JSON.stringify(character));
                        }
                        
                        // Extract locations from this segment
                        for (const location of segment.locations || []) {
                            locations.add(JSON.stringify(location));
                        }
                    }
                } catch (error) {
                    this.logger.warn(`Could not parse storyline from progress: ${error}`);
                }
            }
        } else {
            // Fallback to loading storylines from file store
            this.logger.info("Loading storylines from file store for entity analysis");
            
            for (let i = 0; i < campaign.milestones.length; i++) {
                try {
                    const storylineName = `storyline-${i}`;
                    const storyline = await this.fileStore.getStoryline(setting.name, campaign.name, storylineName);
                    if (storyline) {
                        // Extract factions (top-level property)
                        for (const faction of storyline.factions) {
                            factions.add(JSON.stringify(faction));
                        }
                        
                        // Extract characters and locations from segments
                        for (const segment of storyline.segments) {
                            // Extract characters from this segment
                            for (const character of segment.characters) {
                                characters.add(JSON.stringify(character));
                            }
                            
                            // Extract locations from this segment
                            for (const location of segment.locations) {
                                locations.add(JSON.stringify(location));
                            }
                        }
                    }
                } catch (error) {
                    this.logger.warn(`Could not load storyline ${i} for entity analysis: ${error}`);
                }
            }
        }

        this.logger.info(`Found ${characters.size} unique characters, ${factions.size} unique factions, ${locations.size} unique locations`);
        
        return { characters, factions, locations };
    }

    private async extractEntitiesFromContext(
        setting: Setting, 
        campaign: Campaign, 
        characters: Set<string>,
        factions: Set<string>,
        locations: Set<string>
    ): Promise<void> {
        this.logger.info("Extracting entities mentioned in setting and campaign...");

        // Use LLM to extract any characters, factions, or locations mentioned in setting/campaign
        const prompt = `
Extract any characters, factions, and locations that are mentioned or implied in the following setting and campaign descriptions.
Only extract entities that are clearly defined with enough detail to be useful. Don't create generic or vague entities.

SETTING:
${JSON.stringify(setting, null, 2)}

CAMPAIGN:
${JSON.stringify(campaign, null, 2)}

Return a JSON object with three arrays: characters, factions, and locations.
Each entity should have the properties that match the storyline entity format:
- Characters: name, description, role
- Factions: name, description, relevance  
- Locations: name, description, features

Only return the JSON, no other text.
`;

        try {
            const contextEntitiesSchema: Schema = {
                type: Type.OBJECT,
                properties: {
                    characters: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                name: { type: Type.STRING },
                                description: { type: Type.STRING },
                                role: { type: Type.STRING }
                            }
                        }
                    },
                    factions: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                name: { type: Type.STRING },
                                description: { type: Type.STRING },
                                relevance: { type: Type.STRING }
                            }
                        }
                    },
                    locations: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                name: { type: Type.STRING },
                                description: { type: Type.STRING },
                                features: { type: Type.STRING }
                            }
                        }
                    }
                }
            };

            const contextEntities = await this.textGenerationClient.generateText<{
                characters: any[], factions: any[], locations: any[]
            }>(
                prompt,
                [],
                undefined,
                undefined,
                contextEntitiesSchema
            );

            // Add extracted entities to the sets
            for (const character of contextEntities.characters || []) {
                characters.add(JSON.stringify(character));
            }
            
            for (const faction of contextEntities.factions || []) {
                factions.add(JSON.stringify(faction));
            }
            
            for (const location of contextEntities.locations || []) {
                locations.add(JSON.stringify(location));
            }

            this.logger.info(`Extracted ${contextEntities.characters?.length || 0} characters, ${contextEntities.factions?.length || 0} factions, ${contextEntities.locations?.length || 0} locations from setting/campaign`);

        } catch (error) {
            this.logger.warn(`Failed to extract entities from context: ${error}`);
            // Continue without context entities if extraction fails
        }
    }

    private async extractDirectEntities(
        setting: Setting, 
        campaign: Campaign, 
        characters: Set<string>,
        factions: Set<string>,
        locations: Set<string>
    ): Promise<void> {
        this.logger.info("Extracting entities directly defined in setting and campaign...");

        // Extract entities from setting
        // Notable figures from setting
        for (const character of setting.notableFigures || []) {
            characters.add(JSON.stringify({
                name: character.name,
                description: character.description,
                role: character.role || 'Notable Figure'
            }));
        }

        // Factions from setting
        for (const faction of setting.factions || []) {
            factions.add(JSON.stringify({
                name: faction.name,
                description: faction.description,
                relevance: faction.goals || 'Setting faction'
            }));
        }

        // Locations from setting geography
        for (const geography of setting.geography || []) {
            // Add the geography region itself
            locations.add(JSON.stringify({
                name: geography.name,
                description: geography.description,
                features: geography.features || 'Geographic region'
            }));

            // Add settlements within the geography
            for (const settlement of geography.settlements || []) {
                locations.add(JSON.stringify({
                    name: settlement.name,
                    description: settlement.description,
                    features: settlement.knownFor || 'Settlement'
                }));
            }
        }

        // Extract entities from campaign
        // Characters from campaign
        for (const character of campaign.characters || []) {
            characters.add(JSON.stringify({
                name: character.name,
                description: character.description,
                role: character.role || 'Campaign Character'
            }));
        }

        // Factions from campaign
        for (const faction of campaign.factions || []) {
            factions.add(JSON.stringify({
                name: faction.name,
                description: faction.description,
                relevance: faction.motivation || 'Campaign faction'
            }));
        }

        // Locations from campaign
        for (const location of campaign.locations || []) {
            locations.add(JSON.stringify({
                name: location.name,
                description: location.description,
                features: location.features || 'Campaign location'
            }));
        }

        this.logger.info("Direct entity extraction completed");
    }

    private async deduplicateEntities<T>(
        entities: string[], 
        entityType: 'characters' | 'factions' | 'locations',
        setting: Setting,
        campaign: Campaign
    ): Promise<string[]> {
        if (entities.length <= 1) {
            return entities; // No need to deduplicate if 1 or fewer entities
        }

        this.logger.info(`Deduplicating ${entities.length} ${entityType}...`);

        // Parse all entities for analysis
        const parsedEntities = entities.map((entityJson, index) => {
            try {
                const entity = JSON.parse(entityJson);
                return { index, entity, originalJson: entityJson };
            } catch (error) {
                this.logger.warn(`Failed to parse entity ${index}: ${error}`);
                return null;
            }
        }).filter(item => item !== null);

        if (parsedEntities.length <= 1) {
            return entities;
        }

        // Create deduplication prompt
        const prompt = `
You are helping deduplicate entities for a tabletop RPG campaign. You need to identify which entities represent the same person/faction/location and merge them intelligently.

SETTING CONTEXT:
${JSON.stringify(setting, null, 2)}

CAMPAIGN CONTEXT:  
${JSON.stringify(campaign, null, 2)}

ENTITIES TO DEDUPLICATE (${entityType}):
${parsedEntities.map((item, idx) => `Entity ${idx + 1}: ${JSON.stringify(item!.entity, null, 2)}`).join('\n\n')}

TASK:
1. Identify which entities represent the same ${entityType.slice(0, -1)} (same name, similar role/description, etc.)
2. For each group of duplicates, create ONE merged entity that combines the best information
3. Keep entities that are clearly different people/places/factions
4. Preserve all unique and important details from the original entities

Return a JSON array of the deduplicated entities. Each entity should be complete and well-formed.
Only return the JSON array, no other text.
`;

        try {
            // Get the appropriate schema based on entity type
            let schema: Schema;
            if (entityType === 'characters') {
                schema = {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            name: { type: Type.STRING },
                            description: { type: Type.STRING },
                            role: { type: Type.STRING }
                        }
                    }
                };
            } else if (entityType === 'factions') {
                schema = {
                    type: Type.ARRAY, 
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            name: { type: Type.STRING },
                            description: { type: Type.STRING },
                            relevance: { type: Type.STRING }
                        }
                    }
                };
            } else { // locations
                schema = {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT, 
                        properties: {
                            name: { type: Type.STRING },
                            description: { type: Type.STRING },
                            features: { type: Type.STRING }
                        }
                    }
                };
            }

            const deduplicatedEntities = await this.textGenerationClient.generateText<any[]>(
                prompt,
                [],
                undefined,
                undefined,
                schema
            );

            const deduplicatedJson = deduplicatedEntities.map(entity => JSON.stringify(entity));
            
            this.logger.info(`Deduplicated ${entities.length} ${entityType} down to ${deduplicatedJson.length}`);
            return deduplicatedJson;

        } catch (error) {
            this.logger.error(`Failed to deduplicate ${entityType}: ${error}`);
            // Fall back to original list if deduplication fails
            return entities;
        }
    }

}

export { CampaignManager };