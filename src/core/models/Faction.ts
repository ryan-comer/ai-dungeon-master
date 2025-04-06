import * as t from 'io-ts';

class Faction {
    name: string;
    description: string;
    alignment: string;
    goals: string[];
    philosophy: string;
    history: {
        founded: string;
        founder: string;
        origin: string;
    };
    members: {
        name: string;
        role: string;
        description: string;
    }[];
    allies: {
        name: string;
        relationship: string;
    }[];
    enemies: {
        name: string;
        relationship: string;
    }[];
    assets: {
        bases: {
            name: string;
            location: string;
            description: string;
        }[];
        artifacts: {
            name: string;
            description: string;
        }[];
    };
    operations: string[];
    achievements: {
        name: string;
        description: string;
    }[];
    publicPerception: string;
    campaign: {
        relevance: string;
        hooks: string[];
    };

    constructor(data: Partial<Faction> = {}) {
        this.name = data.name || '';
        this.description = data.description || '';
        this.alignment = data.alignment || '';
        this.goals = data.goals || [];
        this.philosophy = data.philosophy || '';
        this.history = data.history || { founded: '', founder: '', origin: '' };
        this.members = data.members || [];
        this.allies = data.allies || [];
        this.enemies = data.enemies || [];
        this.assets = data.assets || { bases: [], artifacts: [] };
        this.operations = data.operations || [];
        this.achievements = data.achievements || [];
        this.publicPerception = data.publicPerception || '';
        this.campaign = data.campaign || { relevance: '', hooks: [] };
    }
}

const FactionCodec = t.type({
    name: t.string,
    description: t.string,
    alignment: t.string,
    goals: t.array(t.string),
    philosophy: t.string,
    history: t.type({
        founded: t.string,
        founder: t.string,
        origin: t.string,
    }),
    members: t.array(
        t.type({
            name: t.string,
            role: t.string,
            description: t.string,
        })
    ),
    allies: t.array(
        t.type({
            name: t.string,
            relationship: t.string,
        })
    ),
    enemies: t.array(
        t.type({
            name: t.string,
            relationship: t.string,
        })
    ),
    assets: t.type({
        bases: t.array(
            t.type({
                name: t.string,
                location: t.string,
                description: t.string,
            })
        ),
        artifacts: t.array(
            t.type({
                name: t.string,
                description: t.string,
            })
        ),
    }),
    operations: t.array(t.string),
    achievements: t.array(
        t.type({
            name: t.string,
            description: t.string,
        })
    ),
    publicPerception: t.string,
    campaign: t.type({
        relevance: t.string,
        hooks: t.array(t.string),
    }),
});

export { Faction, FactionCodec };