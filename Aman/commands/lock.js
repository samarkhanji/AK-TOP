const fs = require('fs-extra');
const path = require('path');

// Create persistent storage paths
const LOCK_DATA_DIR = path.join(process.cwd(), 'cache', 'grouplock');
const GROUP_LOCKS_FILE = path.join(LOCK_DATA_DIR, 'group_locks.json');
const MEMBER_NAMES_FILE = path.join(LOCK_DATA_DIR, 'member_names.json');
const GROUP_DPS_FILE = path.join(LOCK_DATA_DIR, 'group_dps.json');

// Ensure cache directory exists
fs.ensureDirSync(LOCK_DATA_DIR);

// Load persistent data
function loadLockData() {
    try {
        const groupLocks = fs.existsSync(GROUP_LOCKS_FILE) ? 
            JSON.parse(fs.readFileSync(GROUP_LOCKS_FILE, 'utf8')) : {};
        const memberNames = fs.existsSync(MEMBER_NAMES_FILE) ? 
            JSON.parse(fs.readFileSync(MEMBER_NAMES_FILE, 'utf8')) : {};
        const groupDPs = fs.existsSync(GROUP_DPS_FILE) ? 
            JSON.parse(fs.readFileSync(GROUP_DPS_FILE, 'utf8')) : {};
            
        return { groupLocks, memberNames, groupDPs };
    } catch (error) {
        console.log("[GroupLock] Error loading persistent data:", error);
        return { groupLocks: {}, memberNames: {}, groupDPs: {} };
    }
}

// Save persistent data
function saveLockData() {
    try {
        fs.writeFileSync(GROUP_LOCKS_FILE, JSON.stringify(global.groupLocks || {}, null, 2));
        fs.writeFileSync(MEMBER_NAMES_FILE, JSON.stringify(global.memberNamesLocked || {}, null, 2));
        fs.writeFileSync(GROUP_DPS_FILE, JSON.stringify(global.groupDPsLocked || {}, null, 2));
        console.log("[GroupLock] Data saved successfully");
    } catch (error) {
        console.log("[GroupLock] Error saving data:", error);
    }
}

module.exports.config = {
    name: "grouplock",
    version: "4.0.0",
    hasPermssion: 2, // Only Bot Admin
    credits: "Aman - Enhanced",
    description: "Complete group protection with persistent storage",
    commandCategory: "Admin",
    usages: "[name/members/dp/all] [value]",
    cooldowns: 5,
    dependencies: {}
};

// Initialize global storage with persistent data
function initializeStorage() {
    const { groupLocks, memberNames, groupDPs } = loadLockData();
    global.groupLocks = global.groupLocks || groupLocks;
    global.memberNamesLocked = global.memberNamesLocked || memberNames;
    global.groupDPsLocked = global.groupDPsLocked || groupDPs;
}

