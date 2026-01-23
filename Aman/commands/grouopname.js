const fs = require("fs-extra");
const axios = require("axios");
const path = require("path");

module.exports.config = {
  name: "lockgroup",
  version: "1.0.0",
  hasPermssion: 1,
  credits: "Raj",
  description: "Lock group name and photo, and auto-reset on change",
  commandCategory: "group",
  usages: "[on/off]",
  cooldowns: 5
};

const lockData = {}; // RAM-based lock info

module.exports.run = async function ({ api, event, args }) {
  const threadID = event.threadID;

  if (!args[0]) return api.sendMessage("❌ Use: lockgroup on/off", threadID);

  if (args[0].toLowerCase() === "on") {
    try {
      const threadInfo = await api.getThreadInfo(threadID);
      const groupName = threadInfo.threadName;
      const groupImageSrc = threadInfo.imageSrc;

      let imagePath = null;

      // Download and save group image
      if (groupImageSrc) {
        const img = await axios.get(groupImageSrc, { responseType: "arraybuffer" });
        imagePath = path.join(__dirname, "cache", `group_${threadID}.jpg`);
        fs.writeFileSync(imagePath, Buffer.from(img.data, "binary"));
      }

      lockData[threadID] = {
        name: groupName,
        image: imagePath
      };

      return api.sendMessage(`🔒 Group name और photo लॉक हो गए!\nकोई भी बदलने की कोशिश करेगा तो वापस reset कर दूंगा।`, threadID);
    } catch (err) {
      console.log(err);
      return api.sendMessage("⚠️ Lock failed. कुछ गड़बड़ हो गई!", threadID);
    }
  }

  if (args[0].toLowerCase() === "off") {
    if (!lockData[threadID]) return api.sendMessage("⚠️ Group पहले से unlocked है!", threadID);

    if (lockData[threadID].image) fs.unlinkSync(lockData[threadID].image);
    delete lockData[threadID];
    return api.sendMessage("✅ Group name और photo unlock कर दिया गया।", threadID);
  }

  return api.sendMessage("❌ Invalid option! Use: lockgroup on/off", threadID);
};

module.exports.handleEvent = async function ({ api, event }) {
  const threadID = event.threadID;
  if (!lockData[threadID]) return;

  try {
    const threadInfo = await api.getThreadInfo(threadID);
    const currentName = threadInfo.threadName;
    const currentImage = threadInfo.imageSrc;

    const { name: lockedName, image: lockedImagePath } = lockData[threadID];

    // Check name
    if (currentName !== lockedName) {
      await api.setTitle(lockedName, threadID);
      api.sendMessage(`⚠️ Group name बदला गया था। वापस "${lockedName}" set कर दिया।`, threadID);
    }

    // Check photo
    if (lockedImagePath && currentImage) {
      const currentImgRes = await axios.get(currentImage, { responseType: "arraybuffer" });
      const currentBuffer = Buffer.from(currentImgRes.data, "binary");

      const lockedBuffer = fs.readFileSync(lockedImagePath);

      if (!currentBuffer.equals(lockedBuffer)) {
        await api.changeGroupImage(fs.createReadStream(lockedImagePath), threadID);
        api.sendMessage(`🖼️ Group photo बदल दी गई थी। वापस लॉक वाली photo set कर दी गई।`, threadID);
      }
    }
  } catch (err) {
    console.log("Error in lockgroup event:", err.message);
  }
};
