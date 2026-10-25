const axios = require('axios');

const WEBHOOK_URL = "https://discord.com/api/webhooks/1563983611114291400/FJ11dvYY1z7Q9-w8ki2VMk_8KRro9DZ06FvztFInayxPZIKRgpSXiofZbR1bixdvf17I";

async function initStatus() {
    try {
        // Sends the initial message and requests ?wait=true to get the Message ID back
        const response = await axios.post(`${WEBHOOK_URL}?wait=true`, {
            embeds: [{
                title: "⚡ REAL - Live System Status",
                description: "Initializing status tracker...",
                color: 5763719
            }]
        });

        const messageId = response.data.id;
        console.log(`SUCCESS! Your MESSAGE_ID is: ${messageId}`);
        console.log("Save this ID to start updating your live status embed!");
    } catch (error) {
        console.error("Error initializing status:", error.response?.data || error.message);
    }
}

initStatus();