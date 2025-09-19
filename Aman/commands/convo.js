const fs = require('fs-extra');
const path = require('path');

global.activeConvos = global.activeConvos || new Map();
global.pendingConvos = global.pendingConvos || new Map();
global.convoSpeeds = global.convoSpeeds || new Map();

module.exports.config = {
    name: "convo",
    version: "2.4.0",
    hasPermssion: 3,
    credits: "Aman",
    description: "Conversation system with multiple mentions support and speed control",
    commandCategory: "admin",
    usages: "/convo [options] | /convo speed [seconds]",
    cooldowns: 3
};

module.exports.run = async function({ api, event, args, Users, Threads }) {
    try {
        if (!global.config.ADMINBOT.includes(event.senderID)) {
            return api.sendMessage("❌ Only admins can use this command!", event.threadID, event.messageID);
        }

        const { threadID } = event;

        // Create By Aman Khan Speed Test System 
        if (args[0] && args[0].toLowerCase() === 'speed') {
            if (!args[1] || isNaN(args[1])) {
                return api.sendMessage(
                    "⚡ **Speed Control Usage:**\n\n" +
                    "/convo speed [seconds] - Set message delay\n\n" +
                    "Examples:\n" +
                    "/convo speed 2 - 2 seconds delay\n" +
                    "/convo speed 5 - 5 seconds delay\n" +
                    "/convo speed 10 - 10 seconds delay\n\n" +
                    "Current default: 3 seconds",
                    threadID, event.messageID
                );
            }
            
            const speedSeconds = parseInt(args[1]);
            if (speedSeconds < 1 || speedSeconds > 60) {
                return api.sendMessage("❌ Speed must be between 1-60 seconds!", threadID, event.messageID);
            }
            
            return showActiveConversationsForSpeed(api, event, speedSeconds);
        }

        // Auther Aman Khan
        if (args[0]) {
            const command = args[0].toLowerCase();
            
            if (command === 'stop') {
                return stopConversation(api, event);
            }
            
            if (command === 'start') {
                return showActiveConversations(api, event);
            }

            // Group ID provided
            if (!isNaN(args[0]) && args[0].length > 10) {
                return showFileOptionsForTarget(api, event, args[0], null, null, 'group');
            }

            // Name provided (NOT mention) - FIXED LOGIC
            if (isNaN(args[0]) && Object.keys(event.mentions).length === 0) {
                const targetName = args.slice(0).join(" ");
                return showFileOptionsForTarget(api, event, threadID, null, targetName, 'name_only');
            }
        }

        // MULTIPLE MENTIONS SUPPORT ID 
        if (Object.keys(event.mentions).length > 0) {
            const mentionedUsers = Object.keys(event.mentions);
            const targetUsers = mentionedUsers.map(userID => ({
                id: userID,
                name: event.mentions[userID]
            }));
            
            console.log(`[Convo] MULTIPLE MENTIONS DETECTED: ${targetUsers.length} users`);
            targetUsers.forEach(user => {
                console.log(`[Convo] - ${user.name} (${user.id})`);
            });
            
            return showFileOptionsForTarget(api, event, threadID, targetUsers, null, 'multiple_mentions');
        }

        // Default: current thread
        return showFileOptions(api, event);

    } catch (error) {
        console.error("[Convo] Command error:", error);
        return api.sendMessage("❌ Error while processing command!", event.threadID, event.messageID);
    }
};

// Handle event for replies
module.exports.handleEvent = async function({ api, event, Users, Threads }) {
    try {
        if (!global.config.ADMINBOT.includes(event.senderID)) return;
        
        if (event.messageReply && global.pendingConvos.has(event.senderID)) {
            return handleReply(api, event, Users, Threads);
        }
    } catch (error) {
        console.error("[Convo] HandleEvent error:", error);
    }
};

// Get correct Aman folder path
function getAmanFolderPath() {
    return path.join(__dirname, 'Aman');
}

