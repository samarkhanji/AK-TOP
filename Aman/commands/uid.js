module.exports.config = {
	name: "uid",
	version: "1.0.0",
	hasPermssion: 0,
	credits: "Aman Khan",
	description: "Get User UID or Group Thread ID",
	commandCategory: "other",
	cooldowns: 5,
	usages: "/uid [@tag] OR /gid"
};

module.exports.run = function({ api, event, args }) {
	const command = args[0];
	
	// Agar /gid likha hai toh sirf thread ID de
	if (command === "gid") {
		return api.sendMessage(`📌 Group/Thread ID: ${event.threadID}`, event.threadID, event.messageID);
	}
	
	// Agar kisi ko tag kiya hai toh unki UID de
	if (Object.keys(event.mentions).length > 0) {
		let msg = "👤 User UIDs:\n";
		for (var i = 0; i < Object.keys(event.mentions).length; i++) {
			const name = Object.values(event.mentions)[i].replace('@', '');
			const uid = Object.keys(event.mentions)[i];
			msg += `➤ ${name}: ${uid}\n`;
		}
		return api.sendMessage(msg, event.threadID, event.messageID);
	}
	
	// Agar /uid likha hai toh sirf apni UID de
	if (command === "uid") {
		return api.sendMessage(`👤 Your UID: ${event.senderID}`, event.threadID, event.messageID);
	}
	
	// Agar kuch nahi likha toh help message de
	return api.sendMessage(`❓ Usage:\n/uid - Your UID\n/uid @tag - Tagged user's UID\n/gid - Group Thread ID`, event.threadID, event.messageID);
};
