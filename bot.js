require('dotenv').config();
const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const puppeteer = require('puppeteer');
const fs = require('fs');

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
    let browser;
    try {
        // Updated for Linux/Render compatibility (uses bundled Chromium automatically)
        browser = await puppeteer.launch({
            headless: true,
            args: [
                '--no-sandbox', 
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--disable-gpu'
            ]
        });

        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
        
        await page.setCacheEnabled(false);
        await page.goto(SCRIPT_URL, { waitUntil: 'networkidle2', timeout: 30000 });
        await new Promise(r => setTimeout(r, 4000));

        // Click the "Changes" button to open the dropdown menu
        await page.evaluate(() => {
            const buttons = Array.from(document.querySelectorAll('button'));
            const changesBtn = buttons.find(el => el.innerText && el.innerText.trim().toLowerCase().includes('changes'));
            if (changesBtn) changesBtn.click();
        });

        await new Promise(r => setTimeout(r, 2500));

        const pageData = await page.evaluate(() => {
            const titleEl = document.querySelector('h1') || document.querySelector('.script-title');
            
            const allDivs = Array.from(document.querySelectorAll('div'));
            const entryBlocks = allDivs.filter(el => {
                const text = el.innerText || '';
                return text.includes('2026') && (text.includes('AM') || text.includes('PM')) && text.length < 300 && el.childElementCount < 4;
            });

            let topmostEntry = entryBlocks.length > 0 ? entryBlocks[0].innerText.trim() : 'No changelog found.';

            return {
                title: titleEl ? titleEl.innerText.trim() : 'VR Hands Script',
                changelog: topmostEntry
            };
        });

        await browser.close();

        let rawLines = pageData.changelog
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

        let uniqueUpdateKey = pageData.title + '::' + cleanBodyText;
        let sentHistory = getSentHistory();

        if (sentHistory.length === 0) {
            console.log('[Init] Baseline recorded permanently.');
            sentHistory.push(uniqueUpdateKey);
            saveSentHistory(sentHistory);
            fs.writeFileSync('changelog.txt', formattedChangelog, 'utf8');
            return;
        }

        const alreadySent = sentHistory.includes(uniqueUpdateKey);

        if (!alreadySent && pageData.changelog !== 'No changelog found.') {
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
                .setDescription('🟢 **' + pageData.title + '**\nRestart the script to apply the update, or use the download button below.')
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
        if (browser) await browser.close();
        console.error('Error checking page:', error.message);
    }
}

client.once('ready', () => {
    console.log('Bot logged in as ' + client.user.tag + '. Fast checker active (every 10 seconds).');
    checkPageFast();
    setInterval(checkPageFast, 10000);
});

client.login(DISCORD_TOKEN);