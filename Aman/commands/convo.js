const fs = require('fs-extra');
const path = require('path');

// Global storage for active conversations
global.activeConvos = global.activeConvos || new Map();

module.exports.config = {
    name: "convo",
    version: "1.0.0",
    hasPermssion: 3, // Only admin can use
    credits: "Aman Khan",
    description: "Start continuous conversation from Aman.txt file, line by line repeat until stopped",
    commandCategory: "admin",
    usages: "/convo [threadID] or /convo @tag or /convo [userID] or /convo stop",
    cooldowns: 3
};

module.exports.run = async function({ api, event, args, Users, Threads }) {
    try {
        // Check if user is admin
        if (!global.config.ADMINBOT.includes(event.senderID)) {
            return api.sendMessage("❌ Only admins can use this command!", event.threadID, event.messageID);
        }

        // Check for stop command
        if (args[0] && args[0].toLowerCase() === 'stop') {
            return stopConversation(api, event);
        }

        // Path to messages file
        const messagesPath = path.join(__dirname, 'cache', 'Aman.txt');
        
        // Check if messages file exists
        if (!fs.existsSync(messagesPath)) {
            return api.sendMessage("❌ Messages file not found! Please create Aman.txt in cache folder.", event.threadID, event.messageID);
        }

        // Read messages from file
        let messages;
        try {
            const fileContent = fs.readFileSync(messagesPath, 'utf8');
            messages = fileContent.split('\n').filter(line => line.trim() !== '');
        } catch (error) {
            return api.sendMessage("❌ Error reading messages file!", event.threadID, event.messageID);
        }

        if (messages.length === 0) {
            return api.sendMessage("❌ No messages found in file!", event.threadID, event.messageID);
        }

        let targetThreadID = null;
        let targetUserID = null;
        let targetUserName = null;
        let isGroupConvo = false;

        // Case 1: Thread ID provided
        if (args[0] && !isNaN(args[0]) && !event.messageReply) {
            targetThreadID = args[0];
            isGroupConvo = true;
        }
        // Case 2: Tag mentioned
        else if (Object.keys(event.mentions).length > 0) {
            const mentionedUser = Object.keys(event.mentions)[0];
            targetUserID = mentionedUser;
            targetUserName = event.mentions[mentionedUser];
            targetThreadID = event.threadID;
        }
        // Case 3: User ID provided
        else if (args[0] && !isNaN(args[0]) && args[0].length > 10) {
            try {
                targetUserID = args[0];
                
                // Try to get user info
                try {
                    const userInfo = await Users.getInfo(targetUserID);
                    targetUserName = userInfo.name || "User";
                } catch (userError) {
                    // If user info fails, try to get from username cache
                    targetUserName = await Users.getNameUser(targetUserID) || "User";
                }
                
                targetThreadID = event.threadID;
            } catch (error) {
                return api.sendMessage("❌ Invalid user ID provided!", event.threadID, event.messageID);
            }
        }
        // Case 4: No specific target (current thread)
        else {
            targetThreadID = event.threadID;
        }

        if (!targetThreadID) {
            return api.sendMessage("❌ Please provide a valid thread ID, tag a user, or provide a user ID!", event.threadID, event.messageID);
        }

        // Check if conversation already running for this thread
        const convoKey = `${targetThreadID}_${targetUserID || 'general'}`;
        if (global.activeConvos.has(convoKey)) {
            return api.sendMessage("❌ Conversation already running for this target! Use '/convo stop' to stop it first.", event.threadID, event.messageID);
        }

        // Validate thread exists
        try {
            await api.getThreadInfo(targetThreadID);
        } catch (error) {
            return api.sendMessage("❌ Invalid thread ID or bot is not in that group!", event.threadID, event.messageID);
        }

        // Send confirmation
        let confirmMsg = `✅ Starting continuous conversation with ${messages.length} messages`;
        if (targetUserID && targetUserName) {
            confirmMsg += ` mentioning ${targetUserName}`;
        }
        confirmMsg += ` in thread ${targetThreadID}`;
        confirmMsg += `\n\nUse '/convo stop' to stop the conversation.`;
        
        api.sendMessage(confirmMsg, event.threadID);

        // Start continuous conversation
        startContinuousConvo(api, targetThreadID, messages, targetUserID, targetUserName, convoKey);

    } catch (error) {
        console.error("Convo command error:", error);
        return api.sendMessage("❌ An error occurred while processing the command!", event.threadID, event.messageID);
    }
};