module.exports.run = async function({ api, event, args }) {
    const { threadID, messageID, senderID } = event;
    
    // Initialize storage
    initializeStorage();
    
    // Load config for bot admin check
    let config = {};
    try {
        config = JSON.parse(fs.readFileSync('./config.json', 'utf8'));
    } catch (err) {
        console.log("Config load error:", err);
    }
    
    // Check if user is bot admin
    const botAdmins = config.ADMINBOT || [];
    if (!botAdmins.includes(senderID)) {
        return api.sendMessage("❌ Sirf bot admin ye command use kar sakte hain!", threadID, messageID);
    }
    
    if (!args[0]) {
        return api.sendMessage(
            `🔒 **Enhanced Group Protection System v4.0** 🔒\n\n` +
            `📋 **Usage:**\n` +
            `• /grouplock name [group name] - Lock group name\n` +
            `• /grouplock members - Lock all member names\n` +
            `• /grouplock dp - Lock group display picture\n` +
            `• /grouplock all [group name] - Lock everything\n` +
            `• /grouplock status - Check lock status\n` +
            `• /grouplock unlock [type/all] - Unlock specific or all\n\n` +
            `📝 **Examples:**\n` +
            `/grouplock name Aman ka Group\n` +
            `/grouplock members\n` +
            `/grouplock dp\n` +
            `/grouplock all My Protected Group\n\n` +
            `✨ **New Features:**\n` +
            `• Persistent storage (survives bot restart)\n` +
            `• Enhanced event detection\n` +
            `• Better error handling`,
            threadID, messageID
        );
    }

    const command = args[0].toLowerCase();
    
    // Initialize group locks if not exists
    if (!global.groupLocks[threadID]) {
        global.groupLocks[threadID] = {
            name: null,
            members: false,
            dp: false,
            lockedBy: senderID,
            lockedAt: new Date().toISOString()
        };
    }

    switch (command) {
        case 'name':
            if (!args[1]) {
                return api.sendMessage("⚠️ Group name specify karo!\nExample: /grouplock name Aman ka Group", threadID, messageID);
            }
            
            const groupName = args.slice(1).join(" ");
            global.groupLocks[threadID].name = groupName;
            
            try {
                await api.setTitle(groupName, threadID);
                saveLockData();
                return api.sendMessage(
                    `🔒 **Group Name Locked & Saved!**\n\n` +
                    `📝 Locked Name: "${groupName}"\n` +
                    `👤 Locked by: You\n` +
                    `💾 Data saved persistently\n` +
                    `⚡ Ab koi bhi name change karega toh automatic revert ho jayega!`,
                    threadID, messageID
                );
            } catch (error) {
                console.log("[GroupLock] Name set error:", error);
                return api.sendMessage("❌ Error: Bot ko admin banao pehle!", threadID, messageID);
            }

        case 'members':
            try {
                const threadInfo = await api.getThreadInfo(threadID);
                const memberNames = {};
                
                // Get all member names
                for (const userID of threadInfo.participantIDs) {
                    const userInfo = threadInfo.userInfo.find(u => u.id === userID);
                    if (userInfo) {
                        memberNames[userID] = userInfo.name;
                    }
                }
                
                // Store in global and persistent storage
                global.memberNamesLocked[threadID] = memberNames;
                global.groupLocks[threadID].members = true;
                saveLockData();
                
                return api.sendMessage(
                    `🔒 **Member Names Locked & Saved!**\n\n` +
                    `👥 Total Members: ${Object.keys(memberNames).length}\n` +
                    `💾 Names saved persistently\n` +
                    `⚡ Ab koi bhi member apna name change karega toh automatic revert ho jayega!`,
                    threadID, messageID
                );
                
            } catch (error) {
                console.log("[GroupLock] Members lock error:", error);
                return api.sendMessage("❌ Error: Member names fetch nahi kar paya!", threadID, messageID);
            }

        case 'dp':
            try {
                const threadInfo = await api.getThreadInfo(threadID);
                const currentImage = threadInfo.imageSrc || threadInfo.image;
                
                if (!currentImage) {
                    return api.sendMessage("⚠️ Group me koi DP nahi hai! Pehle DP set karo phir lock karo.", threadID, messageID);
                }
                
                // Save DP URL and metadata
                global.groupDPsLocked[threadID] = {
                    url: currentImage,
                    lockedAt: new Date().toISOString()
                };
                global.groupLocks[threadID].dp = true;
                saveLockData();
                
                return api.sendMessage(
                    `🔒 **Group DP Locked & Saved!**\n\n` +
                    `🖼️ Current DP locked successfully\n` +
                    `💾 DP data saved persistently\n` +
                    `⚡ DP change detection active!`,
                    threadID, messageID
                );
                
            } catch (error) {
                console.log("[GroupLock] DP lock error:", error);
                return api.sendMessage("❌ Error: DP lock nahi kar paya!", threadID, messageID);
            }

        case 'all':
            if (!args[1]) {
                return api.sendMessage("⚠️ Group name specify karo!\nExample: /grouplock all My Protected Group", threadID, messageID);
            }
            
            const allGroupName = args.slice(1).join(" ");
            
            try {
                // Lock name
                global.groupLocks[threadID].name = allGroupName;
                await api.setTitle(allGroupName, threadID);
                
                // Lock members
                const threadInfo = await api.getThreadInfo(threadID);
                const memberNames = {};
                
                for (const userID of threadInfo.participantIDs) {
                    const userInfo = threadInfo.userInfo.find(u => u.id === userID);
                    if (userInfo) {
                        memberNames[userID] = userInfo.name;
                    }
                }
                global.memberNamesLocked[threadID] = memberNames;
                global.groupLocks[threadID].members = true;
                
                // Lock DP
                const currentImage = threadInfo.imageSrc || threadInfo.image;
                if (currentImage) {
                    global.groupDPsLocked[threadID] = {
                        url: currentImage,
                        lockedAt: new Date().toISOString()
                    };
                    global.groupLocks[threadID].dp = true;
                }
                
                saveLockData();
                
                return api.sendMessage(
                    `🔒 **COMPLETE GROUP PROTECTION ACTIVATED!**\n\n` +
                    `📝 Group Name: "${allGroupName}" ✅\n` +
                    `👥 Member Names: ${Object.keys(memberNames).length} locked ✅\n` +
                    `🖼️ Group DP: ${currentImage ? 'Locked ✅' : 'No DP ❌'}\n` +
                    `💾 All data saved persistently ✅\n\n` +
                    `⚡ Ab ye group completely protected hai!`,
                    threadID, messageID
                );
                
            } catch (error) {
                console.log("[GroupLock] Complete protection error:", error);
                return api.sendMessage("❌ Error: Complete protection setup nahi kar paya!", threadID, messageID);
            }

        case 'status':
            const locks = global.groupLocks[threadID];
            if (!locks || (!locks.name && !locks.members && !locks.dp)) {
                return api.sendMessage("ℹ️ Is group me koi lock active nahi hai!", threadID, messageID);
            }
            
            let status = `🔒 **Group Lock Status**\n\n`;
            status += `📝 Name Lock: ${locks.name ? `✅ "${locks.name}"` : '❌ Not Active'}\n`;
            status += `👥 Members Lock: ${locks.members ? `✅ Active` : '❌ Not Active'}\n`;
            status += `🖼️ DP Lock: ${locks.dp ? '✅ Active' : '❌ Not Active'}\n\n`;
            
            if (locks.members && global.memberNamesLocked[threadID]) {
                status += `👥 Locked Members: ${Object.keys(global.memberNamesLocked[threadID]).length}\n`;
            }
            
            status += `📅 Locked At: ${new Date(locks.lockedAt).toLocaleString('hi-IN')}\n`;
            status += `💾 Persistent Storage: ✅ Active`;
            
            return api.sendMessage(status, threadID, messageID);

        case 'unlock':
            if (!args[1]) {
                return api.sendMessage(
                    "⚠️ Kya unlock karna hai specify karo!\n\n" +
                    "• /grouplock unlock name\n" +
                    "• /grouplock unlock members\n" +
                    "• /grouplock unlock dp\n" +
                    "• /grouplock unlock all",
                    threadID, messageID
                );
            }
            
            const unlockType = args[1].toLowerCase();
            const currentLocks = global.groupLocks[threadID];
            
            if (!currentLocks) {
                return api.sendMessage("ℹ️ Koi lock active nahi hai!", threadID, messageID);
            }
            
            switch (unlockType) {
                case 'name':
                    global.groupLocks[threadID].name = null;
                    saveLockData();
                    return api.sendMessage("🔓 Group name lock remove ho gaya!", threadID, messageID);
                
                case 'members':
                    global.groupLocks[threadID].members = false;
                    delete global.memberNamesLocked[threadID];
                    saveLockData();
                    return api.sendMessage("🔓 Member names lock remove ho gaya!", threadID, messageID);
                
                case 'dp':
                    global.groupLocks[threadID].dp = false;
                    delete global.groupDPsLocked[threadID];
                    saveLockData();
                    return api.sendMessage("🔓 Group DP lock remove ho gaya!", threadID, messageID);
                
                case 'all':
                    delete global.groupLocks[threadID];
                    delete global.memberNamesLocked[threadID];
                    delete global.groupDPsLocked[threadID];
                    saveLockData();
                    return api.sendMessage("🔓 Saare locks remove ho gaye! Group ab unprotected hai.", threadID, messageID);
                
                default:
                    return api.sendMessage("❌ Invalid unlock type! Use: name/members/dp/all", threadID, messageID);
            }

        default:
            return api.sendMessage("❌ Invalid command! Use /grouplock without arguments to see usage.", threadID, messageID);
    }
};

