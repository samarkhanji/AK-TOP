const axios = require("axios");
const fs = require("fs-extra");

module.exports.config = {
  name: "pinterest",
  version: "1.0.2",
  hasPermssion: 0,
  credits: "Aman Khan",
  description: "Get HQ images from Pinterest (Render API)",
  commandCategory: "images",
  usages: "/pinterest <search query> <count>",
  cooldowns: 5,
};

module.exports.run = async function ({ api, event, args }) {
  if (args.length < 1) {
    return api.sendMessage("❌ Usage: /pinterest <search> <count>", event.threadID, event.messageID);
  }

  let search = args.slice(0, -1).join(" "); // query
  let count = parseInt(args[args.length - 1]); // last arg
  if (isNaN(count)) {
    search = args.join(" ");
    count = 5; // default
  }

  try {
    // ✅ Your Render API
    const res = await axios.get(`https://pinterest-api-dfxf.onrender.com/pinterest?q=${encodeURIComponent(search)}&count=${count}`);

    if (!res.data || !res.data.result) {
      return api.sendMessage("❌ Koi result nahi mila!", event.threadID, event.messageID);
    }

    // 🔥 Filter only high-quality (236x) images
    let images = res.data.result.filter(url => url.includes("236x"));

    // Strictly take only requested count
    images = images.slice(0, count);

    if (images.length === 0) {
      return api.sendMessage("❌ High-quality image nahi mili!", event.threadID, event.messageID);
    }

    const imgData = [];
    for (let i = 0; i < images.length; i++) {
      const imgPath = __dirname + `/cache/pin_${i}.jpg`;
      const img = await axios.get(images[i], { responseType: "arraybuffer" });
      fs.writeFileSync(imgPath, Buffer.from(img.data, "utf-8"));
      imgData.push(fs.createReadStream(imgPath));
    }

    api.sendMessage(
      { body: `📌 Pinterest Results for: ${search}`, attachment: imgData },
      event.threadID,
      event.messageID
    );

    // clear cache
    setTimeout(() => {
      for (let i = 0; i < images.length; i++) {
        fs.unlinkSync(__dirname + `/cache/pin_${i}.jpg`);
      }
    }, 60000);

  } catch (err) {
    console.error(err);
    return api.sendMessage("⚠️ Error fetching images.", event.threadID, event.messageID);
  }
};
