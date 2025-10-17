import { EmbeddingService } from "../core/EmbeddingService";
import { GeminiEmbeddingClient } from "../generation/clients/GeminiEmbeddingClient";
import { SimpleVectorDatabase } from "../utils/SimpleVectorDatabase";
import { IFileStore } from "../utils/interfaces/IFileStore";
import { ILogger } from "../utils/interfaces/ILogger";

export interface EmbeddingSetupOptions {
    googleApiKey: string;
    embeddingModel?: string;
    settingName: string;
    campaignName: string;
    fileStore: IFileStore;
    logger: ILogger;
}

/**
 * Factory to create embedding services for player and GM manuals
 */
export class EmbeddingFactory {
    
    static async createEmbeddingServices(options: EmbeddingSetupOptions): Promise<{
        playerEmbeddingService: EmbeddingService;
        gmEmbeddingService: EmbeddingService;
    }> {
        const {
            googleApiKey,
            embeddingModel = "gemini-embedding-001",
            settingName,
            campaignName,
            fileStore,
            logger,
        } = options;

        // Create embedding client
        const embeddingClient = new GeminiEmbeddingClient(googleApiKey, embeddingModel);

        // Create vector databases for player and GM manuals
        const playerVectorDb = new SimpleVectorDatabase(fileStore, settingName, campaignName, 'player');
        const gmVectorDb = new SimpleVectorDatabase(fileStore, settingName, campaignName, 'gm');

        // Load existing embeddings from disk
        await playerVectorDb.loadFromDisk();
        await gmVectorDb.loadFromDisk();

        // Create embedding services
        const playerEmbeddingService = new EmbeddingService(
            embeddingClient,
            playerVectorDb,
            fileStore,
            logger,
        );

        const gmEmbeddingService = new EmbeddingService(
            embeddingClient,
            gmVectorDb,
            fileStore,
            logger,
        );

        return {
            playerEmbeddingService,
            gmEmbeddingService
        };
    }

    /**
     * Check if embeddings need to be created or updated for the manuals
     */
    static async checkEmbeddingStatus(
        playerEmbeddingService: EmbeddingService,
        gmEmbeddingService: EmbeddingService
    ): Promise<{
        playerNeedsEmbeddings: boolean;
        gmNeedsEmbeddings: boolean;
        playerStats: { count: number; dimension: number };
        gmStats: { count: number; dimension: number };
    }> {
        const [playerNeedsEmbeddings, gmNeedsEmbeddings, playerStats, gmStats] = await Promise.all([
            playerEmbeddingService.hasEmbeddings().then(has => !has),
            gmEmbeddingService.hasEmbeddings().then(has => !has),
            playerEmbeddingService.getEmbeddingStats(),
            gmEmbeddingService.getEmbeddingStats()
        ]);

        console.log("Embedding status:", {
            playerNeedsEmbeddings,
            gmNeedsEmbeddings,
            playerStats,
            gmStats
        });

        return {
            playerNeedsEmbeddings,
            gmNeedsEmbeddings,
            playerStats,
            gmStats
        };
    }

    /**
     * Create embeddings for both manuals if needed
     */
    static async ensureEmbeddings(
        playerEmbeddingService: EmbeddingService,
        gmEmbeddingService: EmbeddingService,
        settingName: string,
        campaignName: string,
        onProgress?: (type: 'player' | 'gm', status: any) => void
    ): Promise<void> {
        const status = await this.checkEmbeddingStatus(playerEmbeddingService, gmEmbeddingService);

        const promises: Promise<void>[] = [];

        if (status.playerNeedsEmbeddings) {
            promises.push(
                playerEmbeddingService.createEmbeddingsForManual(
                    settingName,
                    campaignName,
                    'player',
                    onProgress ? (status) => onProgress('player', status) : undefined
                )
            );
        }

        if (status.gmNeedsEmbeddings) {
            promises.push(
                gmEmbeddingService.createEmbeddingsForManual(
                    settingName,
                    campaignName,
                    'gm',
                    onProgress ? (status) => onProgress('gm', status) : undefined
                )
            );
        }

        if (promises.length > 0) {
            await Promise.all(promises);
        }
    }
}
