module.exports.config = {
    name: "log",
    eventType: ["log:unsubscribe", "log:subscribe", "log:thread-name"],
    version: "1.0.0",
    credits: "Aman Khan",
    description: "Record bot activities and send notifications to admin",
    envConfig: {
        enable: true
    }
};

module.exports.run = async function({ api, event, Threads }) {
    const logger = require("../../utils/log");
    
    // Check if logging is enabled
    if (!global.configModule[this.config.name] || !global.configModule[this.config.name].enable) {
        return;
    }

    let task = "";
    const timestamp = new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" });
    
    try {
        switch (event.logMessageType) {
            case "log:thread-name": {
                const oldName = event.logMessageData.name || "Unknown";
                const newName = event.logMessageData.name || "Unknown";
                task = `User changed group name from: '${oldName}' to '${newName}'`;
                
                // Update thread data if Threads controller is available
                if (Threads && Threads.setData) {
                    try {
                        await Threads.setData(event.threadID, { name: newName });
                    } catch (dbError) {
                        console.error("Failed to update thread name in database:", dbError);
                    }
                }
                break;
            }
            
            case "log:subscribe": {
                if (event.logMessageData.addedParticipants.some(i => i.userFbId == api.getCurrentUserID())) {
                    task = "Bot was added to a new group!";
                } else {
                    const addedUsers = event.logMessageData.addedParticipants.length;
                    task = `${addedUsers} user(s) were added to the group`;
                }
                break;
            }
            
            case "log:unsubscribe": {
                if (event.logMessageData.leftParticipantFbId == api.getCurrentUserID()) {
                    task = "Bot was removed from the group!";
                } else {
                    task = "A user left the group";
                }
                break;
            }
            
            default:
                return; // Skip unknown event types
        }

        // If no task was set, skip logging
        if (task.length == 0) return;

        // Create formatted report
        const formReport = `🤖 BOT NOTIFICATION 🤖
        
📋 Event Details:
» Thread ID: ${event.threadID}
» Action: ${task}
» Performed by: ${event.author || 'System'}
» Time: ${timestamp}
» Event Type: ${event.logMessageType}

────────────────────────`;

        // Send notification to first admin
        if (global.config.ADMINBOT && global.config.ADMINBOT.length > 0) {
            return api.sendMessage(formReport, global.config.ADMINBOT[0], (error, info) => {
                if (error) {
                    logger(`Failed to send log notification: ${error.message}`, "error");
                    logger(formReport, "[ Logging Event ]");
                } else {
                    logger(`Log notification sent successfully for ${event.logMessageType}`, "[ Logging Event ]");
                }
            });
        } else {
            logger("No admin configured for log notifications", "warn");
            logger(formReport, "[ Logging Event ]");
        }

    } catch (error) {
        logger(`Error in log event handler: ${error.message}`, "error");
    }
};
