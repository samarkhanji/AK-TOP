const axios = require("axios");

module.exports.config = {
    name: "keepalive-event",
    eventType: ["log:unsubscribe", "log:subscribe"],
    version: "1.0.0",
    credits: "Aman Khan",
    description: "Auto keep-alive ping jab koi join/leave kare"
};

const RENDER_URL = "https://ak-bot-8qqx.onrender.com"; // apna render link
let lastPing = 0;
const PING_INTERVAL = 4 * 60 * 1000; // 4min

module.exports.run = async function() {
    const now = Date.now();
    if (now - lastPing < PING_INTERVAL) return;

    try {
        await axios.get(RENDER_URL + "/ping");
        console.log("✅ Auto keep-alive ping sent");
        lastPing = now;
    } catch (e) {
        console.error("❌ Auto ping failed:", e.message);
    }
};
