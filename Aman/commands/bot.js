const axios = require("axios");

module.exports.config = {
  name: "bot",
  version: "5.0.0",
  hasPermssion: 0,
  credits: "Aman Khan",
  description: "Multiple Character Bot AI System",
  commandCategory: "no prefix",
  usages: "no prefix",
  cooldowns: 2,
};

// Character Database
const characters = {
  devil: {
    name: "Devil",
    personality: "dark, mysterious, powerful, commanding",
    style: "attitude with dark humor",
    emoji: "🔥"
  },
  pikachu: {
    name: "Pikachu",
    personality: "cute, energetic, playful, electric",
    style: "kawaii and bubbly",
    emoji: "⚡"
  },
  angel: {
    name: "Angel",
    personality: "pure, caring, divine, peaceful",
    style: "sweet and heavenly",
    emoji: "🤍"
  },
  princess: {
    name: "Princess",
    personality: "elegant, royal, graceful, sophisticated",
    style: "classy and refined",
    emoji: "👑"
  },
  savage: {
    name: "Zui",
    personality: "bold, fearless, Romantic, straightforward, badass",
    style: "roasting and confident",
    emoji: "🔥"
  },
  cutie: {
    name: "Cutie",
    personality: "adorable, innocent, sweet, loving",
    style: "childlike and pure",
    emoji: "🐻‍❄️"
  },
  queen: {
    name: "Queen",
    personality: "dominant, confident, powerful, majestic",
    style: "boss lady energy",
    emoji: "👑"
  },
  flirt: {
    name: "Flirt",
    personality: "romantic, charming, seductive, playful",
    style: "flirty and teasing",
    emoji: "💭"
  },
  bro: {
    name: "Bro",
    personality: "friendly, casual, supportive, chill",
    style: "buddy and cool",
    emoji: "🫧"
  },
  genius: {
    name: "Genius",
    personality: "intelligent, witty, logical, smart",
    style: "clever and analytical",
    emoji: "🦋"
  }
};

