module.exports.config = {
  name: "autoseen",
  version: "2.0.0",
  hasPermssion: 0,
  credits: "Aman",
  description: "Automatically marks all messages as seen",
  commandCategory: "system",
  cooldowns: 0
};

module.exports.run = () => {}; // no command, background feature only

// Background listener
module.exports.handleEvent = async function ({ api, event }) {
  try {
    // Ignore bot's own messages
    if (event.senderID == api.getCurrentUserID()) return;

    // Mark thread as seen
    api.markAsSeen(event.threadID, (err) => {
      if (err) {
        console.error(`[AutoSeen] Error in thread ${event.threadID}:`, err.message);
      }
    });
  } catch (e) {
    console.error("[AutoSeen] Unexpected error:", e.message);
  }
};