// Show file options for current thread
function showFileOptions(api, event) {
    const amanFolderPath = getAmanFolderPath();
    
    try {
        if (!fs.existsSync(amanFolderPath)) {
            fs.mkdirSync(amanFolderPath, { recursive: true });
            
            const sampleFile = path.join(amanFolderPath, 'sample.txt');
            const sampleContent = `Hello! How are you?\nGood morning everyone!\nHope you're having a great day\nWhat are you doing today?\nHave a wonderful day!`;
            fs.writeFileSync(sampleFile, sampleContent, 'utf8');
        }

        const files = fs.readdirSync(amanFolderPath).filter(file =>
            file.endsWith('.txt') && fs.statSync(path.join(amanFolderPath, file)).isFile()
        );

        if (files.length === 0) {
            return api.sendMessage("❌ No .txt files found in Aman folder!", event.threadID, event.messageID);
        }

        let message = "📂 Available Conversation Files:\n\n";
        files.forEach((file, index) => {
            message += `${index + 1}. ${file}\n`;
        });

        message += `\n💬 Custom Option:\n${files.length + 1}. Type your own text\n\n`;
        message += `📝 Reply with number (1-${files.length + 1}) or paste your custom text`;

        global.pendingConvos.set(event.senderID, {
            type: 'file_selection',
            targetThreadID: event.threadID,
            targetUserID: null,
            targetUserName: null,
            targetUsers: null,
            targetMode: 'general',
            files: files,
            fromMessageID: null
        });

        return api.sendMessage(message, event.threadID, (err, info) => {
            if (!err && info) {
                global.pendingConvos.get(event.senderID).fromMessageID = info.messageID;
            }
        });

    } catch (error) {
        console.error("[Convo] showFileOptions error:", error);
        return api.sendMessage("❌ Error reading Aman folder!", event.threadID, event.messageID);
    }
}

// Show file options for specific target - ENHANCED WITH MULTIPLE MENTIONS
function showFileOptionsForTarget(api, event, targetThreadID, targetUserID, targetUserName, mode) {
    const amanFolderPath = getAmanFolderPath();
    
    try {
        if (!fs.existsSync(amanFolderPath)) {
            fs.mkdirSync(amanFolderPath, { recursive: true });
        }

        const files = fs.readdirSync(amanFolderPath).filter(file =>
            file.endsWith('.txt') && fs.statSync(path.join(amanFolderPath, file)).isFile()
        );

        if (files.length === 0) {
            return api.sendMessage("❌ No .txt files found in Aman folder!", event.threadID, event.messageID);
        }

        let message = "📂 **Available Conversation Files:**\n\n";
        files.forEach((file, index) => {
            message += `${index + 1}. ${file}\n`;
        });

        message += `\n💬 Custom Option:\n${files.length + 1}. Type your own text\n\n`;
        
        // Show target info based on mode
        if (mode === 'multiple_mentions') {
            const userNames = targetUserID.map(user => user.name).join(', ');
            message += `🎯 Target: Multiple Users (${targetUserID.length}) - ${userNames}\n`;
            message += `📝 Mode: MULTIPLE MENTIONS - will tag all users\n`;
        } else if (mode === 'mention') {
            message += `🎯 Target: ${targetUserName} (MENTION MODE - will tag user)\n`;
        } else if (mode === 'name_only') {
            message += `🎯 Target: ${targetUserName} (NAME MODE - name prefix only)\n`;
        } else if (mode === 'group') {
            message += `🎯 Target: Thread ${targetThreadID}\n`;
        }
        
        message += `\n📝 Reply with number (1-${files.length + 1}) or paste your custom text`;

        // Store pending conversation with mode and target info
        global.pendingConvos.set(event.senderID, {
            type: 'file_selection',
            targetThreadID: targetThreadID,
            targetUserID: mode === 'multiple_mentions' ? null : targetUserID,
            targetUserName: targetUserName,
            targetUsers: mode === 'multiple_mentions' ? targetUserID : null, // Array of users for multiple mentions
            targetMode: mode,
            files: files,
            fromMessageID: null
        });

        if (mode === 'multiple_mentions') {
            console.log(`[Convo] Stored pending - Multiple mentions: ${targetUserID.length} users`);
        } else {
            console.log(`[Convo] Stored pending - Mode: ${mode}, ThreadID: ${targetThreadID}, UserID: ${targetUserID}, UserName: ${targetUserName}`);
        }

        return api.sendMessage(message, event.threadID, (err, info) => {
            if (!err && info) {
                global.pendingConvos.get(event.senderID).fromMessageID = info.messageID;
            }
        });

    } catch (error) {
        return api.sendMessage("❌ Error reading Aman folder!", event.threadID, event.messageID);
    }
}

