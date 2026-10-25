const axios = require('axios');
const fs = require('fs');

// --- DEDICATED CHANNELS & WEBHOOK URLS ---
const STATUS_CHANNEL_ID = "1563983506152104148";
const STATUS_WEBHOOK_URL = "https://discord.com/api/webhooks/1563983611114291400/FJ11dvYY1z7Q9-w8ki2VMk_8KRro9DZ06FvztFInayxPZIKRgpSXiofZbR1bixdvf17I";

const UPDATES_CHANNEL_ID = "1563990360579899442";
const UPDATES_WEBHOOK_URL = "https://discord.com/api/webhooks/1563995640709644378/x8Onf4KHypJfoe2dolEnErHF4QwxHoA3wnJ5eu9pQOjEnt3p3cmUXUwSMe0PNwbouSB-";
// ------------------------------------------

const KEY_SYSTEM_STATUS = "🟢 Operational";
const SCRIPT_STATUS = "🟢 Working & Undetected";
const BANWAVE_STATUS = "🟢 Safe / No Banwave";
const PLATFORM = "Windows 10 / 11";

const VERSION_FILE = './last_tracked_version.json';
const STATUS_MESSAGE_FILE = './status_message_id.json';

function getLastSavedVersion() {
    try {
        if (fs.existsSync(VERSION_FILE)) {
            const data = JSON.parse(fs.readFileSync(VERSION_FILE, 'utf8'));
            return data.version;
        }
    } catch (e) {}
    return null;
}

function saveCurrentVersion(ver) {
    try {
        fs.writeFileSync(VERSION_FILE, JSON.stringify({ version: ver }));
    } catch (e) {}
}

function getSavedStatusMessageId() {
    try {
        if (fs.existsSync(STATUS_MESSAGE_FILE)) {
            const data = JSON.parse(fs.readFileSync(STATUS_MESSAGE_FILE, 'utf8'));
            return data.messageId;
        }
    } catch (e) {}
    return null;
}

function saveStatusMessageId(id) {
    try {
        fs.writeFileSync(STATUS_MESSAGE_FILE, JSON.stringify({ messageId: id }));
    } catch (e) {}
}

async function fetchRobloxVersion() {
    try {
        const response = await axios.get("https://clientsettingscdn.roblox.com/v2/client-version/WindowsPlayer", {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
            timeout: 5000
        });
        return response.data.clientVersionUpload || "Unavailable";
    } catch (error) {
        return "Unavailable";
    }
}

// 1. Status Dashboard Updater (#status channel)
async function runStatusUpdater() {
    const robloxVersion = await fetchRobloxVersion();
    const timestamp = Math.floor(Date.now() / 1000);

    const payload = {
        embeds: [{
            title: "⚡ REAL - Live System Status",
            description: `Real-time operational status for Key System and Roblox Client.\n\n**Last Checked:** <t:${timestamp}:R>`,
            color: 5763719, 
            fields: [
                { name: "🔑 Key System", value: `\`${KEY_SYSTEM_STATUS}\``, inline: true },
                { name: "📜 Script Status", value: `\`${SCRIPT_STATUS}\``, inline: true },
                { name: "🛡️ Banwave Status", value: `\`${BANWAVE_STATUS}\``, inline: true },
                { name: "💻 Platform", value: `\`${PLATFORM}\``, inline: true },
                { name: "🎮 Current Roblox Version", value: `\`${robloxVersion}\``, inline: false }
            ],
            footer: { text: "Auto-Tracker • Refreshes every 60s" }
        }]
    };

    let messageId = getSavedStatusMessageId();

    try {
        if (!messageId) {
            const res = await axios.post(`${STATUS_WEBHOOK_URL}?wait=true`, payload);
            saveStatusMessageId(res.data.id);
            console.log(`[${new Date().toLocaleTimeString()}] Created new status embed in channel ${STATUS_CHANNEL_ID}.`);
        } else {
            await axios.patch(`${STATUS_WEBHOOK_URL}/messages/${messageId}`, payload);
            console.log(`[${new Date().toLocaleTimeString()}] Status embed refreshed in channel ${STATUS_CHANNEL_ID}.`);
        }
    } catch (error) {
        if (error.response?.status === 404 || error.response?.data?.code === 10008) {
            console.log("Saved status message was deleted in Discord. Recreating...");
            try {
                const res = await axios.post(`${STATUS_WEBHOOK_URL}?wait=true`, payload);
                saveStatusMessageId(res.data.id);
            } catch (innerErr) {
                console.error("Failed to recreate status message:", innerErr.message);
            }
        } else {
            console.error("Failed to update status embed:", error.response?.data || error.message);
        }
    }
}

// 2. Roblox Version Notifier (#roblox-updates channel)
async function runUpdateTracker() {
    const currentVersion = await fetchRobloxVersion();
    if (currentVersion === "Unavailable") return;

    const lastVersion = getLastSavedVersion();

    if (!lastVersion) {
        console.log(`[Tracker Initialized] Tracking version: ${currentVersion}`);
        saveCurrentVersion(currentVersion);
        return;
    }

    if (currentVersion !== lastVersion) {
        console.log(`[ROBLOX UPDATE DETECTED!] Old: ${lastVersion} -> New: ${currentVersion}`);
        const timestamp = Math.floor(Date.now() / 1000);

        try {
            await axios.post(UPDATES_WEBHOOK_URL, {
                content: "@everyone",
                embeds: [{
                    title: "🚨 LIVE UPDATE DETECTED!",
                    description: `A new ROBLOX client version is out. **VRHANDS** scripts are being verified.\n\n**Platform:** Windows\n**Roblox Version:** \`${currentVersion}\`\n**Detected:** <t:${timestamp}:F>`,
                    color: 15158332,
                    footer: { text: "Roblox Update Predictor • Auto-Notifier" }
                }]
            });
            console.log(`Update alert sent to channel ${UPDATES_CHANNEL_ID}!`);
        } catch (err) {
            console.error("Failed to send update alert:", err.message);
        }

        saveCurrentVersion(currentVersion);
    }
}

// Start ecosystem
console.log("Starting VRHANDS Multi-Channel Ecosystem...");
runStatusUpdater();
runUpdateTracker();

setInterval(runStatusUpdater, 60000); // Status refreshes every 60s
setInterval(runUpdateTracker, 30000);  // Version checker runs every 30s