module.exports.handleEvent = async function ({ api, event }) {
  const { threadID, messageID, body, senderID, messageReply } = event;
  if (!body || senderID == api.getCurrentUserID()) return;

  const lowerBody = body.toLowerCase();
  
  // Check if message contains both "sony" and "bot" - if yes, block reply
  if (lowerBody.includes("sony") && lowerBody.includes("bot")) {
    return;
  }
  
  // Check if this is a reply to a message containing the owner tag - if yes, block reply
  if (messageReply && messageReply.body && messageReply.body.includes("*★᭄𝐎𝐰𝐧𝐞𝐫 𝐀 𝐊 ⚔️⏤͟͟͞͞★*")) {
    return;
  }

  // Character selection logic
  let selectedCharacter = null;
  
  // Check for specific character names
  for (const [key, char] of Object.entries(characters)) {
    if (lowerBody.includes(key)) {
      selectedCharacter = char;
      break;
    }
  }
  
  // If "bot" mentioned but no specific character, select random
  if (!selectedCharacter && lowerBody.includes("bot")) {
    const charKeys = Object.keys(characters);
    const randomKey = charKeys[Math.floor(Math.random() * charKeys.length)];
    selectedCharacter = characters[randomKey];
  }
  
  // If no character selected, return
  if (!selectedCharacter) {
    return;
  }

  try {
    // Set reaction
    api.setMessageReaction("🌿", messageID, () => {}, true);

    const userInfo = await api.getUserInfo(senderID);
    const userName = userInfo[senderID]?.name || "User";

    // Create character-specific prompt
    let prompt = `You are ${selectedCharacter.name} character with personality: ${selectedCharacter.personality}. 
Your response style: ${selectedCharacter.style}. 
User message: "${body}". 
User name: ${userName}.

Rules:
- Reply as ${selectedCharacter.name} character only
- Keep response 20-35 words maximum
- Use ${selectedCharacter.style} tone
- No AI explanations or formal talk
- Direct, smart, and Funny line send and engaging reply
- Always reply in Hindi type in English alphabet (Roman/Hinglish) - NO Devanagari script
- If thinking in Hindi, write it as: "Tum bahut cute ho" not "तुम बहुत क्यूट हो"
- Be authentic to ${selectedCharacter.name}'s personality
- No long explanations, just pure character response`;

    const encoded = encodeURIComponent(prompt);

    // Pollinations API call
    const res = await axios.get(`https://text.pollinations.ai/${encoded}`, {
      headers: {
        "User-Agent": "CharacterBot/5.0",
        "Accept": "application/json, text/plain, */*",
      },
      timeout: 10000,
      validateStatus: (status) => status >= 200 && status < 300,
    });

    let reply = typeof res.data === "string" ? res.data.trim() : `${selectedCharacter.name} mode activated! ⋆.°🦋༘⋆`;

    // Ensure reply is within word limit
    const words = reply.split(' ');
    if (words.length > 35) {
      reply = words.slice(0, 35).join(' ') + '...';
    }

    if (!reply || reply.length < 10) {
      // Character-specific fallback replies
      const fallbacks = {
        Devil: ["Darkness speaks through me 🔥", "Your soul calls to the shadows ⋆.°🦋༘⋆"],
        Pikachu: ["Pika pika! Energy overload ⚡", "Thunder and cuteness combined 🤍"],
        Angel: ["Heaven's blessing upon you 🪽", "Divine light surrounds us 🤍"],
        Arincess: ["Royal grace in every word 👑", "Elegance is my language 💭"],
        Zui: ["Ready to roast or toast? 🔥", "Zui mode: activated ⋆.°🦋༘⋆"],
        Cutie: ["Aww, you're so sweet 🐻‍❄️", "Cuteness overload incoming 🫧"],
        Queen: ["Bow down to the queen 👑", "Royalty runs in my code 🔥"],
        Flirt: ["Someone's being naughty 💭", "Flirty vibes activated ⋆.°🦋༘⋆"],
        Bro: ["Bro code activated 🫧", "Chill vibes only 🤍"],
        Genius: ["Intelligence level: maximum 🦋", "Smart reply processing 💭"]
      };
      
      const charKey = Object.keys(characters).find(key => characters[key] === selectedCharacter);
      const charFallbacks = fallbacks[charKey] || ["Character mode activated ⋆.°🦋༘⋆"];
      reply = charFallbacks[Math.floor(Math.random() * charFallbacks.length)];
    }

    // Format final message
    const decorativeEmojis = ["⋆.°🦋༘⋆", "❀˖°", "🤍🪽", "☁︎", "🐻‍❄️", "🫧", "💭"];
    const randomEmoji = decorativeEmojis[Math.floor(Math.random() * decorativeEmojis.length)];

    const finalMsg = `💕⃝🕊️ ${userName} 💕⃝🕊️
•••••••••••••••••••••••••••••••••
${reply}
───⋆⋅☆⋅⋆────⋆⋅☆⋅⋆──
${randomEmoji} I AM ${selectedCharacter.name}

✮⃝❤𝙊𝙬𝙣𝙚𝙧 𝘼𝙆ᯓ ✈︎`;

    return api.sendMessage(finalMsg, threadID, messageID);
    
  } catch (error) {
    console.error("Character Bot error:", error);

    // Character-specific error messages
    const errorReplies = [
      "System glitch... but character remains strong ⋆.°🦋༘⋆",
      "Connection lost but personality intact 🤍",
      "Error detected... switching to backup mode 🫧",
      "Technical issue... character mode still active 💭"
    ];
    
    const randomError = errorReplies[Math.floor(Math.random() * errorReplies.length)];
    
    const errorMsg = `💕⃝🕊️ @${event.senderID} 💕⃝🕊️
•••••••••••••••••••••••••••••••••
${randomError}
───⋆⋅☆⋅⋆────⋆⋅☆⋅⋆──
🔥${selectedCharacter ? selectedCharacter.name : 'System'}

*★᭄𝐎𝐰𝐧𝐞𝐫 𝐀 𝐊 ⚔️⏤͟͟͞͞★*`;
    
    return api.sendMessage(errorMsg, threadID, messageID);
  }
};

module.exports.run = async function ({ api, event, args }) {
  if (args.length === 0) {
    const charList = Object.values(characters).map(char => `${char.emoji} ${char.name}`).join('\n');
    
    return api.sendMessage(`🤖 Character Bot System:\n\n📝 Available Characters:\n${charList}\n\n💡 Usage:\n• Type "bot" for random character\n• Type character name for specific one\n• Reply to character messages\n\n✮⃝❤𝙊𝙬𝙣𝙚𝙧 𝘼𝙆ᯓ ✈︎`, event.threadID, event.messageID);
  }
  return;
};