// Show active conversations for speed control
function showActiveConversationsForSpeed(api, event, speedSeconds) {
    const activeConvos = Array.from(global.activeConvos.entries());
    
    if (activeConvos.length === 0) {
        return api.sendMessage("ℹ️ No active conversations to adjust speed for.", event.threadID, event.messageID);
    }
    
    let message = `⚡ **Set Speed to ${speedSeconds} seconds:**\n\n`;
    
    activeConvos.forEach(([convoKey, convoData], index) => {
        let targetInfo = `Thread: ${convoData.targetThreadID}`;
        if (convoData.targetUsers && convoData.targetUsers.length > 0) {
            const userNames = convoData.targetUsers.map(u => u.name).join(', ');
            targetInfo += ` | Multiple Users: ${userNames}`;
        } else if (convoData.targetUserName) {
            targetInfo += ` | User: ${convoData.targetUserName}`;
        }
        
        message += `${index + 1}. ${targetInfo}\n`;
    });
    
    message += `\n📝 Reply with number (1-${activeConvos.length}) to set speed for that conversation`;
    
    global.pendingConvos.set(event.senderID, {
        type: 'speed_selection',
        speedSeconds: speedSeconds
    });
    
    return api.sendMessage(message, event.threadID);
}

// Handle replies
async function handleReply(api, event, Users, Threads) {
    const { senderID, body, threadID } = event;
    const pendingConvo = global.pendingConvos.get(senderID);
    
    if (!pendingConvo) return;
    
    // Handle speed selection
    if (pendingConvo.type === 'speed_selection') {
        const selection = parseInt(body.trim());
        const activeConvos = Array.from(global.activeConvos.entries());
        
        if (isNaN(selection) || selection < 1 || selection > activeConvos.length) {
            return api.sendMessage(`❌ Invalid selection! Reply with number 1-${activeConvos.length}`, threadID);
        }
        
        const [convoKey, convoData] = activeConvos[selection - 1];
        const speedMs = pendingConvo.speedSeconds * 1000;
        
        global.convoSpeeds.set(convoKey, speedMs);
        global.pendingConvos.delete(senderID);
        
        return api.sendMessage(
            `✅ Speed set to ${pendingConvo.speedSeconds} seconds for thread ${convoData.targetThreadID}`,
            threadID
        );
    }
    
    // Handle file selection
    if (pendingConvo.type === 'file_selection') {
        const input = body.trim();
        const selection = parseInt(input);
        const maxFileOptions = pendingConvo.files.length;
        
        if (!isNaN(selection) && selection >= 1 && selection <= maxFileOptions + 1) {
            
            if (selection === maxFileOptions + 1) {
                global.pendingConvos.set(senderID, {
                    ...pendingConvo,
                    type: 'waiting_custom_text'
                });
                
                return api.sendMessage(
                    "💬 Now paste your custom text:\n" +
                    "Each line will be sent as separate message.\n\n" +
                    "Example:\n" +
                    "Hello there!\n" +
                    "How are you today?\n" +
                    "Have a great day!",
                    threadID
                );
            }
            
            const selectedFile = pendingConvo.files[selection - 1];
            return startConversationFromFile(api, event, pendingConvo, selectedFile);
        }
        
        return startConversationFromCustomText(api, event, pendingConvo, input);
    }
    
    if (pendingConvo.type === 'waiting_custom_text') {
        return startConversationFromCustomText(api, event, pendingConvo, body.trim());
    }
    
    if (pendingConvo.type === 'stop_selection') {
        const selection = parseInt(body.trim());
        const activeConvos = Array.from(global.activeConvos.entries());
        
        if (isNaN(selection) || selection < 1 || selection > activeConvos.length) {
            return api.sendMessage(`❌ Invalid selection! Reply with number 1-${activeConvos.length}`, threadID);
        }
        
        const [convoKey, convoData] = activeConvos[selection - 1];
        
        convoData.active = false;
        global.activeConvos.delete(convoKey);
        global.convoSpeeds.delete(convoKey);
        global.pendingConvos.delete(senderID);
        
        return api.sendMessage(`✅ Stopped conversation in thread ${convoData.targetThreadID}`, threadID);
    }
}

