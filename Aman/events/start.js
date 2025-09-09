const fs = require('fs');
const path = require('path');

module.exports.config = {
    name: "start",
    version: "1.0.0",
    credits: "AMAN KHAN",
    description: "Send messages from file line by line to a thread",
    hasPermission: 1, // 0 = all users, 1 = admin
    commandCategory: "system",
    usages: "/start [threadID] OR /start @tag",
    dependencies: {
        "fs": "",
        "path": ""
    }
};

module.exports.run = async function({ api, event, args, Users }) {
    // Check if user is admin (if configured in your system)
    // if (!isAdmin(event.senderID)) return api.sendMessage("Only admin can use this command", event.threadID);

    const threadID = args[0];
    const mentionedUser = Object.keys(event.mentions)[0];
    const userID = mentionedUser || args[0];

    // Check if input is thread ID or user mention/ID
    if (!threadID && !mentionedUser && !userID) {
        return api.sendMessage("Usage: /start [threadID] OR /start @tag", event.threadID);
    }

    // Path to Aman.txt in cache folder
    const filePath = path.join(__dirname, '..', 'cache', 'Aman.txt');
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
        return api.sendMessage("Aman.txt file not found in cache folder", event.threadID);
    }

    try {
        // Read file and split by lines
        const messages = fs.readFileSync(filePath, 'utf8').split('\n').filter(line => line.trim());
        
        if (messages.length === 0) {
            return api.sendMessage("No messages found in Aman.txt", event.threadID);
        }

        let targetID = threadID;
        let isUser = false;

        // Check if we're tagging a user
        if (mentionedUser || (userID && !threadID)) {
            targetID = event.threadID; // Send in current thread
            isUser = true;
        }

        // Send messages line by line
        for (const message of messages) {
            let finalMessage = message;
            
            // If user is mentioned, personalize message
            if (isUser && userID) {
                const userName = await Users.getNameUser(userID);
                finalMessage = message.replace(/@tag/g, `@${userName}`);
            }

            await api.sendMessage(finalMessage, targetID);
            
            // Delay between messages to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 1000));
        }

    } catch (error) {
        console.error(error);
        api.sendMessage("Error sending messages", event.threadID);
    }
};
