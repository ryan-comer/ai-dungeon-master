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
        public ac: number,
        public hp: number,
    ){}
}

export { Player };