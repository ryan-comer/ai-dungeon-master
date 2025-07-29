class Player {
    constructor(
        public name: string,
        public level: number,
        public attributes: {
            strength: number;
            dexterity: number;
            constitution: number;
            intelligence: number;
            wisdom: number;
            charisma: number;
        },
        public details: {
            biography: string;
            ideals: string;
            bonds: string;
            flaws: string;
            personalityTraits: string;
            appearance: string;
        },
        public ac: number,
        public hp: number,
    ){}
}

export { Player };