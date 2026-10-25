const axios = require('axios');

const WEBHOOK_URL = "https://discord.com/api/webhooks/1563983611114291400/FJ11dvYY1z7Q9-w8ki2VMk_8KRro9DZ06FvztFInayxPZIKRgpSXiofZbR1bixdvf17I";
const MESSAGE_ID = "1563986632170807347";
const EDIT_URL = `${WEBHOOK_URL}/messages/${MESSAGE_ID}`;

// --- CONFIGURABLE STATUS SETTINGS ---
const KEY_SYSTEM_STATUS = "🟢 Operational";
const SCRIPT_STATUS = "🟢 Working & Undetected";
const BANWAVE_STATUS = "🟢 Safe / No Banwave";
const PLATFORM = "Windows 10 / 11";
// -----------------------------------

async function getRobloxVersion() {
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

async function updateLiveStatus() {
    const robloxVersion = await getRobloxVersion();
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

    try {
        await axios.patch(EDIT_URL, payload);
        console.log(`[${new Date().toLocaleTimeString()}] Status embed synced.`);
    } catch (error) {
        console.error("Failed to update status embed:", error.response?.data || error.message);
    }
}

console.log("Status Embed Updater started...");
updateLiveStatus();
setInterval(updateLiveStatus, 60000);