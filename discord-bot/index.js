const { Client, GatewayIntentBits, REST, Routes } = require('discord.js');
const { joinVoiceChannel, createAudioPlayer, createAudioResource } = require('@discordjs/voice');
const express = require('express');
const cors = require('cors'); // Add this line
const textToSpeech = require('@google-cloud/text-to-speech');
const fs = require('fs');
const util = require('util');

const dotenv = require('dotenv');
dotenv.config();

// Discord bot setup
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates] });
let voiceConnection;

// Slash command setup
const commands = [
    {
        name: 'join',
        description: 'Join the current voice channel',
    },
    {
        name: 'leave',
        description: 'Leave the current voice channel',
    },
];
const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_BOT_TOKEN);

// Register slash commands
(async () => {
    try {
        console.log('Registering slash commands...');
        await rest.put(
            Routes.applicationCommands(process.env.DISCORD_APPLICATION_ID), // Replace with your bot's client ID
            { body: commands }
        );
        console.log('Slash commands registered.');
    } catch (error) {
        console.error(error);
    }
})();

// Initialize Google Cloud Text-to-Speech client
const ttsClient = new textToSpeech.TextToSpeechClient({apiKey: process.env.GOOGLE_API_KEY});

// Event: Bot ready
client.once('ready', () => {
    console.log('Bot is ready!');
});

// Event: Slash command interaction
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isCommand()) return;

    if (interaction.commandName === 'join') {
        const channel = interaction.member.voice?.channel;
        if (!channel) {
            await interaction.reply('You need to be in a voice channel to use this command.');
            return;
        }

        voiceConnection = joinVoiceChannel({
            channelId: channel.id,
            guildId: channel.guild.id,
            adapterCreator: channel.guild.voiceAdapterCreator,
        });

        await interaction.reply('Joined the voice channel!');
    } else if (interaction.commandName === 'leave') {
        if (voiceConnection) {
            voiceConnection.destroy();
            voiceConnection = null;
            await interaction.reply('Left the voice channel.');
        } else {
            await interaction.reply('I am not in a voice channel.');
        }
    }
});

// Local server setup
const app = express();
app.use(cors()); // Enable CORS
app.use(express.json());

app.post('/speak', async (req, res) => {
    const { text } = req.body;
    if (!text) {
        return res.status(400).send('Text is required.');
    }

    if (!voiceConnection) {
        return res.status(400).send('Bot is not in a voice channel.');
    }

    try {
        // Configure the request for Google Cloud Text-to-Speech
        const request = {
            input: { text },
            voice: { languageCode: 'en-US', name: 'en-US-Chirp3-HD-Algieba' },
            audioConfig: { audioEncoding: 'MP3' },
        };

        // Perform the Text-to-Speech request
        const [response] = await ttsClient.synthesizeSpeech(request);

        // Save the audio content to a temporary file
        const writeFile = util.promisify(fs.writeFile);
        const tempFilePath = './output.mp3';
        await writeFile(tempFilePath, response.audioContent, 'binary');

        // Create an audio resource from the file
        const player = createAudioPlayer();
        const resource = createAudioResource(tempFilePath);

        const subscription = voiceConnection.subscribe(player);
        player.play(resource);

        player.on('idle', () => {
            subscription.unsubscribe();
            fs.unlinkSync(tempFilePath); // Clean up the temporary file
        });

        res.send('Message sent to voice channel.');
    } catch (error) {
        console.error(error);
        res.status(500).send('Error processing the request.');
    }
});

// Start the server
app.listen(3000, () => {
    console.log('Server is running on http://localhost:3000');
});

// Login the bot
client.login(process.env.DISCORD_BOT_TOKEN);
