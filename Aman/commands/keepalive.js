const axios = require('axios');

module.exports.config = {
    name: "keepalive",
    version: "1.0.0",
    hasPermssion: 2,
    credits: "Aman Khan",
    description: "Render server ko awake rakhta hai",
    commandCategory: "System",
    usages: "/keepalive [on/off/status/test]",
    cooldowns: 5
};

let keepAliveInterval = null;
const RENDER_URL = "https://ak-bot-8qqx.onrender.com";

async function pingServer() {
    try {
        const res = await axios.get(RENDER_URL + "/ping", { timeout: 10000 });
        console.log(`✅ Ping OK: ${res.status}`);
        return true;
    } catch (e) {
        console.error(`❌ Ping fail: ${e.message}`);
        return false;
    }
}

function startKeepAlive() {
    if (keepAliveInterval) clearInterval(keepAliveInterval);

    keepAliveInterval = setInterval(() => pingServer(), 5 * 60 * 1000); // 5min
    console.log("🚀 Keep-alive started (5min interval)");

    setTimeout(() => pingServer(), 5000); // First ping after 5s
}

function stopKeepAlive() {
    if (keepAliveInterval) {
        clearInterval(keepAliveInterval);
        keepAliveInterval = null;
        return true;
    }
    return false;
}

module.exports.run = async function({ api, event, args }) {
    const { threadID } = event;
    const action = (args[0] || "status").toLowerCase();

    switch (action) {
        case "on":
            startKeepAlive();
            return api.sendMessage("✅ Keep-Alive Started (5min interval)", threadID);

        case "off":
            return api.sendMessage(
                stopKeepAlive() ? "⏹️ Keep-Alive Stopped" : "⚠️ Already stopped",
                threadID
            );

        case "test":
            return api.sendMessage(
                (await pingServer()) ? "✅ Ping OK" : "❌ Ping Failed",
                threadID
            );

        default:
            return api.sendMessage(
                `📊 Status: ${keepAliveInterval ? "✅ Running" : "❌ Stopped"}\n\n` +
                `Commands:\n/keepalive on\n/keepalive off\n/keepalive test`,
                threadID
            );
    }
};
