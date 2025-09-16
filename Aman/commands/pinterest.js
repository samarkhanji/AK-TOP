const axios = require("axios");
const fs = require("fs-extra");

module.exports.config = {
  name: "pinterest",
  version: "1.0.2",
  hasPermssion: 0,
  credits: "Aman Khan",
  description: "Get HD images from Pinterest (via Render API)",
  commandCategory: "images",
  usages: "/pinterest <search query> <count>",
  cooldowns: 5,
};

module.exports.run = async function ({ api, event, args }) {
  if (args.length < 1) {
    return api.sendMessage("❌ Usage: /pinterest <search> <count>", event.threadID, event.messageID);
  }

  let search = args.slice(0, -1).join(" "); // query words
  let count = parseInt(args[args.length - 1]); // last arg as count
  if (isNaN(count)) {
    search = args.join(" ");
    count = 5; // default
  }

  try {
    // ✅ Call your Render API
    const res = await axios.get(
      `https://pinterest-api-dfxf.onrender.com/pinterest?q=${encodeURIComponent(search)}&count=${count}`
    );

    if (!res.data || !res.data.result || res.data.result.length === 0) {
      return api.sendMessage("❌ Koi result nahi mila!", event.threadID, event.messageID);
    }

    let images = res.data.result.slice(0, count); // exact number of images
    const imgData = [];

    for (let i = 0; i < images.length; i++) {
      const imgPath = __dirname + `/cache/pin_${event.senderID}_${i}.jpg`;
      const img = await axios.get(images[i], { responseType: "arraybuffer" });
      fs.writeFileSync(imgPath, Buffer.from(img.data));
      imgData.push(fs.createReadStream(imgPath));
    }

    api.sendMessage(
      { body: `📌 Pinterest Results for: ${search}`, attachment: imgData },
      event.threadID,
      event.messageID
    );

    // 🧹 clear cache after 60s
    setTimeout(() => {
      for (let i = 0; i < images.length; i++) {
        const imgPath = __dirname + `/cache/pin_${event.senderID}_${i}.jpg`;
        if (fs.existsSync(imgPath)) fs.unlinkSync(imgPath);
      }
    }, 60000);

  } catch (err) {
    console.error("Pinterest command error:", err);
    return api.sendMessage("⚠️ Error fetching images.", event.threadID, event.messageID);
  }
};
