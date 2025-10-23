import * as t from 'io-ts';
import { CampaignProgress } from './CampaignProgress';

// Lean Campaign model: only essential info + prompt
class Campaign {
    name: string;
    setting: string; // reference to Setting name
    description: string;
    prompt: string;
    // Keep optional progress for backward-compat with store utilities (not used in lean mode)
    progress?: CampaignProgress;

    constructor(data?: Partial<Campaign>) {
        this.name = data?.name ?? '';
        this.setting = data?.setting ?? '';
        this.description = data?.description ?? '';
        this.prompt = data?.prompt ?? '';
        this.progress = data?.progress; // intentionally undefined by default
    }
}

const CampaignCodec = t.type({
    name: t.string,
    setting: t.string,
    description: t.string,
    prompt: t.string,
    // progress omitted from codec to avoid persisting it by default
});

export { Campaign, CampaignCodec };