// Enhanced event handler with comprehensive detection
module.exports.handleEvent = async function({ api, event }) {
    const { threadID, senderID, type, logMessageData } = event;
    
    // Initialize storage
    initializeStorage();
    
    if (!global.groupLocks || !global.groupLocks[threadID]) return;
    
    const locks = global.groupLocks[threadID];
    
    console.log(`[GroupLock] Event: ${type} in thread ${threadID}`);
    console.log(`[GroupLock] LogData:`, logMessageData);
    
    try {
        // Enhanced group name change detection
        const nameChangeEvents = [
            "log:thread-name",
            "change_thread_name", 
            "log:thread-name-change",
            "thread-name",
            "log:thread-color" // Sometimes bundled with name changes
        ];
        
        if (nameChangeEvents.includes(type) && locks.name) {
            console.log("[GroupLock] Processing name change...");
            
            // Wait a moment for changes to take effect
            setTimeout(async () => {
                try {
                    const threadInfo = await api.getThreadInfo(threadID);
                    const currentName = threadInfo.threadName || threadInfo.name;
                    
                    console.log(`[GroupLock] Current: "${currentName}", Locked: "${locks.name}"`);
                    
                    if (currentName && currentName !== locks.name) {
                        console.log("[GroupLock] Name mismatch detected - reverting!");
                        
                        await api.setTitle(locks.name, threadID);
                        api.sendMessage(
                            `🔒 **Group Name Protected!**\n\n` +
                            `❌ Name change rejected\n` +
                            `📝 Locked Name: "${locks.name}"\n` +
                            `🔄 Attempted: "${currentName}"\n` +
                            `⚡ Auto-reverted successfully!`,
                            threadID
                        );
                    }
                } catch (error) {
                    console.log("[GroupLock] Name revert error:", error);
                    api.sendMessage(
                        `⚠️ Group name lock active but cannot revert!\n` +
                        `Check bot admin permissions.`,
                        threadID
                    );
                }
            }, 1500);
        }
        
        // Enhanced member name change detection
        const memberEvents = [
            "log:user-nickname",
            "change_user_nickname", 
            "log:thread-name", // Sometimes member changes trigger this
            "log:subscribe",
            "log:unsubscribe"
        ];
        
        if (memberEvents.includes(type) && locks.members && global.memberNamesLocked[threadID]) {
            console.log("[GroupLock] Processing member name change...");
            
            let changedUserID = null;
            
            // Try to identify changed user
            if (logMessageData) {
                changedUserID = logMessageData.participant_id || 
                               logMessageData.target_id ||
                               logMessageData.user_id ||
                               senderID;
            } else {
                changedUserID = senderID;
            }
            
            // Wait and check all members
            setTimeout(async () => {
                try {
                    const threadInfo = await api.getThreadInfo(threadID);
                    const lockedNames = global.memberNamesLocked[threadID];
                    
                    for (const userID of threadInfo.participantIDs) {
                        if (lockedNames[userID]) {
                            const userInfo = threadInfo.userInfo.find(u => u.id === userID);
                            if (userInfo && userInfo.name !== lockedNames[userID]) {
                                console.log(`[GroupLock] Member ${userID} name changed: "${userInfo.name}" -> "${lockedNames[userID]}"`);
                                
                                try {
                                    await api.changeNickname(lockedNames[userID], threadID, userID);
                                    api.sendMessage(
                                        `🔒 **Member Name Protected!**\n\n` +
                                        `❌ Nickname change rejected\n` +
                                        `👤 Original: "${lockedNames[userID]}"\n` +
                                        `🔄 Attempted: "${userInfo.name}"\n` +
                                        `⚡ Auto-reverted successfully!`,
                                        threadID
                                    );
                                } catch (nickError) {
                                    console.log("[GroupLock] Nickname revert failed:", nickError);
                                }
                                
                                break; // Handle one change at a time
                            }
                        }
                    }
                } catch (error) {
                    console.log("[GroupLock] Member check error:", error);
                }
            }, 5000);
        }
        
        // Enhanced DP change detection
        const dpEvents = [
            "log:thread-image",
            "change_thread_image",
            "log:thread-icon"
        ];
        
        if (dpEvents.includes(type) && locks.dp) {
            console.log("[GroupLock] DP change detected!");
            
            setTimeout(() => {
                api.sendMessage(
                    `🔒 **Group DP Protected!**\n\n` +
                    `❌ DP change detected!\n` +
                    `🖼️ This group's DP is locked\n` +
                    `⚠️ Please restore original DP\n` +
                    `📋 Bot cannot auto-revert DP changes\n` +
                    `🔓 Use /grouplock unlock dp to disable`,
                    threadID
                );
            }, 2000);
        }
        
    } catch (error) {
        console.log("[GroupLock] Event handler error:", error);
    }
};

