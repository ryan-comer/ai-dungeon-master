import * as t from 'io-ts';

// Model class that represents a campaign
class Campaign {
    name: string;
    description: string;
    objectives: string[];
    overview: {
        description: string;
        objective: string;
        premise: string;
    };
    factions: {
        name: string;
        description: string;
        motivation: string;
    }[];
    characters: {
        name: string;
        description: string;
        role: string;
    }[];
    locations: {
        name: string;
        description: string;
        features: string;
        relevance: string;
    }[];
    milestones: {
        name: string;
        description: string;
        objective: string;
    }[];
}

const CampaignCodec = t.type({
    name: t.string,
    description: t.string,
    objectives: t.array(t.string),
    overview: t.type({
        description: t.string,
        objective: t.string,
        premise: t.string,
    }),
    factions: t.array(
        t.type({
            name: t.string,
            description: t.string,
            motivation: t.string,
        })
    ),
    characters: t.array(
        t.type({
            name: t.string,
            description: t.string,
            role: t.string,
        })
    ),
    locations: t.array(
        t.type({
            name: t.string,
            description: t.string,
            features: t.string,
            relevance: t.string,
        })
    ),
    milestones: t.array(
        t.type({
            name: t.string,
            description: t.string,
            objective: t.string,
        })
    ),
});

export { Campaign, CampaignCodec };