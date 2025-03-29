//import * as fs from 'fs';
//import * as path from 'path';

/*
function getSetting() {
    const settingsPath = path.join(game.userDataPath, 'modules', 'ai-dungeon-master', 'settings');
    if (!fs.existsSync(settingsPath)) return [];
    return fs.readdirSync(settingsPath).filter(file => fs.statSync(path.join(settingsPath, file)).isDirectory());
}

function getCampaigns(settingName) {
    const campaignsPath = path.join(game.userDataPath, 'modules', 'ai-dungeon-master', 'settings', settingName);
    if (!fs.existsSync(campaignsPath)) return [];
    return fs.readdirSync(campaignsPath).filter(file => fs.statSync(path.join(campaignsPath, file)).isDirectory());
}
    */

function initializeModule() {

}

Hooks.on('ready', () => {
    initializeModule();
})