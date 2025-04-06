import * as t from 'io-ts';

class Location {
    name: string;
    description: string;
    locationType: string;
    geography: {
        climate: string;
        terrain: string;
        features: string[];
    };
    population: {
        size: string;
        demographics: {
            name: string;
            description: string;
            percentage: string;
        }[];
    };
    government: {
        type: string;
        ruler: string;
        laws: string[];
    };
    economy: {
        type: string;
        resources: string[];
        currency: string;
    };
    defenses: {
        military: string;
        fortifications: string[];
    };
    culture: {
        religion: string;
        traditions: string[];
        festivals: string[];
    };
    people: {
        name: string;
        description: string;
        role: string;
    }[];
    campaign: {
        relevance: string;
        hooks: string[];
    };
    history: {
        name: string;
        description: string;
        date: string;
    }[];
    factions: {
        name: string;
        description: string;
        relevance: string;
    }[];

    constructor(data: Partial<Location>) {
        this.name = data.name || '';
        this.description = data.description || '';
        this.locationType = data.locationType || '';
        this.geography = data.geography || {
            climate: '',
            terrain: '',
            features: [],
        };
        this.population = data.population || {
            size: '',
            demographics: [],
        };
        this.government = data.government || {
            type: '',
            ruler: '',
            laws: [],
        };
        this.economy = data.economy || {
            type: '',
            resources: [],
            currency: '',
        };
        this.defenses = data.defenses || {
            military: '',
            fortifications: [],
        };
        this.culture = data.culture || {
            religion: '',
            traditions: [],
            festivals: [],
        };
        this.people = data.people || [];
        this.campaign = data.campaign || {
            relevance: '',
            hooks: [],
        };
        this.history = data.history || [];
        this.factions = data.factions || [];
    }
}

const LocationCodec = t.type({
    name: t.string,
    description: t.string,
    locationType: t.string,
    geography: t.type({
        climate: t.string,
        terrain: t.string,
        features: t.array(t.string),
    }),
    population: t.type({
        size: t.string,
        demographics: t.array(
            t.type({
                name: t.string,
                description: t.string,
                percentage: t.string,
            })
        ),
    }),
    government: t.type({
        type: t.string,
        ruler: t.string,
        laws: t.array(t.string),
    }),
    economy: t.type({
        type: t.string,
        resources: t.array(t.string),
        currency: t.string,
    }),
    defenses: t.type({
        military: t.string,
        fortifications: t.array(t.string),
    }),
    culture: t.type({
        religion: t.string,
        traditions: t.array(t.string),
        festivals: t.array(t.string),
    }),
    people: t.array(
        t.type({
            name: t.string,
            description: t.string,
            role: t.string,
        })
    ),
    campaign: t.type({
        relevance: t.string,
        hooks: t.array(t.string),
    }),
    history: t.array(
        t.type({
            name: t.string,
            description: t.string,
            date: t.string,
        })
    ),
    factions: t.array(
        t.type({
            name: t.string,
            description: t.string,
            relevance: t.string,
        })
    ),
});

export { Location, LocationCodec };