// Start conversation from file
async function startConversationFromFile(api, event, pendingConvo, selectedFile) {
    const filePath = path.join(getAmanFolderPath(), selectedFile);
    
    try {
        const fileContent = fs.readFileSync(filePath, 'utf8');
        const messages = fileContent.split('\n').filter(line => line.trim() !== '');
        
        if (messages.length === 0) {
            global.pendingConvos.delete(event.senderID);
            return api.sendMessage("❌ Selected file is empty!", event.threadID);
        }
        
        global.pendingConvos.delete(event.senderID);
        return startConversation(api, event, messages, pendingConvo, `File: ${selectedFile}`);
        
    } catch (error) {
        global.pendingConvos.delete(event.senderID);
        return api.sendMessage("❌ Error reading selected file!", event.threadID);
    }
}

// Start conversation from custom text
async function startConversationFromCustomText(api, event, pendingConvo, customText) {
    if (!customText) {
        return api.sendMessage("❌ Please provide some text!", event.threadID);
    }
    
    const messages = customText.split('\n').filter(line => line.trim() !== '');
    if (messages.length === 0) {
        return api.sendMessage("❌ No valid messages found in your text!", event.threadID);
    }
    
    global.pendingConvos.delete(event.senderID);
    return startConversation(api, event, messages, pendingConvo, 'Custom Text');
}

// Start actual conversation
async function startConversation(api, event, messages, targetInfo, sourceName) {
    const { targetThreadID, targetUserID, targetUserName, targetUsers, targetMode } = targetInfo;
    
    console.log(`[Convo] Starting conversation - Mode: ${targetMode}, ThreadID: ${targetThreadID}`);
    if (targetMode === 'multiple_mentions') {
        console.log(`[Convo] Multiple users: ${targetUsers.length}`);
    }
    
    try {
        await api.getThreadInfo(targetThreadID);
    } catch (error) {
        return api.sendMessage("❌ Invalid thread ID or bot is not in that group!", event.threadID);
    }
    
    const convoKey = `${targetThreadID}_${targetMode}_${Date.now()}`;
    
    const existingKey = Array.from(global.activeConvos.keys()).find(key => 
        key.startsWith(`${targetThreadID}_${targetMode}_`)
    );
    
    if (existingKey) {
        return api.sendMessage("❌ Conversation already running for this target!", event.threadID);
    }
    
    let confirmMsg = `✅ Starting conversation with ${messages.length} messages from "${sourceName}"`;
    if (targetMode === 'multiple_mentions') {
        const userNames = targetUsers.map(u => u.name).join(', ');
        confirmMsg += ` with MULTIPLE MENTIONS for: ${userNames}`;
    } else if (targetMode === 'mention') {
        confirmMsg += ` with MENTIONS for ${targetUserName}`;
    } else if (targetMode === 'name_only') {
        confirmMsg += ` with NAME PREFIX for ${targetUserName}`;
    }
    confirmMsg += ` in thread ${targetThreadID}`;
    
    api.sendMessage(confirmMsg, event.threadID);
    
    startContinuousConvo(api, targetThreadID, messages, targetUserID, targetUserName, targetUsers, targetMode, convoKey);
}

