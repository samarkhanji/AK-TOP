module.exports.config = {
	name: "rankup",
	version: "7.3.4",
	hasPermssion: 1,
	credits: "Aman",
	description: "Announce rankup with proper image positioning",
	commandCategory: "Edit-IMG",
	dependencies: {
		"fs-extra": ""
	},
	cooldowns: 2,
};

module.exports.handleEvent = async function({ api, event, Currencies, Users, getText }) {
	// Safety checks
	if (!api || !event || !Currencies) return;
	
	var { threadID, senderID } = event;
	if (!threadID || !senderID) return;
	
	const { createReadStream, existsSync, mkdirSync } = global.nodemodule["fs-extra"];
	const fs = global.nodemodule["fs-extra"];
	const axios = global.nodemodule["axios"];
	const path = require("path");
	
	threadID = String(threadID);
	senderID = String(senderID);

	try {
		const thread = global.data.threadData.get(threadID) || {};

		// Check currency data with null safety
		let currencyData = await Currencies.getData(senderID);
		if (!currencyData) {
			console.log("[Rankup] No currency data for user:", senderID);
			return;
		}

		let exp = currencyData.exp || 0;
		exp = exp += 1;

		if (isNaN(exp)) return;

		if (typeof thread["rankup"] != "undefined" && thread["rankup"] == false) {
			await Currencies.setData(senderID, { exp });
			return;
		}

		const curLevel = Math.floor((Math.sqrt(1 + (4 * exp / 3) + 1) / 2));
		const level = Math.floor((Math.sqrt(1 + (4 * (exp + 1) / 3) + 1) / 2));

		if (level > curLevel && level != 1) {
			// Get user name safely
			let name;
			try {
				name = global.data.userName.get(senderID) || await Users.getNameUser(senderID);
				if (!name) name = "Unknown User";
			} catch (nameError) {
				console.log("[Rankup] Name fetch error:", nameError.message);
				name = "Unknown User";
			}

			var message = (typeof thread.customRankup == "undefined") ? 
				(getText ? getText("levelup") : `🎉 ${name}, you have reached level ${level}! 🎉`) : 
				thread.customRankup;

			message = message
				.replace(/\{name}/g, name)
				.replace(/\{level}/g, level);

			// Image Processing with proper positioning
			try {
				// Create cache directory
				const cacheDir = path.join(__dirname, "..", "..", "cache");
				if (!existsSync(cacheDir)) {
					mkdirSync(cacheDir, { recursive: true });
				}

				// File paths with unique names
				const pathImg = path.join(cacheDir, `rankup_${senderID}_${Date.now()}.png`);
				const pathAvt = path.join(cacheDir, `avatar_${senderID}_${Date.now()}.png`);

				console.log(`[Rankup] Creating rankup image for ${name} (Level ${level})`);

				// Background images - using working URLs
				var backgrounds = [
					"https://i.supaimg.com/b0b26da9-e9c1-4957-937c-a751e8596eb7.jpg",
					"https://i.supaimg.com/283991c8-4a8d-4ea1-a550-f9afe1f65bfa.jpg"
				];
				var randomBg = backgrounds[Math.floor(Math.random() * backgrounds.length)];

				// Download avatar
				console.log("[Rankup] Downloading user avatar...");
				let avatarResponse = await axios.get(
					`https://graph.facebook.com/${senderID}/picture?width=720&height=720&access_token=6628568379%7Cc1e620fa708a1d5696fb991c1bde5662`,
					{ 
						responseType: "arraybuffer",
						timeout: 10000
					}
				);
				fs.writeFileSync(pathAvt, Buffer.from(avatarResponse.data));
				console.log("[Rankup] Avatar downloaded successfully");

				// Download background
				console.log("[Rankup] Downloading background...");
				let bgResponse = await axios.get(randomBg, {
					responseType: "arraybuffer",
					timeout: 10000
				});
				fs.writeFileSync(pathImg, Buffer.from(bgResponse.data));
				console.log("[Rankup] Background downloaded successfully");

				// Canvas processing with proper positioning (using second script's method)
				try {
					const { loadImage, createCanvas } = require("canvas");
					
					let baseImage = await loadImage(pathImg);
					let baseAvatar = await loadImage(pathAvt);
					let canvas = createCanvas(baseImage.width, baseImage.height);
					let ctx = canvas.getContext("2d");
					
					// Draw background
					ctx.drawImage(baseImage, 0, 0, canvas.width, canvas.height);
					
					// Apply rotation and draw avatar (using exact positioning from working script)
					ctx.rotate(-70 * Math.PI / 500); // Same rotation as working script
					ctx.drawImage(baseAvatar, 39, 128, 120, 120); // Same positioning as working script
					
					// Save the processed image
					const imageBuffer = canvas.toBuffer();
					fs.writeFileSync(pathImg, imageBuffer);
					console.log("[Rankup] Canvas processing completed with proper avatar positioning");

				} catch (canvasError) {
					console.log("[Rankup] Canvas processing failed:", canvasError.message);
				}

				// Clean up avatar file
				if (existsSync(pathAvt)) {
					fs.removeSync(pathAvt);
				}

				// Send message with image (using working script's method)
				console.log("[Rankup] Sending rankup notification with image");
				api.sendMessage({
					body: message,
					mentions: [{ tag: name, id: senderID }],
					attachment: fs.createReadStream(pathImg)
				}, event.threadID, () => {
					// Clean up image file after sending
					try {
						fs.unlinkSync(pathImg);
						console.log("[Rankup] Image file cleaned up successfully");
					} catch (cleanupError) {
						console.log("[Rankup] Cleanup error:", cleanupError.message);
					}
				});

			} catch (imageError) {
				console.log("[Rankup] Image processing failed:", imageError.message);
				
				// Send message without image as fallback
				console.log("[Rankup] Sending text-only notification");
				api.sendMessage({
					body: message,
					mentions: [{ tag: name, id: senderID }]
				}, event.threadID);
			}
		}

		// Update experience
		await Currencies.setData(senderID, { exp });
		return;
		
	} catch (error) {
		console.log("[Rankup] HandleEvent error:", error.message);
		return;
	}
}

