const axios = require('axios');
const fs = require('fs');

// --- CONFIGURATION FOR UPDATES SERVER ---
const UPDATES_WEBHOOK_URL = "YOUR_UPDATES_SERVER_WEBHOOK_URL";
// ----------------------------------------

const VERSION_FILE = './last_tracked_version.json';

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

async function checkRobloxUpdates() {
    try {
        const response = await axios.get("https://clientsettingscdn.roblox.com/v2/client-version/WindowsPlayer", {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
            timeout: 5000
        });
        
        const currentVersion = response.data.clientVersionUpload;
        if (!currentVersion) return;

        const lastVersion = getLastSavedVersion();

        // If it's the very first run, just save the version without spamming an alert
        if (!lastVersion) {
            console.log(`[Tracker Initialized] Current version tracked: ${currentVersion}`);
            saveCurrentVersion(currentVersion);
            return;
        }

        // Detect a brand new version!
        if (currentVersion !== lastVersion) {
            console.log(`[ROBLOX UPDATE DETECTED!] Old: ${lastVersion} -> New: ${currentVersion}`);
            
            const timestamp = Math.floor(Date.now() / 1000);

            // Send notification to the Roblox updates server webhook
            await axios.post(UPDATES_WEBHOOK_URL, {
                content: "@everyone", // Optional ping for your updates server
                embeds: [{
                    title: "🚨 LIVE UPDATE DETECTED!",
                    description: `A new ROBLOX client version is out. **VRHANDS** scripts are being verified.\n\n**Platform:** Windows\n**Roblox Version:** \`${currentVersion}\`\n**Detected:** <t:${timestamp}:F>`,
                    color: 15158332, // Red warning color
                    footer: {
                        text: "Roblox Update Predictor • Auto-Notifier"
                    }
                }]
            });

            // Save the new version so it doesn't alert twice
            saveCurrentVersion(currentVersion);
        } else {
            console.log(`[Checked] No update yet. Current: ${currentVersion}`);
        }

    } catch (error) {
        console.error("Tracker API Error:", error.message);
    }
}

// Run immediately, then check every 30 seconds
console.log("Roblox Update Predictor Tracker started...");
checkRobloxUpdates();
setInterval(checkRobloxUpdates, 30000);