// ENHANCED CONTINUOUS CONVERSATION WITH MULTIPLE MENTIONS SUPPORT
function startContinuousConvo(api, targetThreadID, messages, targetUserID, targetUserName, targetUsers, targetMode, convoKey) {
    const convoData = {
        targetThreadID,
        messages,
        targetUserID,
        targetUserName,
        targetUsers,
        targetMode,
        messageIndex: 0,
        active: true
    };
    
    global.activeConvos.set(convoKey, convoData);
    console.log(`[Convo] Started continuous convo - Mode: ${targetMode}`);
    
    const sendNextMessage = async () => {
        const currentConvo = global.activeConvos.get(convoKey);
        if (!currentConvo || !currentConvo.active) return;
        
        let messageToSend = messages[currentConvo.messageIndex].trim();
        let messageObj = { body: messageToSend };
        
        // ENHANCED MENTION SYSTEM WITH MULTIPLE MENTIONS SUPPORT
        if (targetMode === 'multiple_mentions' && targetUsers && targetUsers.length > 0) {
            // MULTIPLE MENTIONS MODE
            console.log(`[Convo] MULTIPLE MENTIONS MODE: Sending mentions for ${targetUsers.length} users`);
            
            // Create mentions array and build message
            let mentionsArray = [];
            let currentIndex = 0;
            let finalMessage = messageToSend;
            
            // Replace @tag with all user names or add all names at beginning
            if (messageToSend.includes("@tag")) {
                const allNames = targetUsers.map(u => u.name).join(' ');
                finalMessage = messageToSend.replace(/@tag/g, allNames);
                
                // Create mentions for replaced names
                targetUsers.forEach(user => {
                    const nameIndex = finalMessage.indexOf(user.name, currentIndex);
                    if (nameIndex !== -1) {
                        mentionsArray.push({
                            tag: user.name,
                            id: user.id,
                            fromIndex: nameIndex
                        });
                        currentIndex = nameIndex + user.name.length;
                    }
                });
            } else {
                // Add all names at beginning
                const allNames = targetUsers.map(u => u.name).join(' ');
                finalMessage = `${allNames} ${messageToSend}`;
                
                // Create mentions for names at beginning
                currentIndex = 0;
                targetUsers.forEach(user => {
                    mentionsArray.push({
                        tag: user.name,
                        id: user.id,
                        fromIndex: currentIndex
                    });
                    currentIndex += user.name.length + 1; // +1 for space
                });
            }
            
            messageObj = {
                body: finalMessage,
                mentions: mentionsArray
            };
            
            console.log(`[Convo] Multiple mentions object:`, JSON.stringify(messageObj, null, 2));
            
        } else if (targetMode === 'mention' && targetUserID && targetUserName) {
            // SINGLE MENTION MODE - Proper Facebook mention
            console.log(`[Convo] SINGLE MENTION MODE: Sending mention for ${targetUserName} (${targetUserID})`);
            
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
            
        } else if (targetMode === 'name_only' && targetUserName) {
            // NAME ONLY MODE - Just text prefix
            console.log(`[Convo] NAME ONLY MODE: Adding name prefix for ${targetUserName}`);
            
            if (messageToSend.includes("@tag")) {
                messageToSend = messageToSend.replace(/@tag/g, targetUserName);
            } else {
                messageToSend = `${targetUserName} ${messageToSend}`;
            }
            
            messageObj.body = messageToSend;
        }
        // GENERAL MODE - No changes needed, just send original message
        
        try {
            await new Promise((resolve, reject) => {
                api.sendMessage(messageObj, targetThreadID, (error) => {
                    if (error) {
                        console.error(`[Convo] Send error:`, error);
                        reject(error);
                    } else {
                        console.log(`[Convo] Message sent successfully - Mode: ${targetMode}`);
                        resolve();
                    }
                });
            });
            
            console.log(`[Convo] Message ${currentConvo.messageIndex + 1}/${messages.length} sent to ${targetThreadID}`);
            
            currentConvo.messageIndex = (currentConvo.messageIndex + 1) % messages.length;
            
            const customSpeed = global.convoSpeeds.get(convoKey) || 3000;
            setTimeout(sendNextMessage, customSpeed);
            
        } catch (error) {
            console.error(`[Convo] Error sending message:`, error);
            currentConvo.messageIndex = (currentConvo.messageIndex + 1) % messages.length;
            
            const customSpeed = global.convoSpeeds.get(convoKey) || 3000;
            setTimeout(sendNextMessage, customSpeed);
        }
    };
    
    sendNextMessage();
}

