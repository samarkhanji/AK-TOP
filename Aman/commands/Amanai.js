const axios = require("axios");

module.exports.config = {
  name: "cheeku",
  version: "2.0.0",
  hasPermssion: 0,
  credits: "Aman Khan",
  description: "Racing AI Roaster for Messenger",
  commandCategory: "fun",
  usages: "bot [message]",
  cooldowns: 2,
};

module.exports.handleEvent = async function ({ api, event, Users }) {
  const { threadID, messageID, body, senderID } = event;
  if (!body) return;

  // Case-insensitive check: 
  const triggerWord = "bot";
  if (body.toLowerCase().includes(triggerWord)) {
    
    // 1. Message Reaction: ☠️
    api.setMessageReaction("☠️", messageID, () => {}, true);

    try {
      
      const userData = await Users.getData(senderID);
      const name = userData.name || "User";

      const res = await axios.get(`https://aman-ai.onrender.com/aman?prompt=${encodeURIComponent(body)}`);
      const respond = res.data.reply;

      const messageToSend = `✨ ${name} ✨
✿━━━━━━━━⊱💖⊰━━━━━━━━✿

${respond}

✿━━━━━━━━⊱🌺⊰━━━━━━━━✿
★᭄𝐎𝐰𝐧𝐞𝐫★ 🕊️⃝𝗦𝘂𝗵𝗲𝗯ᯓ ⚔️⏤͟͟͞͞★`;

      // 2. Reply to user
      return api.sendMessage(messageToSend, threadID, messageID);

    } catch (error) {
      console.error("API Error:", error);
      return api.sendMessage("Bhai mera dimaag garam hai abhi, baad mein aana! 💀", threadID, messageID);
    }
  }
};

module.exports.run = async function ({ api, event }) {
};
