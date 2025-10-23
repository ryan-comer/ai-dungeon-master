import * as t from 'io-ts';

// Lean Setting model: only essential info and the original prompt
class Setting {
    name: string;
    description: string;
    prompt: string;

    constructor(data?: Partial<Setting>) {
        this.name = data?.name ?? '';
        this.description = data?.description ?? '';
        this.prompt = data?.prompt ?? '';
    }
}

const SettingCodec = t.type({
    name: t.string,
    description: t.string,
    prompt: t.string,
});

export { Setting, SettingCodec };