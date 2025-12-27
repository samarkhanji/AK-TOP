const axios = require('axios');

module.exports.config = {
    name: "keepalive",
    version: "1.1.0",
    hasPermssion: 2, // Admin only
    credits: "Aman Khan",
    description: "Render server ko awake rakhta hai",
    commandCategory: "System",
    usages: "keepalive [on/off/status/test]",
    cooldowns: 5
};

let keepAliveInterval = null;
const RENDER_URL = "https://ak-top-1w.onrender.com"; // Render link (hidden in output)

async function pingServer() {
    try {
        const response = await axios.get(RENDER_URL + "/ping", {
            timeout: 10000,
            headers: { 'User-Agent': 'Mirai-KeepAlive/1.0' }
        });
        console.log(`✅ Keep-alive ping successful: ${response.status}`);
        return true;
    } catch (error) {
        console.error(`❌ Keep-alive ping failed:`, error.message);
        return false;
    }
}

function startKeepAlive() {
    if (keepAliveInterval) clearInterval(keepAliveInterval);
    keepAliveInterval = setInterval(pingServer, 5 * 60 * 1000); // 5 min
    console.log("🚀 Keep-alive system started (5-minute intervals)");
    setTimeout(pingServer, 5000); // Initial ping after 5 sec
}

function stopKeepAlive() {
    if (keepAliveInterval) {
        clearInterval(keepAliveInterval);
        keepAliveInterval = null;
        console.log("⏹️ Keep-alive system stopped");
        return true;
    }
    return false;
}

module.exports.run = async function({ api, event, args }) {
    const { threadID, messageID } = event;
    const action = args[0] ? args[0].toLowerCase() : 'status';

    try {
        switch (action) {
            case 'on':
            case 'start':
                startKeepAlive();
                api.sendMessage(
                    "✅ Keep-Alive System Started!\n\n" +
                    "⏰ Ping Interval: 5 minutes\n" +
                    "🚀 Bot will stay awake on Render!\n\n" +
                    "Commands:\n" +
                    "• /keepalive off - Stop system\n" +
                    "• /keepalive test - Test ping\n" +
                    "• /keepalive status - Check status\n\n" +
                    "°•••••••••••_𝙊𝙬𝙣𝙚𝙧 𝘼𝙆_•••••••••••°",
                    threadID, messageID
                );
                break;

            case 'off':
            case 'stop':
                const stopped = stopKeepAlive();
                api.sendMessage(
                    stopped ?
                    "⏹️ Keep-Alive System Stopped!\n\nBot may sleep after 15 minutes of inactivity.\n\n°•••••••••••_𝙊𝙬𝙣𝙚𝙧 𝘼𝙆_•••••••••••°" :
                    "⚠️ Keep-Alive was not running!\n\nUse /keepalive on to start.\n\n°•••••••••••_𝙊𝙬𝙣𝙚𝙧 𝘼𝙆_•••••••••••°",
                    threadID, messageID
                );
                break;

            case 'test':
                api.sendMessage("🔄 Testing server ping...", threadID);
                const success = await pingServer();
                setTimeout(() => {
                    api.sendMessage(
                        success ?
                        "✅ Ping Test Successful!\n\nServer is responding properly.\n\n°•••••••••••_𝙊𝙬𝙣𝙚𝙧 𝘼𝙆_•••••••••••°" :
                        "❌ Ping Test Failed!\n\nCheck server status or network connection.\n\n°•••••••••••_𝙊𝙬𝙣𝙚𝙧 𝘼𝙆_•••••••••••°",
                        threadID, messageID
                    );
                }, 2000);
                break;

            case 'status':
            default:
                const isRunning = keepAliveInterval !== null;
                const uptime = process.uptime();
                const memory = process.memoryUsage();

                api.sendMessage(
                    `📊 Keep-Alive System Status:\n\n` +
                    `🔄 Status: ${isRunning ? '✅ Running' : '❌ Stopped'}\n` +
                    `⏰ Interval: ${isRunning ? '5 minutes' : 'Not running'}\n` +
                    `⏱️ Bot Uptime: ${Math.floor(uptime / 3600)}h ${Math.floor((uptime % 3600) / 60)}m\n` +
                    `💾 Memory: ${Math.round(memory.heapUsed / 1024 / 1024)}MB\n\n` +
                    `💡 Tip: Keep this ON to prevent Render sleep!\n\n` +
                    `°•••••••••••_𝙊𝙬𝙣𝙚𝙧 𝘼𝙆_•••••••••••°`,
                    threadID, messageID
                );
        }
    } catch (error) {
        console.error("Keep-alive command error:", error);
        api.sendMessage(
            "❌ Keep-alive command failed!\n\nCheck console for error details.\n\n°•••••••••••_𝙊𝙬𝙣𝙚𝙧 𝘼𝙆_•••••••••••°",
            threadID, messageID
        );
    }
};