// Function to start continuous conversation
function startContinuousConvo(api, targetThreadID, messages, targetUserID, targetUserName, convoKey) {
    let messageIndex = 0;
    const delay = 3000; // 3 seconds between messages
    
    const convoData = {
        targetThreadID,
        messages,
        targetUserID,
        targetUserName,
        messageIndex: 0,
        active: true
    };
    
    // Store in global active conversations
    global.activeConvos.set(convoKey, convoData);

    const sendNextMessage = async () => {
        // Check if conversation is still active
        const currentConvo = global.activeConvos.get(convoKey);
        if (!currentConvo || !currentConvo.active) {
            return;
        }

        let messageToSend = messages[messageIndex].trim();
        let messageObj = { body: messageToSend };

        // If user is targeted, add mention
        if (targetUserID && targetUserName) {
            // Replace @tag with user name or add mention at beginning
            if (messageToSend.includes("@tag")) {
                messageToSend = messageToSend.replace(/@tag/g, targetUserName);
            } else {
                messageToSend = `${targetUserName} ${messageToSend}`;
            }

            messageObj = {
                body: messageToSend,
                mentions: [{
                    tag: targetUserName,
                    id: targetUserID,
                    fromIndex: 0
                }]
            };
        }

        try {
            await new Promise((resolve, reject) => {
                api.sendMessage(messageObj, targetThreadID, (error, info) => {
                    if (error) reject(error);
                    else resolve(info);
                });
            });

            console.log(`Convo message ${messageIndex + 1}/${messages.length} sent to ${targetThreadID}`);
            
            // Move to next message, reset to 0 if reached end (repeat)
            messageIndex = (messageIndex + 1) % messages.length;
            
            // Update the stored data
            currentConvo.messageIndex = messageIndex;

            // Schedule next message
            setTimeout(sendNextMessage, delay);

        } catch (error) {
            console.error(`Error sending convo message ${messageIndex + 1}:`, error);
            
            // Continue with next message even if one fails
            messageIndex = (messageIndex + 1) % messages.length;
            setTimeout(sendNextMessage, delay);
        }
    };

    // Start sending messages
    sendNextMessage();
}

// Function to stop conversation
function stopConversation(api, event) {
    let stoppedCount = 0;
    
    // Stop all conversations for this command sender
    for (const [key, convoData] of global.activeConvos.entries()) {
        convoData.active = false;
        global.activeConvos.delete(key);
        stoppedCount++;
    }
    
    if (stoppedCount > 0) {
        return api.sendMessage(`✅ Stopped ${stoppedCount} active conversation(s).`, event.threadID, event.messageID);
    } else {
        return api.sendMessage("❌ No active conversations to stop.", event.threadID, event.messageID);
    }
}

module.exports.onLoad = function() {
    const cachePath = path.join(__dirname, 'cache');
    const messagesPath = path.join(cachePath, 'Aman.txt');
    
    // Create cache directory if it doesn't exist
    if (!fs.existsSync(cachePath)) {
        fs.mkdirSync(cachePath, { recursive: true });
    }
    
    // Create sample messages file if it doesn't exist
    if (!fs.existsSync(messagesPath)) {
        const sampleMessages = `Hello! How are you?
Good morning everyone!
Hope you're having a great day
@tag kaise ho aap?
What are you doing today?
Life is beautiful, enjoy every moment
@tag kaha ho aap?
Keep smiling and stay happy
Thanks for being awesome
Have a wonderful day ahead!
@tag how was your day?
Don't forget to stay positive
Everything will be fine
@tag take care of yourself
Good night, sweet dreams!`;
        
        fs.writeFileSync(messagesPath, sampleMessages, 'utf8');
        console.log("✅ Created sample Aman.txt file for convo command");
    }
    
    // Initialize global storage
    if (!global.activeConvos) {
        global.activeConvos = new Map();
    }
};
