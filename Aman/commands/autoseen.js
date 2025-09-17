module.exports.config = {
  name: "autoseen",
  version: "1.0.0",
  hasPermssion: 0,
  credits: "Aman",
  description: "Auto seen all messages",
  commandCategory: "system",
  cooldowns: 0,
};

module.exports.handleEvent = async function({ api, event }) {
  try {
    if (event && event.threadID && event.messageID) {
      api.markAsRead(event.threadID, () => {});
    }
  } catch (e) {
    console.error("Autoseen error:", e);
  }
};

module.exports.run = async function() {};
