require('dotenv').config();
const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const express = require('express');

const app = express();
const PORT = process.env.PORT || 3000;
app.get('/', (req, res) => res.send('Bot is active and running!'));
app.listen(PORT, () => console.log(`[Express] Health check server listening on port ${PORT}`));

const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const CHANNEL_ID = '1563741078987735080';
const SCRIPT_URL = 'https://rscripts.net/script/vrhands-for-pc-mobile-coming-soon-MCpL';

const client = new Client({ intents: [GatewayIntentBits.Guilds] });
const HISTORY_FILE = 'sent_updates.json';
const VERSION_FILE = 'version_state.json';

function getSentHistory() {
    try {
        if (fs.existsSync(HISTORY_FILE)) {
            const data = fs.readFileSync(HISTORY_FILE, 'utf8');
            const parsed = JSON.parse(data);
            if (Array.isArray(parsed)) return parsed;
        }
    } catch (e) {}
    return [];
}

function saveSentHistory(history) {
    try {
        fs.writeFileSync(HISTORY_FILE, JSON.stringify(history, null, 2), 'utf8');
    } catch (e) {}
}

function getCurrentVersion() {
    try {
        if (fs.existsSync(VERSION_FILE)) {
            const data = fs.readFileSync(VERSION_FILE, 'utf8');
            const parsed = JSON.parse(data);
            if (parsed && parsed.version) return parsed.version;
        }
    } catch (e) {}
    return '1.3.2';
}

function saveNextVersion(currentVer) {
    try {
        let clean = currentVer.replace(/^v/, '');
        let parts = clean.split('.').map(Number);
        parts[2] = (parts[2] || 0) + 1;
        let nextVer = parts.join('.');
        fs.writeFileSync(VERSION_FILE, JSON.stringify({ version: nextVer }, null, 2), 'utf8');
        return nextVer;
    } catch (e) {}
    return '1.3.3';
}

async function checkPageFast() {
    try {
        // Using a different public proxy endpoint with a randomized query parameter to avoid caching/rate limits
        const proxyUrl = `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(SCRIPT_URL)}&_t=${Date.now()}`;
        const { data: html } = await axios.get(proxyUrl, { timeout: 15000 });
        
        if (!html) {
            throw new Error('Empty response from proxy');
        }

        const $ = cheerio.load(html);
        
        const titleText = $('h1').first().text().trim() || 'VR Hands Script';
        
        let changelogText = 'No changelog found.';
        $('div').each((_, el) => {
            const text = $(el).text().trim();
            if (text.includes('2026') && (text.includes('AM') || text.includes('PM')) && text.length < 300) {
                changelogText = text;
                return false;
            }
        });

        let rawLines = changelogText
            .split('\n')
            .map(line => line.trim())
            .filter(line => line.length > 0);

        let timeLineIndex = rawLines.findIndex(line => line.includes('2026') && (line.includes('AM') || line.includes('PM')));
        
        let timestampStr = timeLineIndex !== -1 ? rawLines[timeLineIndex] : 'Recent Update';
        let bodyLines = timeLineIndex !== -1 ? rawLines.filter((_, idx) => idx !== timeLineIndex) : rawLines;
        
        if (bodyLines.length === 0) bodyLines = ['Update applied.'];

        let cleanBodyText = bodyLines.map(line => line.replace(/^\+\s*/, '')).join('\n');
        let formattedChangelog = bodyLines.map(line => '+ ' + line.replace(/^\+\s*/, '')).join('\n');
        let quoteBlock = formattedChangelog.split('\n').map(line => '> ' + line).join('\n');

        let uniqueUpdateKey = titleText + '::' + cleanBodyText;
        let sentHistory = getSentHistory();

        if (sentHistory.length === 0) {
            console.log('[Init] Baseline recorded permanently.');
            sentHistory.push(uniqueUpdateKey);
            saveSentHistory(sentHistory);
            fs.writeFileSync('changelog.txt', formattedChangelog, 'utf8');
            return;
        }

        const alreadySent = sentHistory.includes(uniqueUpdateKey);

        if (!alreadySent && changelogText !== 'No changelog found.') {
            let versionToDisplay = getCurrentVersion();
            console.log(`\n[!] BRAND NEW UPDATE DETECTED! Sending version v${versionToDisplay} to Discord...`);

            fs.writeFileSync('changelog.txt', formattedChangelog, 'utf8');
            sentHistory.push(uniqueUpdateKey);
            saveSentHistory(sentHistory);

            saveNextVersion(versionToDisplay);

            const channel = await client.channels.fetch(CHANNEL_ID);

            const embed = new EmbedBuilder()
                .setColor(0x2B2D31)
                .setTitle('U P D A T E')
                .setDescription('🟢 **' + titleText + '**\nRestart the script to apply the update, or use the download button below.')
                .addFields(
                    { name: 'Script Version:', value: '`v' + versionToDisplay + '`', inline: false },
                    { name: 'Released:', value: '`' + timestampStr + '`', inline: false },
                    { name: 'Changelog:', value: quoteBlock, inline: false },
                    { name: 'Detected At:', value: '`' + timestampStr + '`', inline: false }
                );

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setLabel('Download').setStyle(ButtonStyle.Link).setURL(SCRIPT_URL)
            );

            await channel.send({ content: '@here', embeds: [embed], components: [row] });
            console.log('[✓] Notification sent successfully!\n');
        } else {
            console.log('Checked: Top update is already logged. No duplicates sent.');
        }

    } catch (error) {
        console.error('Error checking page:', error.message);
    }
}

client.once('ready', () => {
    console.log('Bot logged in as ' + client.user.tag + '. Proxy checker active (every 60 seconds).');
    checkPageFast();
    // Checked every 60 seconds to completely avoid rate limits (429 errors)
    setInterval(checkPageFast, 60000);
});

client.login(DISCORD_TOKEN);