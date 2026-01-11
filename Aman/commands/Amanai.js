const axios = require("axios");

// =================================================================
// ⚙️ API KEYS CONFIGURATION (.env se lega)
// =================================================================
const KEYS = {
  active: [
    process.env.KEY1, 
    process.env.KEY2, 
    process.env.KEY3
  ].filter(Boolean),
  backup: process.env.KEY4
};

// =================================================================
// 🧹 CLEANER FUNCTION (AI ke faltu text hatane ke liye)
// =================================================================
function cleanReply(text) {
  if (!text) return text;
  return text
    .replace(/^Cheeku:/gi, "")  
    .replace(/^Bot:/gi, "")
    .replace(/^AI:/gi, "")
    .replace(/"/g, "")
    .trim();
}

// =================================================================
// 🏎️ RACING LOGIC (Speed Beast)
// =================================================================
async function makeRequest(key, model, prompt) {
  return axios.post(
    "https://openrouter.ai/api/v1/chat/completions",
    {
      model: model,
      messages: [
        {
          role: "system",
          content: `You are Cheeku, a real Indian Girl (Not an AI).
          
          === BEHAVIOR RULES ===
          1. ACT LIKE A HUMAN: Short, natural, and smart replies (Max 3-4 lines).
          2. TONE:
             - If user is nice: Be cute, respectful, and friendly.
             - If user is abusive (Gali): Reply back with Gali/Roasting instantly.
             - If user acts smart: Be savage.
          3. STRICTLY NO AI TALK: Never say "I am an AI" or "I am a language model".
          4. LANGUAGE: Hinglish (Hindi written in English).
          
          Reply directly to the user.`
        },
        { role: "user", content: prompt }
      ],
      temperature: 0.85, // Thoda creative aur human-like
      max_tokens: 150
    },
    {
      headers: {
        "Authorization": `Bearer ${key}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://facebook.com",
        "X-Title": "CheekuBot"
      },
      timeout: 8000 // 8 second timeout
    }
  ).then(res => {
    const reply = res.data.choices[0].message.content;
    if (!reply) throw new Error("Empty");
    return cleanReply(reply);
  });
}

async function getRacingResponse(body) {
  const models = ["google/gemini-2.0-flash-exp:free", "xiaomi/mimo-v2-flash:free"];
  
  // 🏁 Race 1: Active Keys
  const race1 = [];
  if (KEYS.active.length > 0) {
    KEYS.active.forEach(key => {
      models.forEach(model => {
        race1.push(makeRequest(key, model, body));
      });
    });
  }

  try {
    // Jo pehle reply karega wo jeetega
    return await Promise.any(race1);
  } catch (err) {
    // 🏁 Race 2: Backup Key (Agar active fail ho jaye)
    if (KEYS.backup) {
      const race2 = [];
      models.forEach(model => {
        race2.push(makeRequest(KEYS.backup, model, body));
      });
      try {
        return await Promise.any(race2);
      } catch (backupErr) {
        return "Mera net slow hai yar, thodi der baad baat krna! 😤";
      }
    } else {
      return "Bot abhi so raha hai (No Keys)! 😴";
    }
  }
}

// =================================================================
// 🤖 MIRAI COMMAND CONFIG
// =================================================================
module.exports.config = {
  name: "cheeku",
  version: "2.1.0",
  hasPermssion: 0,
  credits: "Aman Khan",
  description: "Cheeku AI (Direct Racing Logic)",
  commandCategory: "fun",
  usages: "Just say 'bot' or tag reply",
  cooldowns: 2,
};

module.exports.handleEvent = async function ({ api, event, Users }) {
  const { threadID, messageID, body, senderID, messageReply } = event;
  if (!body) return;

  const triggerWord = "bot";
  const uniqueChar = "◉⁠‿⁠◉"; // Ye character detect karega ki ye bot ka reply hai

  // Logic: Message me 'bot' ho YA fir bot ke message (jispe unique char ho) ka reply ho
  const isTrigger = body.toLowerCase().includes(triggerWord);
  const isReplyToBot = messageReply && messageReply.body && messageReply.body.includes(uniqueChar);

  if (isTrigger || isReplyToBot) {
    
    // 1. Message Reaction: 💜
    api.setMessageReaction("💜", messageID, () => {}, true);

    try {
      const userData = await Users.getData(senderID);
      const name = userData.name || "User";

      // 2. Get Response (Racing Logic)
      const respond = await getRacingResponse(body);

      // 3. Format Message
      const messageToSend = `✨ ${name} ✨
✿━━━━━━━━⊱💖⊰━━━━━━━━✿

${respond} ${uniqueChar}

✿━━━━━━━━⊱🌺⊰━━━━━━━━✿
★᭄𝐎𝐰𝐧𝐞𝐫★ 🕊️⃝𝗦𝘂𝗵𝗲𝗯ᯓ ⚔️⏤͟͟͞͞★`;

      // 4. Send Reply
      return api.sendMessage(messageToSend, threadID, messageID);

    } catch (error) {
      console.error("Cheeku Error:", error);
    }
  }
};

module.exports.run = async function ({ api, event }) {
  // Manual run logic if needed
};
