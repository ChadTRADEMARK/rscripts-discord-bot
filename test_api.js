const axios = require('axios');

async function test() {
    try {
        const response = await axios.get("https://clientsettingscdn.roblox.com/v2/client-version/WindowsPlayer", {
            headers: { 'User-Agent': 'Mozilla/5.0' },
            timeout: 5000
        });
        console.log("FULL API RESPONSE:", response.data);
    } catch (error) {
        console.error("API ERROR:", error.message);
    }
}

test();