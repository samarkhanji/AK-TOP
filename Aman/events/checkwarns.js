module.exports.config = {
    name: 'checkwarns',
    eventType: ['log:subscribe'],
    version: '1.0.0',
    credits: 'Aman Khan',
    description: 'Auto-kick banned users when they join groups',
    dependencies: ''
};

module.exports.run = async function({ api, event, Threads }) {
    if (event.logMessageType !== 'log:subscribe') return;
    
    const fs = require('fs-extra');
    const logger = require("../../utils/log");
    
    try {
        const { threadID } = event;
        const warnDataPath = __dirname + `/../commands/cache/datawarn.json`;
        
        // Check if warn data file exists
        if (!fs.existsSync(warnDataPath)) {
            logger("Warn data file not found, skipping check", "warn");
            return;
        }

        // Read warn data
        let datawarn;
        try {
            datawarn = JSON.parse(fs.readFileSync(warnDataPath, 'utf8'));
        } catch (parseError) {
            logger(`Failed to parse warn data: ${parseError.message}`, "error");
            return;
        }

        // Check if banned list exists for this thread
        if (!datawarn.banned || !datawarn.banned[threadID] || !Array.isArray(datawarn.banned[threadID])) {
            // No banned users for this thread
            return;
        }

        const listban = datawarn.banned[threadID];
        if (listban.length === 0) return;

        // Get all users in thread
        let allUserThread;
        try {
            const threadInfo = await api.getThreadInfo(threadID);
            allUserThread = threadInfo.participantIDs;
        } catch (apiError) {
            logger(`Failed to get thread info: ${apiError.message}`, "error");
            return;
        }

        // Check each user against ban list
        let kickedUsers = 0;
        for (const userID of allUserThread) {
            const userIdNumber = parseInt(userID);
            
            if (listban.includes(userIdNumber)) {
                try {
                    await new Promise((resolve, reject) => {
                        api.removeUserFromGroup(userIdNumber, threadID, (error) => {
                            if (error) {
                                reject(error);
                            } else {
                                resolve();
                            }
                        });
                    });
                    
                    // Send notification about kicked user
                    const kickMessage = `User ${userID} has been automatically removed from the group due to previous ban.`;
                    await api.sendMessage(kickMessage, threadID);
                    
                    kickedUsers++;
                    logger(`Kicked banned user ${userID} from thread ${threadID}`, "[ CheckWarns ]");
                    
                } catch (kickError) {
                    logger(`Failed to kick user ${userID}: ${kickError.message}`, "error");
                    
                    // Send error message if kick failed (maybe user is admin)
                    const errorMessage = `⚠️ Could not remove user ${userID} from group (may be admin or API limitation)`;
                    await api.sendMessage(errorMessage, threadID);
                }
            }
        }

        // Summary message if users were kicked
        if (kickedUsers > 0) {
            const summaryMessage = `✅ Security Check Complete: ${kickedUsers} banned user(s) were removed from the group.`;
            await api.sendMessage(summaryMessage, threadID);
            logger(`Completed ban check for thread ${threadID}: ${kickedUsers} users kicked`, "[ CheckWarns ]");
        }

    } catch (error) {
        logger(`Error in checkwarns event: ${error.message}`, "error");
    }
};
