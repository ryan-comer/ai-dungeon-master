function stripInvalidFilenameChars(name: string): string {
    return name.replace(/[^a-z0-9]/gi, "_");
}

export { stripInvalidFilenameChars };