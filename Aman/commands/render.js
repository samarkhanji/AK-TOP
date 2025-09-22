const axios = require("axios");

module.exports.config = {
    name: "render",
    version: "1.0.0",
    hasPermssion: 0, // normal users ke liye bhi allowed
    credits: "Aman Khan",
    description: "Manage Render keepalive links",
    commandCategory: "system",
    usages: "/render [add|status|delete|all]",
    cooldowns: 5
};

// KeepAlive API ka base URL
const API_URL = "https://keep-alive-pm41.onrender.com";

module.exports.run = async function({ api, event, args }) {
    const { threadID, senderID, messageID } = event;

    if (args.length < 1) {
        return api.sendMessage("⚠️ Usage:\n/render add [url]\n/render status [code]\n/render delete [code]\n/render all (admin only)", threadID, messageID);
    }

    const action = args[0].toLowerCase();

    try {
        // --- ADD command ---
        if (action === "add") {
            const url = args[1];
            if (!url) return api.sendMessage("⚠️ Please provide a link!\nExample: /render add https://xyz.onrender.com", threadID, messageID);

            const res = await axios.post(`${API_URL}/add`, { url });
            if (res.data.success) {
                return api.sendMessage(`✅ Link added!\n🔗 ${url}\n📌 Code: ${res.data.code}\nStatus: ${res.data.status}\n⏱️ Response: ${res.data.responseTime}ms`, threadID, messageID);
            } else {
                return api.sendMessage(`❌ Failed: ${res.data.message}`, threadID, messageID);
            }
        }

        // --- STATUS command ---
        if (action === "status") {
            const code = args[1];
            if (!code) return api.sendMessage("⚠️ Please provide a code!\nExample: /render status ABC123", threadID, messageID);

            const res = await axios.get(`${API_URL}/status/${code}`);
            if (res.data.success) {
                const d = res.data.data;
                return api.sendMessage(
                    `📊 Link Status:\n\n🔗 ${d.url}\n📌 Code: ${d.code}\n⚡ Status: ${d.status}\n⏱️ Response: ${d.responseTime}\n✅ Success Rate: ${d.successRate}\n📆 Added: ${d.addedAt}\n🕒 Uptime: ${d.uptime}`, 
                    threadID, messageID
                );
            } else {
                return api.sendMessage(`❌ ${res.data.message}`, threadID, messageID);
            }
        }

        // --- USER DELETE command ---
        if (action === "delete") {
            const code = args[1];
            if (!code) return api.sendMessage("⚠️ Please provide a code!\nExample: /render delete ABC123", threadID, messageID);

            const res = await axios.delete(`${API_URL}/delete/${code}`);
            if (res.data.success) {
                return api.sendMessage(`🗑️ Deleted link:\n🔗 ${res.data.deletedUrl}`, threadID, messageID);
            } else {
                return api.sendMessage(`❌ ${res.data.message}`, threadID, messageID);
            }
        }

        // --- ADMIN ONLY: ALL STATUS ---
        if (action === "all") {
            if (!global.config.ADMINBOT.includes(senderID)) {
                return api.sendMessage("❌ Only admin can use this command!", threadID, messageID);
            }

            const res = await axios.get(`${API_URL}/all`);
            if (res.data.success) {
                let msg = `📊 All Links Status:\n\nTotal: ${res.data.stats.totalLinks}\nActive: ${res.data.stats.activeLinks}\nOffline: ${res.data.stats.offlineLinks}\n\n`;
                res.data.links.forEach((link, i) => {
                    msg += `${i+1}. ${link.url}\n   Code: ${link.code}\n   Status: ${link.status}\n   Response: ${link.responseTime}\n   Uptime: ${link.uptime}\n   Success: ${link.successRate}\n\n`;
                });
                return api.sendMessage(msg, threadID, messageID);
            } else {
                return api.sendMessage("❌ Failed to fetch links!", threadID, messageID);
            }
        }

        // Agar unknown action hai
        return api.sendMessage("⚠️ Invalid command!\nUse: add | status | delete | all", threadID, messageID);

    } catch (err) {
        console.error("Render command error:", err);
        return api.sendMessage("❌ API request failed. Check logs or server.", threadID, messageID);
    }
};
