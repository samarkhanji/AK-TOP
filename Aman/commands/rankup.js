module.exports.config = {
	name: "rankup",
	version: "7.3.2",
	hasPermssion: 1,
	credits: "Aman",
	description: "Announce rankup with error handling",
	commandCategory: "Edit-IMG",
	dependencies: {
		"fs-extra": ""
	},
	cooldowns: 2,
};

module.exports.handleEvent = async function({ api, event, Currencies, Users, getText }) {
	// MAIN FIX: Added comprehensive null checks
	if (!api || !event || !Currencies) return;
	
	var { threadID, senderID } = event;
	if (!threadID || !senderID) return;
	
	const { createReadStream, existsSync, mkdirSync } = global.nodemodule["fs-extra"];
	const { loadImage, createCanvas } = require("canvas");
	const fs = global.nodemodule["fs-extra"];
	const axios = global.nodemodule["axios"];
	
	let pathImg = __dirname + "/noprefix/rankup/rankup.png";
	let pathAvt1 = __dirname + "/cache/Avtmot.png";
	var id1 = event.senderID;

	threadID = String(threadID);
	senderID = String(senderID);

	try {
		const thread = global.data.threadData.get(threadID) || {};

		// FIXED: Added null check for Currencies.getData result
		let currencyData = await Currencies.getData(senderID);
		if (!currencyData) {
			console.log("[Rankup] No currency data for user:", senderID);
			return;
		}

		let exp = currencyData.exp || 0; // FIXED: Handle undefined exp
		exp = exp += 1;

		if (isNaN(exp)) return;

		if (typeof thread["rankup"] != "undefined" && thread["rankup"] == false) {
			await Currencies.setData(senderID, { exp });
			return;
		}

		const curLevel = Math.floor((Math.sqrt(1 + (4 * exp / 3) + 1) / 2));
		const level = Math.floor((Math.sqrt(1 + (4 * (exp + 1) / 3) + 1) / 2));

		if (level > curLevel && level != 1) {
			// FIXED: Added null check for Users.getNameUser
			let name;
			try {
				name = global.data.userName.get(senderID) || await Users.getNameUser(senderID);
				if (!name) name = "Unknown User";
			} catch (nameError) {
				console.log("[Rankup] Name fetch error:", nameError.message);
				name = "Unknown User";
			}

			var messsage = (typeof thread.customRankup == "undefined") ? 
				(getText ? getText("levelup") : `${name}, your level has reached level ${level}`) : 
				thread.customRankup;

			messsage = messsage
				.replace(/\{name}/g, name)
				.replace(/\{level}/g, level);

			const moduleName = this.config.name;

			var background = [
				"https://imgur.com/ijxCuk5.jpeg",
				"https://imgur.com/Muk122J.jpeg"
			];
			var rd = background[Math.floor(Math.random() * background.length)];

			try {
				// Ensure cache directory exists
				const cacheDir = __dirname + "/cache";
				if (!existsSync(cacheDir)) {
					mkdirSync(cacheDir, { recursive: true });
				}

				let getAvtmot = (
					await axios.get(
						`https://graph.facebook.com/${id1}/picture?width=720&height=720&access_token=6628568379%7Cc1e620fa708a1d5696fb991c1bde5662`,
						{ responseType: "arraybuffer" }
					)
				).data;
				fs.writeFileSync(pathAvt1, Buffer.from(getAvtmot, "utf-8"));

				let getbackground = (
					await axios.get(`${rd}`, {
						responseType: "arraybuffer",
					})
				).data;
				fs.writeFileSync(pathImg, Buffer.from(getbackground, "utf-8"));

				let baseImage = await loadImage(pathImg);
				let baseAvt1 = await loadImage(pathAvt1);
				let canvas = createCanvas(baseImage.width, baseImage.height);
				let ctx = canvas.getContext("2d");
				ctx.drawImage(baseImage, 0, 0, canvas.width, canvas.height);
				ctx.rotate(-25 * Math.PI / 180);
				ctx.drawImage(baseAvt1, 37, 120, 125, 130);
				const imageBuffer = canvas.toBuffer();
				fs.writeFileSync(pathImg, imageBuffer);
				fs.removeSync(pathAvt1);

				api.sendMessage({
					body: messsage, 
					mentions: [{ tag: name, id: senderID }], 
					attachment: fs.createReadStream(pathImg) 
				}, event.threadID, () => {
					try {
						fs.unlinkSync(pathImg);
					} catch (unlinkError) {
						console.log("[Rankup] File cleanup error:", unlinkError.message);
					}
				});
			} catch (imageError) {
				console.log("[Rankup] Image processing error:", imageError.message);
				// Send message without image
				api.sendMessage({
					body: messsage, 
					mentions: [{ tag: name, id: senderID }]
				}, event.threadID);
			}
		}

		await Currencies.setData(senderID, { exp });
		return;
		
	} catch (error) {
		console.log("[Rankup] HandleEvent error:", error.message);
		// Don't throw error, just log and continue
		return;
	}
}

module.exports.languages = {
	"vi": {
		"off": "𝗧𝗮̆́𝘁",
		"on": "𝗕𝗮̣̂𝘁",
		"successText": "𝐭𝐡𝐚̀𝐧𝐡 𝐜𝐨̂𝐧𝐠 𝐭𝐡𝐨̂𝐧𝐠 𝐛𝐚́𝐨 𝐫𝐚𝐧𝐤𝐮𝐩 ✨",
		"levelup": "🌸 𝗞𝗶̃ 𝗻𝗮̆𝗻𝗴 𝘅𝗮̣𝗼 𝗹𝗼̂̀𝗻𝗻 𝗼̛̉ 𝗺𝗼̂𝗻 𝗽𝗵𝗮́𝗽 𝗵𝗮̂́𝗽 𝗱𝗶𝗲̂𝗺 𝗰𝘂̉𝗮 {name} 𝘃𝘂̛̀𝗮 𝗹𝗲̂𝗻 𝘁𝗼̛́𝗶 𝗹𝗲𝘃𝗲𝗹 {level} 🌸"
	},
	"en": {
		"on": "on",
		"off": "off",
		"successText": "success notification rankup!",
		"levelup": "{name}, your level has reached level {level}",
	}
}

module.exports.run = async function({ api, event, Threads, getText }) {
	try {
		const { threadID, messageID } = event;
		let data = (await Threads.getData(threadID)).data;
		
		if (typeof data["rankup"] == "undefined" || data["rankup"] == false) data["rankup"] = true;
		else data["rankup"] = false;
		
		await Threads.setData(threadID, { data });
		global.data.threadData.set(threadID, data);
		return api.sendMessage(`${(data["rankup"] == true) ? (getText ? getText("on") : "on") : (getText ? getText("off") : "off")} ${getText ? getText("successText") : "success notification rankup!"}`, threadID, messageID);
	} catch (error) {
		console.log("[Rankup] Run error:", error.message);
		return api.sendMessage("❌ Error toggling rankup setting!", event.threadID, event.messageID);
	}
}