// Enhanced load function with persistent storage
module.exports.onLoad = function() {
    console.log("[GroupLock] Enhanced Group Protection System v4.0 loaded!");
    
    // Initialize persistent storage
    initializeStorage();
    
    // Enhanced monitoring system
    if (!global.groupLockMonitor) {
        global.groupLockMonitor = setInterval(async () => {
            if (!global.api || !global.groupLocks) return;
            
            const activeGroups = Object.keys(global.groupLocks).length;
            if (activeGroups === 0) return;
            
            console.log(`[GroupLock] Monitor: ${activeGroups} protected groups`);
            
            for (const [threadID, locks] of Object.entries(global.groupLocks)) {
                try {
                    // Skip if no locks active
                    if (!locks.name && !locks.members && !locks.dp) continue;
                    
                    const threadInfo = await global.api.getThreadInfo(threadID);
                    
                    // Monitor name lock
                    if (locks.name) {
                        const currentName = threadInfo.threadName || threadInfo.name;
                        if (currentName && currentName !== locks.name) {
                            console.log(`[GroupLock] Auto-fix: Group name in ${threadID}`);
                            try {
                                await global.api.setTitle(locks.name, threadID);
                            } catch (error) {
                                console.log(`[GroupLock] Auto-fix failed for ${threadID}:`, error.message);
                            }
                        }
                    }
                    
                    // Monitor member names
                    if (locks.members && global.memberNamesLocked[threadID]) {
                        const lockedNames = global.memberNamesLocked[threadID];
                        
                        for (const [userID, originalName] of Object.entries(lockedNames)) {
                            const userInfo = threadInfo.userInfo.find(u => u.id === userID);
                            if (userInfo && userInfo.name !== originalName) {
                                console.log(`[GroupLock] Auto-fix: Member ${userID} name`);
                                try {
                                    await global.api.changeNickname(originalName, threadID, userID);
                                } catch (error) {
                                    console.log(`[GroupLock] Member auto-fix failed:`, error.message);
                                }
                            }
                        }
                    }
                    
                } catch (error) {
                    if (error.error === 2 || error.errorCode === 2) {
                        console.log(`[GroupLock] Removing deleted group ${threadID}`);
                        delete global.groupLocks[threadID];
                        delete global.memberNamesLocked[threadID];
                        delete global.groupDPsLocked[threadID];
                        saveLockData();
                    }
                }
            }
        }, 30000); // Monitor every 30 seconds
        
        console.log("[GroupLock] Enhanced monitoring system started!");
    }
    
    // Auto-save every 5 minutes
    if (!global.groupLockAutoSave) {
        global.groupLockAutoSave = setInterval(() => {
            saveLockData();
            console.log("[GroupLock] Auto-save completed");
        }, 300000); // 5 minutes
    }
};
