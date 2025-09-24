// ownerinfo.js
const axios = require('axios');
const fs = require('fs-extra');
const path = require('path');

module.exports.config = {
  name: "ownerinfo",
  version: "1.0.0",
  hasPermssion: 0,
  credits: "Aman Khan",
  description: "Send bot owner info (noprefix)",
  commandCategory: "noprefix",
  usages: "Automatic on keywords",
  cooldowns: 3
};

const KEYWORDS = [
  "bot owner",
  "owner",
  "bot kiska",
  "bot kisne",
  "bot admin",
  "admin",
  "bot kiska?"
].map(k => k.toLowerCase());

const IMAGE_URL = "https://i.supaimg.com/71fbc4ec-7a4d-4df0-aa21-2e98194ca31a.jpg";
const OWNER_TEXT = `😎⚔️𝐌𝐲 𝐎𝐰𝐧𝐞𝐫 𝐀𝐊𝟒𝟕⚔️😎\nID LINK https://www.facebook.com/Ak47xK`;

module.exports.handleEvent = async function({ api, event, Users }) {
  try {
    const { threadID, messageID, senderID, body } = event;
    if (!body) return;

    // ignore bot's own messages
    const selfID = typeof api.getCurrentUserID === "function" ? api.getCurrentUserID() : null;
    if (senderID == selfID) return;

    const text = body.toString().toLowerCase();

    // check keyword presence (word boundary-ish)
    const matched = KEYWORDS.some(k => {
      // check exact phrase or whole word occurrence
      return text.includes(k);
    });
    if (!matched) return;

    // reaction (best-effort)
    try {
      if (messageID && typeof api.setMessageReaction === "function") {
        api.setMessageReaction("⚔️", messageID, () => {}, true);
      }
    } catch (e) {
      console.log("[ownerinfo] reaction error:", e && e.message ? e.message : e);
    }

    // prepare cache folder
    const cacheDir = path.join(__dirname, '..', 'cache');
    await fs.ensureDir(cacheDir);
    const fileName = `owner_${Date.now()}.jpg`;
    const filePath = path.join(cacheDir, fileName);

    // download image
    try {
      const response = await axios.get(IMAGE_URL, { responseType: 'stream', timeout: 20000 });
      const writer = fs.createWriteStream(filePath);
      response.data.pipe(writer);
      await new Promise((resolve, reject) => {
        writer.on('finish', resolve);
        writer.on('error', reject);
      });
    } catch (downloadErr) {
      console.log("[ownerinfo] image download failed:", downloadErr && downloadErr.message ? downloadErr.message : downloadErr);
      // fallback: send text only
      return api.sendMessage(OWNER_TEXT, threadID, messageID);
    }

    // send message with image attachment
    try {
      await new Promise((resolve) => {
        api.sendMessage({
          body: OWNER_TEXT,
          attachment: fs.createReadStream(filePath)
        }, threadID, (err) => {
          if (err) console.log("[ownerinfo] sendMessage error:", err);
          resolve();
        });
      });
    } catch (sendErr) {
      console.log("[ownerinfo] send error:", sendErr && sendErr.message ? sendErr.message : sendErr);
    } finally {
      // cleanup
      try { await fs.remove(filePath); } catch (e) { /* ignore */ }
    }
  } catch (err) {
    console.log("[ownerinfo] handleEvent error:", err && err.message ? err.message : err);
  }
};

module.exports.run = async function({ api, event }) {
  // manual command: reply with owner info if someone uses command form
  const { threadID, messageID } = event;
  try {
    // send image + text similarly to event handler
    const cacheDir = path.join(__dirname, '..', 'cache');
    await fs.ensureDir(cacheDir);
    const fileName = `owner_manual_${Date.now()}.jpg`;
    const filePath = path.join(cacheDir, fileName);

    const response = await axios.get(IMAGE_URL, { responseType: 'stream', timeout: 20000 });
    const writer = fs.createWriteStream(filePath);
    response.data.pipe(writer);
    await new Promise((resolve, reject) => {
      writer.on('finish', resolve);
      writer.on('error', reject);
    });

    api.sendMessage({
      body: OWNER_TEXT,
      attachment: fs.createReadStream(filePath)
    }, threadID, () => {
      // cleanup after short delay
      setTimeout(() => fs.remove(filePath).catch(()=>{}), 2000);
    });
  } catch (e) {
    console.log("[ownerinfo] manual run error:", e && e.message ? e.message : e);
    return api.sendMessage(OWNER_TEXT, threadID, messageID);
  }
};
