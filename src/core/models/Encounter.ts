import * as t from "io-ts";

const AbilityScoresCodec = t.type({
    strength: t.number,
    dexterity: t.number,
    constitution: t.number,
    intelligence: t.number,
    wisdom: t.number,
    charisma: t.number,
});

const SpellCodec = t.type({
    name: t.string,
    description: t.string,
    effect: t.string,
    imagePrompt: t.string
});

const FeatureCodec = t.type({
    name: t.string,
    description: t.string,
    effect: t.string,
    imagePrompt: t.string
});

const WeaponCodec = t.type({
    name: t.string,
    description: t.string,
    effect: t.string,
    imagePrompt: t.string
});

const EquipmentCodec = t.type({
    name: t.string,
    description: t.string,
    effect: t.string,
    imagePrompt: t.string
});

const EntityCodec = t.type({
    name: t.string,
    description: t.string,
    tokenPrompt: t.string,
    count: t.number,
    level: t.number,
    alignment: t.string,
    abilities: AbilityScoresCodec,
    armorClass: t.number,
    hitPoints: t.number,
    movement: t.type({
        burrow: t.number,
        climb: t.number,
        fly: t.number,
        hover: t.boolean,
        swim: t.number,
        walk: t.number,
    }),
    weapons: t.array(WeaponCodec),
    equipment: t.array(EquipmentCodec),
    spells: t.array(SpellCodec),
    features: t.array(FeatureCodec),
    cr: t.number,
    size: t.union([t.literal("tiny"), t.literal("sm"), t.literal("med"), t.literal("lg"), t.literal("huge"), t.literal("grg")]),
});

const EncounterCodec = t.type({
    name: t.string,
    description: t.string,
    battlemapPrompt: t.string,
    backgroundImageDimension: t.union([t.literal("square"), t.literal("portrait"), t.literal("landscape")]),
    entities: t.array(EntityCodec),
});

class AbilityScores {
    constructor(
        public strength: number,
        public dexterity: number,
        public constitution: number,
        public intelligence: number,
        public wisdom: number,
        public charisma: number
    ) {}
}

class Spell {
    constructor(public name: string, public description: string, public effect: string, public imagePrompt: string) {}
}

class Feature {
    constructor(public name: string, public description: string, public effect: string, public imagePrompt: string) {}
}

class Weapon {
    constructor(public name: string, public description: string, public effect: string, public imagePrompt: string) {}
}

class Equipment {
    constructor(public name: string, public description: string, public effect: string, public imagePrompt: string) {}
}

class Entity {
    constructor(
        public name: string,
        public description: string,
        public tokenPrompt: string,
        public count: number,
        public level: number,
        public alignment: string,
        public abilities: AbilityScores,
        public armorClass: number,
        public hitPoints: number,
        public movement: {
            burrow: number;
            climb: number;
            fly: number;
            hover: boolean;
            swim: number;
            walk: number;
        },
        public weapons: Weapon[],
        public equipment: Equipment[],
        public spells: Spell[],
        public features: Feature[],
        public cr: number,
        public size: string,
    ) {}
}

class Encounter {
    constructor(
        public name: string,
        public description: string,
        public battlemapPrompt: string,
        public backgroundImageDimension: string,
        public entities: Entity[]
    ) {}
}

export { Encounter, EncounterCodec };