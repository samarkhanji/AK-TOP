module.exports.config = {
    name: "warning",
    version: "1.0.2",
    hasPermssion: 0,
    credits: "Aman Khan",
    description: "Auto warning system for bad words against bot",
    commandCategory: "noprefix",
    usages: "Auto trigger when someone abuses bot",
    cooldowns: 0
};

module.exports.handleEvent = async function({ api, event, Users }) {
    try {
        const { threadID, messageID, senderID, body } = event;
        if (!body) return;

        const selfID = api.getCurrentUserID && api.getCurrentUserID();
        if (senderID == selfID) return;

        const triggerWords = [
            "bot chutiya hai", "bot gandu", "bot jhantu", 
            "lund bot", "bot bc", "bot mc", "bot madarchod",
            "bot chutiye", "bot randi", "bot chinar", 
            "bot lol",
        ];

        const messageText = body.toLowerCase().trim();
        const hasTrigger = triggerWords.some(w => messageText.includes(w));
        if (!hasTrigger) return;

        // ❌ Reaction
        try {
            api.setMessageReaction("❌", messageID, () => {}, true);
        } catch {}

        // User name
        let userName = "User";
        try {
            const n = await Users.getNameUser(senderID);
            if (n) userName = n;
        } catch {}

        // Warning messages
        const warnings = [
            `${userName} tune gali kaise di? 😡`,
            "HATT TERRI BEHAN KI CHUT FAD KE KUTTO KHILAO RAND KE",
            "APNI AMMA SE PUCHH KISSE CHUDI HAI AAJ JHANT KE BAAL",
            "TERIII BEHANNN KO CHOD KE PAGAL KRDUGA RANDI",
            "ARE JHANT KE BAAL TU ITNA BADA HO GAYA APNE BAAP KO ABOUSE KREGA",
            "JAHA SE NIKLA HAI USI ME DAL DUGA JHANTU",
            "GAND ME AGR JIYADA KHUJLI HAI TO ID ME AA JANA",
            "CHAL DFA HO RANDI KE",
        ];

        // Sab warnings line by line bhejna with mention
        for (let msg of warnings) {
            await new Promise(resolve => {
                api.sendMessage({
                    body: `@${userName} ${msg}`,
                    mentions: [{ tag: `@${userName}`, id: senderID, fromIndex: 0 }]
                }, threadID, () => resolve());
            });
            await new Promise(r => setTimeout(r, 1200)); // 1.2s delay
        }

        // Final message with mention
        setTimeout(async () => {
            await new Promise(resolve => {
                api.sendMessage({
                    body: `@${userName} LERE LUND KE YE APNA GROUP APNI GAND ME DAL LENA AB BOT EXIT 😎😈`,
                    mentions: [{ tag: `@${userName}`, id: senderID, fromIndex: 0 }]
                }, threadID, () => resolve());
            });

            // Bot leave group
            setTimeout(() => {
                try {
                    const myId = api.getCurrentUserID();
                    api.removeUserFromGroup(myId, threadID, () => {});
                } catch (e) {
                    console.log("[warning] leave error:", e.message);
                }
            }, 1000);
        }, 1500);

    } catch (err) {
        console.log("[warning] handleEvent error:", err.message);
    }
};

module.exports.run = async function({ api, event }) {
    const helpMessage = `⚠️ WARNING SYSTEM ACTIVE! 🤖\n\n✅ Bot protection enabled\n🚫 Gali galoch not allowed\n❌ Auto multiple warnings\n👋 Bot will leave if abused\n\n💡 Bot ko respect karo!`;
    return api.sendMessage(helpMessage, event.threadID, event.messageID);
};
