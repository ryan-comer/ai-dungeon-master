import * as t from 'io-ts';

// Model class for a character in a campaign
class Character {
    name: string;
    description: string;
    campaignRole: string;
    alignment: string;
    factions: {
        name: string;
        description: string;
        role: string;
    }[];
    job: string;
    physicalDescription: {
        age: string;
        gender: string;
        height: string;
        build: string;
        notableFeatures: string[];
        attire: string;
    };
    personality: {
        general: string;
        strengths: string[];
        flaws: string[];
        mannerisms: string[];
    };
    background: {
        origin: string;
        significant_events: string[];
    };
    goals: {
        shortTerm: string[];
        long_term_goals: string[];
    };
    fears: string[];
    relationships: {
        allies: {
            name: string;
            relationship: string;
            notes: string;
        }[];
        enemies: {
            name: string;
            relationship: string;
            notes: string;
        }[];
    };
    skills: {
        magic: string[];
        combat: string[];
        languages_spoken: string[];
    };
    equipment: {
        name: string;
        description: string;
    }[];
    wealth: string;
    campaign: {
        relevance: string;
        hooks: string[];
    };
    achievements: string[];
    dialogExamples: string[];

    constructor() {
        this.name = '';
        this.description = '';
        this.campaignRole = '';
        this.alignment = '';
        this.factions = [];
        this.job = '';
        this.physicalDescription = {
            age: '',
            gender: '',
            height: '',
            build: '',
            notableFeatures: [],
            attire: '',
        };
        this.personality = {
            general: '',
            strengths: [],
            flaws: [],
            mannerisms: [],
        };
        this.background = {
            origin: '',
            significant_events: [],
        };
        this.goals = {
            shortTerm: [],
            long_term_goals: [],
        };
        this.fears = [];
        this.relationships = {
            allies: [],
            enemies: [],
        };
        this.skills = {
            magic: [],
            combat: [],
            languages_spoken: [],
        };
        this.equipment = [];
        this.wealth = '';
        this.campaign = {
            relevance: '',
            hooks: [],
        };
        this.achievements = [];
        this.dialogExamples = [];
    }
}

const CharacterCodec = t.type({
    name: t.string,
    description: t.string,
    campaignRole: t.string,
    alignment: t.string,
    factions: t.array(
        t.type({
            name: t.string,
            description: t.string,
            role: t.string,
        })
    ),
    job: t.string,
    physicalDescription: t.type({
        age: t.string,
        gender: t.string,
        height: t.string,
        build: t.string,
        notableFeatures: t.array(t.string),
        attire: t.string,
    }),
    personality: t.type({
        general: t.string,
        strengths: t.array(t.string),
        flaws: t.array(t.string),
        mannerisms: t.array(t.string),
    }),
    background: t.type({
        origin: t.string,
        significant_events: t.array(t.string),
    }),
    goals: t.type({
        shortTerm: t.array(t.string),
        long_term_goals: t.array(t.string),
    }),
    fears: t.array(t.string),
    relationships: t.type({
        allies: t.array(
            t.type({
                name: t.string,
                relationship: t.string,
                notes: t.string,
            })
        ),
        enemies: t.array(
            t.type({
                name: t.string,
                relationship: t.string,
                notes: t.string,
            })
        ),
    }),
    skills: t.type({
        magic: t.array(t.string),
        combat: t.array(t.string),
        languages_spoken: t.array(t.string),
    }),
    equipment: t.array(
        t.type({
            name: t.string,
            description: t.string,
        })
    ),
    wealth: t.string,
    campaign: t.type({
        relevance: t.string,
        hooks: t.array(t.string),
    }),
    achievements: t.array(t.string),
    dialogExamples: t.array(t.string),
});

export { Character, CharacterCodec };