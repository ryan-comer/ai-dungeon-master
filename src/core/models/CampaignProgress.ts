import * as t from 'io-ts';

export enum CampaignGenerationStage {
    INITIAL_CREATION = 'initial_creation',
    PDF_PROCESSING = 'pdf_processing',
    STORYLINES_CREATION = 'storylines_creation',
    ENTITIES_ANALYSIS = 'entities_analysis',
    CHARACTERS_INIT = 'characters_init',
    FACTIONS_INIT = 'factions_init',
    LOCATIONS_INIT = 'locations_init',
    COMPLETED = 'completed',
    FAILED = 'failed'
}

export interface StorylineProgress {
    milestoneIndex: number;
    milestoneName: string;
    completed: boolean;
    error?: string;
}

export class CampaignProgress {
    stage: CampaignGenerationStage;
    completedStages: CampaignGenerationStage[];
    currentStageProgress: number; // 0-100 percentage
    totalStages: number;
    storylineProgress: StorylineProgress[];
    lastUpdated: Date;
    error?: string;
    
    // PDF processing tracking
    pdfManuals: {
        playerManualPath?: string;
        gmManualPath?: string;
        processed: boolean;
    };
    
    // Entity analysis tracking
    analyzedEntities?: {
        characters: string[];
        factions: string[];
        locations: string[];
    };
    
    // Created storylines for entity extraction
    createdStorylines?: string[];

    constructor() {
        this.stage = CampaignGenerationStage.INITIAL_CREATION;
        this.completedStages = [];
        this.currentStageProgress = 0;
        this.totalStages = 8; // Total number of stages (added entities_analysis)
        this.storylineProgress = [];
        this.lastUpdated = new Date();
        this.pdfManuals = {
            processed: false
        };
    }

    isComplete(): boolean {
        return this.stage === CampaignGenerationStage.COMPLETED;
    }

    isFailed(): boolean {
        return this.stage === CampaignGenerationStage.FAILED;
    }

    getOverallProgress(): number {
        const completedStagesCount = this.completedStages.length;
        const currentStageProgress = this.currentStageProgress / 100;
        return Math.round(((completedStagesCount + currentStageProgress) / this.totalStages) * 100);
    }

    markStageComplete(stage: CampaignGenerationStage): void {
        if (!this.completedStages.includes(stage)) {
            this.completedStages.push(stage);
        }
        this.currentStageProgress = 0;
        this.lastUpdated = new Date();
    }

    setStage(stage: CampaignGenerationStage, progress: number = 0): void {
        this.stage = stage;
        this.currentStageProgress = progress;
        this.lastUpdated = new Date();
    }

    setError(error: string): void {
        this.stage = CampaignGenerationStage.FAILED;
        this.error = error;
        this.lastUpdated = new Date();
    }

    updateStorylineProgress(milestoneIndex: number, milestoneName: string, completed: boolean, error?: string): void {
        const existing = this.storylineProgress.find(sp => sp.milestoneIndex === milestoneIndex);
        if (existing) {
            existing.completed = completed;
            existing.error = error;
        } else {
            this.storylineProgress.push({
                milestoneIndex,
                milestoneName,
                completed,
                error
            });
        }
        this.lastUpdated = new Date();
    }

    getNextIncompleteStoryline(): StorylineProgress | null {
        return this.storylineProgress.find(sp => !sp.completed) || null;
    }

    areAllStorylinesComplete(): boolean {
        return this.storylineProgress.length > 0 && this.storylineProgress.every(sp => sp.completed);
    }
}

const CampaignProgressCodec = t.type({
    stage: t.string,
    completedStages: t.array(t.string),
    currentStageProgress: t.number,
    totalStages: t.number,
    storylineProgress: t.array(t.type({
        milestoneIndex: t.number,
        milestoneName: t.string,
        completed: t.boolean,
        error: t.union([t.string, t.undefined])
    })),
    lastUpdated: t.string,
    error: t.union([t.string, t.undefined]),
    pdfManuals: t.type({
        playerManualPath: t.union([t.string, t.undefined]),
        gmManualPath: t.union([t.string, t.undefined]),
        processed: t.boolean
    }),
    analyzedEntities: t.union([
        t.type({
            characters: t.array(t.string),
            factions: t.array(t.string),
            locations: t.array(t.string)
        }),
        t.undefined
    ]),
    createdStorylines: t.union([
        t.array(t.string),
        t.undefined
    ])
});

export { CampaignProgressCodec };