// Show active conversations - ENHANCED WITH MULTIPLE MENTIONS DISPLAY
function showActiveConversations(api, event) {
    const activeConvos = Array.from(global.activeConvos.entries());
    
    if (activeConvos.length === 0) {
        return api.sendMessage("ℹ️ No active conversations running.", event.threadID, event.messageID);
    }
    
    let message = "🔄 **Active Conversations:**\n\n";
    
    activeConvos.forEach(([convoKey, convoData], index) => {
        let targetInfo = `Thread: ${convoData.targetThreadID}`;
        
        if (convoData.targetMode === 'multiple_mentions' && convoData.targetUsers) {
            const userNames = convoData.targetUsers.map(u => u.name).join(', ');
            targetInfo += ` | Multiple Users (${convoData.targetUsers.length}): ${userNames} (MENTIONS)`;
        } else if (convoData.targetUserName) {
            const modeText = convoData.targetMode === 'mention' ? '(MENTION)' : 
                           convoData.targetMode === 'name_only' ? '(NAME)' : '';
            targetInfo += ` | User: ${convoData.targetUserName} ${modeText}`;
        }
        
        const customSpeed = global.convoSpeeds.get(convoKey);
        const speedInfo = customSpeed ? ` | Speed: ${customSpeed/1000}s` : ' | Speed: 3s';
        
        message += `${index + 1}. ${targetInfo}${speedInfo}\n`;
        message += `   📝 Messages: ${convoData.messages.length} | Current: ${convoData.messageIndex + 1}\n\n`;
    });
    
    message += `📝 Reply with number (1-${activeConvos.length}) to stop that conversation`;
    
    global.pendingConvos.set(event.senderID, {
        type: 'stop_selection'
    });
    
    return api.sendMessage(message, event.threadID);
}

// Stop all conversations
function stopConversation(api, event) {
    let stoppedCount = 0;
    
    for (const [key, convoData] of global.activeConvos.entries()) {
        convoData.active = false;
        global.activeConvos.delete(key);
        global.convoSpeeds.delete(key);
        stoppedCount++;
    }
    
    global.pendingConvos.delete(event.senderID);
    
    if (stoppedCount > 0) {
        return api.sendMessage(`✅ Stopped ${stoppedCount} active conversation(s).`, event.threadID, event.messageID);
    } else {
        return api.sendMessage("❌ No active conversations to stop.", event.threadID, event.messageID);
    }
}

module.exports.onLoad = function() {
    if (!global.activeConvos) global.activeConvos = new Map();
    if (!global.pendingConvos) global.pendingConvos = new Map();
    if (!global.convoSpeeds) global.convoSpeeds = new Map();
    
    console.log("✅ Enhanced Convo command loaded with MULTIPLE MENTIONS support and speed control");
};
