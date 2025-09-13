const axios = require("axios");
const fs = require('fs');

const baseApiUrl = async () => {
  try {
    const base = await axios.get("https://raw.githubusercontent.com/Blankid018/D1PT0/main/baseApiUrl.json", {
      timeout: 5000
    });
    return base.data.api;
  } catch (error) {
    console.error("Failed to fetch base API URL:", error);
    // Fallback API URL
    return "https://smfahim.onrender.com";
  }
};

module.exports = {
  config: {
    name: "video",
    version: "1.2.0",
    credits: "Aman Khan", 
    countDown: 3,
    hasPermssion: 0,
    description: "Download video, audio, and info from YouTube - Fast & Reliable",
    category: "media",
    commandCategory: "media",
    usePrefix: true,
    prefix: true,
    usages:
      " {pn} [video|-v] [<video name>|<video link>]\n" +
      " {pn} [audio|-a] [<video name>|<video link>]\n" +
      " {pn} [info|-i] [<video name>|<video link>]\n" +
      "Example:\n" +
      "{pn} -v chipi chipi chapa chapa\n" +
      "{pn} -a chipi chipi chapa chapa\n" +
      "{pn} -i chipi chipi chapa chapa"
  },

  run: async ({ api, args, event }) => {
    const { threadID, messageID, senderID } = event;

    let action = args[0] ? args[0].toLowerCase() : '-v';

    // Check if first argument is a valid action
    if (!['-v', 'video', 'mp4', '-a', 'audio', 'mp3', '-i', 'info'].includes(action)) {
      args.unshift('-v');
      action = '-v';
    }

    const checkurl = /^(?:https?:\/\/)?(?:m\.|www\.)?(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))((\w|-){11})(?:\S+)?$/;
    const urlYtb = args[1] ? checkurl.test(args[1]) : false;

    // Send processing message
    const processingMsg = await api.sendMessage("⏳ Processing your request...", threadID);

    if (urlYtb) {
      const format = ['-v', 'video', 'mp4'].includes(action) ? 'mp4'
        : ['-a', 'audio', 'mp3'].includes(action) ? 'mp3' : null;

      if (!format && action !== '-i' && action !== 'info') {
        await api.unsendMessage(processingMsg.messageID);
        return api.sendMessage('❌ Invalid format. Use -v for video, -a for audio, or -i for info.', threadID, messageID);
      }

      try {
        const match = args[1].match(checkurl);
        const videoID = match ? match[1] : null;
        if (!videoID) {
          await api.unsendMessage(processingMsg.messageID);
          return api.sendMessage('❌ Invalid YouTube link.', threadID, messageID);
        }

        if (action === '-i' || action === 'info') {
          // Handle info request
          try {
            const { data } = await axios.get(`${await baseApiUrl()}/ytfullinfo?videoID=${videoID}`, {
              timeout: 15000
            });
            
            await api.unsendMessage(processingMsg.messageID);
            
            await api.sendMessage({
              body: `✨ Title: ${data.title}\n⏳ Duration: ${(data.duration / 60).toFixed(2)} mins\n📺 Resolution: ${data.resolution}\n👀 Views: ${data.view_count}\n👍 Likes: ${data.like_count}\n💬 Comments: ${data.comment_count}\n📂 Category: ${data.categories[0]}\n📢 Channel: ${data.channel}\n🧍 Uploader ID: ${data.uploader_id}\n👥 Subscribers: ${data.channel_follower_count}\n🔗 Channel URL: ${data.channel_url}\n🔗 Video URL: ${data.webpage_url}`,
              attachment: await streamImage(data.thumbnail, 'info_thumb.jpg')
            }, threadID, messageID);
            return;
          } catch (e) {
            console.error("Info fetch error:", e);
            await api.unsendMessage(processingMsg.messageID);
            return api.sendMessage('❌ Failed to retrieve video info. Please try again.', threadID, messageID);
          }
        }

        // Handle video/audio download
        const path = `ytb_${format}_${videoID}_${Date.now()}.${format}`;
        
        const downloadResponse = await axios.get(`${await baseApiUrl()}/ytDl3?link=${videoID}&format=${format}&quality=3`, {
          timeout: 20000
        });

        if (!downloadResponse.data || !downloadResponse.data.downloadLink) {
          await api.unsendMessage(processingMsg.messageID);
          return api.sendMessage('❌ Failed to get download link. Please try again.', threadID, messageID);
        }

        const { title, downloadLink, quality } = downloadResponse.data;

        // Update processing message
        await api.editMessage("📥 Downloading file...", processingMsg.messageID);

        const attachment = await downloadFile(downloadLink, path);
        
        await api.unsendMessage(processingMsg.messageID);

        await api.sendMessage({
          body: `✅ Downloaded Successfully!\n\n• Title: ${title}\n• Quality: ${quality}\n• Format: ${format.toUpperCase()}\n• Credits: Aman Khan`,
          attachment: attachment
        }, threadID, () => {
          try {
            fs.unlinkSync(path);
          } catch (e) {
            console.error("File cleanup error:", e);
          }
        }, messageID);

        return;
      } catch (e) {
        console.error("Download error:", e);
        await api.unsendMessage(processingMsg.messageID);
        return api.sendMessage('❌ Download failed. Please check the link and try again.', threadID, messageID);
      }
    }

    // Handle search
    args.shift(); 
    const keyWord = args.join(" ");
    if (!keyWord) {
      await api.unsendMessage(processingMsg.messageID);
      return api.sendMessage('❌ kuch Search to kro koi song name ya video name.', threadID, messageID);
    }

    try {
      // Update processing message
      await api.editMessage("🔍 Searching videos...", processingMsg.messageID);

      const searchResponse = await axios.get(`${await baseApiUrl()}/ytFullSearch?songName=${encodeURIComponent(keyWord)}`, {
        timeout: 15000
      });
      
      const searchResult = searchResponse.data.slice(0, 6);
      
      if (!searchResult.length) {
        await api.unsendMessage(processingMsg.messageID);
        return api.sendMessage(`⭕ No results found for: ${keyWord}`, threadID, messageID);
      }

      let msg = `🔍 Search Results for: "${keyWord}"\n\n`;
      const thumbnails = [];
      let i = 1;

      for (const info of searchResult) {
        try {
          thumbnails.push(streamImage(info.thumbnail, `thumbnail_${i}_${Date.now()}.jpg`));
        } catch (e) {
          console.error("Thumbnail error:", e);
        }
        msg += `${i}. ${info.title}\n⏱️ Duration: ${info.time}\n📺 Channel: ${info.channel.name}\n\n`;
        i++;
      }

      await api.unsendMessage(processingMsg.messageID);

      api.sendMessage({
        body: msg + "👉 Reply with a number (1-6) to select a video.\n💡 *★᭄𝐎𝐰𝐧𝐞𝐫 𝐀 𝐊 ⚔️⏤͟͟͞͞★*",
        attachment: await Promise.all(thumbnails)
      }, threadID, (err, info) => {
        if (err) {
          console.error("Send message error:", err);
          return api.sendMessage("❌ Failed to send search results.", threadID, messageID);
        }
        
        global.client.handleReply.push({
          name: module.exports.config.name,
          messageID: info.messageID,
          author: senderID,
          result: searchResult,
          action,
          timeout: Date.now() + 60000 // 1 minute timeout
        });
      }, messageID);
      
    } catch (err) {
      console.error("Search error:", err);
      await api.unsendMessage(processingMsg.messageID);
      return api.sendMessage("❌ Search failed. Please try again with a different keyword.", threadID, messageID);
    }
  },

  handleReply: async ({ event, api, handleReply }) => {
    const { threadID, messageID, senderID, body } = event;

    if (senderID !== handleReply.author) return;
    
    // Check timeout
    if (Date.now() > handleReply.timeout) {
      try {
        await api.unsendMessage(handleReply.messageID);
      } catch (e) {}
      return api.sendMessage("⏰ Selection timeout. Please search again.", threadID, messageID);
    }

    const { result, action } = handleReply;
    const choice = parseInt(body);

    if (isNaN(choice) || choice <= 0 || choice > result.length) {
      return api.sendMessage("❌ Invalid number. Please reply with a number between 1-6.", threadID, messageID);
    }

    const selectedVideo = result[choice - 1];
    const videoID = selectedVideo.id;

    // Send processing message
    const processingMsg = await api.sendMessage("⏳ Processing your selection...", threadID);

    try {
      await api.unsendMessage(handleReply.messageID);
    } catch (e) {
      console.error("Unsend failed:", e);
    }

    if (['-v', 'video', 'mp4', '-a', 'audio', 'mp3', 'music'].includes(action)) {
      const format = ['-v', 'video', 'mp4'].includes(action) ? 'mp4' : 'mp3';
      
      try {
        const path = `ytb_${format}_${videoID}_${Date.now()}.${format}`;
        
        const downloadResponse = await axios.get(`${await baseApiUrl()}/ytDl3?link=${videoID}&format=${format}&quality=3`, {
          timeout: 20000
        });

        if (!downloadResponse.data || !downloadResponse.data.downloadLink) {
          await api.unsendMessage(processingMsg.messageID);
          return api.sendMessage('❌ Failed to get download link. Please try again.', threadID, messageID);
        }

        const { title, downloadLink, quality } = downloadResponse.data;

        // Update processing message
        await api.editMessage("📥 Downloading file...", processingMsg.messageID);

        const attachment = await downloadFile(downloadLink, path);
        
        await api.unsendMessage(processingMsg.messageID);

        await api.sendMessage({
          body: `✅ Downloaded Successfully!\n\n• Title: ${title}\n• Quality: ${quality}\n• Format: ${format.toUpperCase()}\n• Credits: Aman Khan`,
          attachment: attachment
        }, threadID, () => {
          try {
            fs.unlinkSync(path);
          } catch (e) {
            console.error("File cleanup error:", e);
          }
        }, messageID);

      } catch (e) {
        console.error("Download error:", e);
        await api.unsendMessage(processingMsg.messageID);
        return api.sendMessage('❌ Download failed. Please try again later.', threadID, messageID);
      }
    }

    if (action === '-i' || action === 'info') {
      try {
        const { data } = await axios.get(`${await baseApiUrl()}/ytfullinfo?videoID=${videoID}`, {
          timeout: 15000
        });
        
        await api.unsendMessage(processingMsg.messageID);
        
        await api.sendMessage({
          body: `✨ Video Information\n\n🎬 Title: ${data.title}\n⏳ Duration: ${(data.duration / 60).toFixed(2)} mins\n📺 Resolution: ${data.resolution}\n👀 Views: ${data.view_count.toLocaleString()}\n👍 Likes: ${data.like_count.toLocaleString()}\n💬 Comments: ${data.comment_count.toLocaleString()}\n📂 Category: ${data.categories[0]}\n📢 Channel: ${data.channel}\n👥 Subscribers: ${data.channel_follower_count.toLocaleString()}\n🔗 Channel URL: ${data.channel_url}\n🔗 Video URL: ${data.webpage_url}\n\n💡 Credits: Aman Khan`,
          attachment: await streamImage(data.thumbnail, `info_thumb_${Date.now()}.jpg`)
        }, threadID, messageID);
        
      } catch (e) {
        console.error("Info error:", e);
        await api.unsendMessage(processingMsg.messageID);
        return api.sendMessage('❌ Failed to retrieve video info.', threadID, messageID);
      }
    }
  }
};

async function downloadFile(url, pathName) {
  try {
    const response = await axios.get(url, { 
      responseType: "arraybuffer",
      timeout: 30000,
      maxContentLength: 100 * 1024 * 1024, // 100MB limit
      maxBodyLength: 100 * 1024 * 1024
    });
    
    fs.writeFileSync(pathName, Buffer.from(response.data));
    return fs.createReadStream(pathName);
  } catch (error) {
    console.error("Download file error:", error);
    throw new Error("Failed to download file");
  }
}

async function streamImage(url, pathName) {
  try {
    const response = await axios.get(url, { 
      responseType: "stream",
      timeout: 10000
    });
    response.data.path = pathName;
    return response.data;
  } catch (error) {
    console.error("Stream image error:", error);
    // Return null instead of throwing to avoid breaking the flow
    return null;
  }
}