module.exports.languages = {
	"vi": {
		"off": "Tắt",
		"on": "Bật", 
		"successText": "thành công thông báo rankup ✨",
		"levelup": "🌸 Kĩ năng xào lỏn ở môn pháp hấp điểm của {name} vừa lên tới level {level} 🌸"
	},
	"en": {
		"on": "on",
		"off": "off",
		"successText": "success notification rankup!",
		"levelup": "🎉 {name}, you have reached level {level}! 🎉"
	}
}

module.exports.run = async function({ api, event, Threads, getText }) {
	try {
		const { threadID, messageID } = event;
		let threadsData = await Threads.getData(threadID);
		let data = threadsData ? threadsData.data || {} : {};
		
		if (typeof data["rankup"] == "undefined" || data["rankup"] == false) {
			data["rankup"] = true;
		} else {
			data["rankup"] = false;
		}
		
		await Threads.setData(threadID, { data });
		global.data.threadData.set(threadID, data);
		
		const statusText = data["rankup"] ? (getText ? getText("on") : "on") : (getText ? getText("off") : "off");
		const successText = getText ? getText("successText") : "success notification rankup!";
		
		return api.sendMessage(`${statusText} ${successText}`, threadID, messageID);
	} catch (error) {
		console.log("[Rankup] Run error:", error.message);
		return api.sendMessage("❌ Error toggling rankup setting!", event.threadID, event.messageID);
	}
}

module.exports.onLoad = async function() {
	const path = require("path");
	const fs = global.nodemodule["fs-extra"];
	
	// Ensure cache directory exists
	const cacheDir = path.join(__dirname, "..", "..", "cache");
	if (!fs.existsSync(cacheDir)) {
		fs.mkdirSync(cacheDir, { recursive: true });
		console.log("[Rankup] Cache directory created");
	}
	
	console.log("[Rankup] Enhanced rankup system loaded with proper avatar positioning");
};
