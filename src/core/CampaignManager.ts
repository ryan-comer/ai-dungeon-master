import { ICampaignManager } from "./interfaces/ICampaignManager";
import { IEntityManager } from "./interfaces/IEntityManager";
import { IFileStore } from "../utils/interfaces/IFileStore";
import { ILogger } from "../utils/interfaces/ILogger";
import { FoundryPdfChunker } from "../utils/FoundryPdfChunker";
import { ITextGenerationClient } from "../generation/clients/interfaces/ITextGenerationClient";
import { IImageGenerationClient } from "../generation/clients/interfaces/IImageGenerationClient";
import { Campaign } from "./models/Campaign";
import { CampaignSchema } from "./models/google/CampaignSchema";
import { Setting } from "./models/Setting";
import { SettingSchema } from "./models/google/SettingSchema";
import { Storyline } from "./models/Storyline";
import { CampaignProgress, CampaignGenerationStage } from "./models/CampaignProgress";

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
        // In lean mode, generation progress is not used. Keep minimal reconstruction for backward compatibility.
        const progress = new CampaignProgress();
        if (progressData) {
            progress.stage = progressData.stage || CampaignGenerationStage.INITIAL_CREATION;
            progress.completedStages = progressData.completedStages || [];
            progress.currentStageProgress = progressData.currentStageProgress || 0;
            progress.totalStages = progressData.totalStages || 0;
            progress.lastUpdated = new Date(progressData.lastUpdated || new Date());
            progress.error = progressData.error;
        }
        return progress;
    }

    async createSetting(userPrompt: string): Promise<Setting> {
        const prompt: string = `
            Propose a concise, evocative tabletop RPG setting name and a vivid 1-2 paragraph description.
            Base it on the following idea: ${userPrompt}
            Do not include characters, factions, locations, rules, or lists—just the setting name and description.
        `;

        const generated = await this.textGenerationClient.generateText<Pick<Setting, 'name' | 'description'>>(
            prompt,
            [],
            undefined,
            undefined,
            SettingSchema
        );

        const setting: Setting = new Setting({
            name: generated.name,
            description: generated.description,
            prompt: userPrompt
        });

        await this.fileStore.saveSetting(setting.name, setting);
        return setting;
    }

    async createCampaign(settingName: string, userPrompt: string, pdfManuals?: { playerManualFile?: File, gmManualFile?: File }): Promise<Campaign> {
        const setting: Setting | null = await this.fileStore.getSetting(settingName);
        if (!setting) {
            throw new Error(`Setting ${settingName} not found`);
        }

        const prompt: string = `
            Propose a concise, evocative campaign name and a vivid 1-2 paragraph description that fits the setting "${setting.name}".
            Base it on the following idea: ${userPrompt}
            Do not include characters, factions, locations, milestones, or lists—just the campaign name and description.
        `;

        const generated = await this.textGenerationClient.generateText<Pick<Campaign, 'name' | 'description'>>(
            prompt,
            [],
            undefined,
            undefined,
            CampaignSchema
        );

        const campaign: Campaign = new Campaign({
            name: generated.name,
            description: generated.description,
            setting: settingName,
            prompt: userPrompt,
        });

        await this.fileStore.saveCampaign(settingName, campaign.name, campaign);

        // If PDF manuals were provided, upload and process them immediately for RAG
        if (pdfManuals?.playerManualFile || pdfManuals?.gmManualFile) {
            try {
                this.logger.info("Processing PDF manuals...");

                let playerManualPath: string | undefined;
                let gmManualPath: string | undefined;

                // Determine destination path in Foundry's data storage
                const destPath = this.fileStore.getCampaignDirectory(settingName, campaign.name);

                // Upload player manual
                if (pdfManuals.playerManualFile) {
                    const renamedPlayerFile = new File([pdfManuals.playerManualFile], 'player-manual.pdf', {
                        type: pdfManuals.playerManualFile.type
                    });

                    if (typeof FilePicker !== 'undefined') {
                        const uploadResult = await (FilePicker as any).upload('data', destPath, renamedPlayerFile, {});
                        playerManualPath = uploadResult.path;
                    } else {
                        // Fallback: assume static path (environment must ensure file is present)
                        playerManualPath = `${settingName}/${campaign.name}/player-manual.pdf`;
                    }
                }

                // Upload GM manual
                if (pdfManuals.gmManualFile) {
                    const renamedGmFile = new File([pdfManuals.gmManualFile], 'gm-manual.pdf', {
                        type: pdfManuals.gmManualFile.type
                    });

                    if (typeof FilePicker !== 'undefined') {
                        const uploadResult = await (FilePicker as any).upload('data', destPath, renamedGmFile, {});
                        gmManualPath = uploadResult.path;
                    } else {
                        // Fallback: assume static path (environment must ensure file is present)
                        gmManualPath = `${settingName}/${campaign.name}/gm-manual.pdf`;
                    }
                }

                // Chunk the uploaded PDFs into RAG-friendly JSON
                await this.processPdfManuals(settingName, campaign.name, playerManualPath, gmManualPath);
                this.logger.info("PDF manuals processed successfully");

            } catch (pdfError) {
                const pdfErrorMessage = pdfError instanceof Error ? pdfError.message : String(pdfError);
                this.logger.error(`Failed to process PDF manuals: ${pdfErrorMessage}`);
                // Non-fatal: continue without manuals
            }
        }

        return campaign;
    }

    async continueGeneration(_setting: Setting, campaign: Campaign): Promise<Campaign> {
        // No-op in lean mode; nothing to pre-generate.
        this.logger.info("continueGeneration: Lean mode active - skipping pre-generation.");
        return campaign;
    }

    async resumeGeneration(settingName: string, campaignName: string): Promise<Campaign> {
        const campaign = await this.fileStore.getCampaign(settingName, campaignName);
        if (!campaign) {
            throw new Error(`Campaign ${campaignName} not found in setting ${settingName}`);
        }
        this.logger.info("resumeGeneration: Lean mode active - nothing to resume.");
        return campaign;
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

    async getSetting(settingName: string): Promise<Setting | null> {
        return this.fileStore.getSetting(settingName);
    }
    async getCampaign(settingName: string, campaignName: string): Promise<Campaign | null> {
        return this.fileStore.getCampaign(settingName, campaignName);
    }
    async getStoryline(settingName: string, campaignName: string, storylineName: string): Promise<Storyline | null> {
        return this.fileStore.getStoryline(settingName, campaignName, storylineName);
    }

    // All previous pre-generation helpers removed in lean modu

}

export { CampaignManager };