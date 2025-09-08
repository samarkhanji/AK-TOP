module.exports = function ({ api, models, Users, Threads, Currencies }) {
    const stringSimilarity = require('string-similarity');
    const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const logger = require("../../utils/log.js");
    const axios = require('axios');
    const moment = require("moment-timezone");
    
    return async function ({ event }) {
        const dateNow = Date.now();
        const time = moment.tz("Asia/Kolkata").format("HH:mm:ss DD/MM/YYYY");
        
        const { 
            allowInbox, 
            PREFIX, 
            ADMINBOT, 
            NDH, 
            DeveloperMode, 
            adminOnly, 
            ndhOnly, 
            adminPaOnly 
        } = global.config;
        
        const { 
            userBanned, 
            threadBanned, 
            threadInfo, 
            threadData, 
            commandBanned 
        } = global.data;
        
        const { commands, cooldowns } = global.client;
        
        var { body, senderID, threadID, messageID } = event;
        senderID = String(senderID);
        threadID = String(threadID);
        
        const threadSetting = threadData.get(threadID) || {};
        const currentPrefix = threadSetting.hasOwnProperty("PREFIX") ? threadSetting.PREFIX : PREFIX;
        const prefixRegex = new RegExp(`^(<@!?${senderID}>|${escapeRegex(currentPrefix)})\\s*`);
        
        if (!prefixRegex.test(body)) return;

        const adminbot = require('./../../config.json');

        // Admin PA only check
        if (!global.data.allThreadID.includes(threadID) && 
            !ADMINBOT.includes(senderID) && 
            adminbot.adminPaOnly == true) {
            return api.sendMessage("MODE » Only admins can use bots in their own inbox", threadID, messageID);
        }

        // Admin only check
        if (!ADMINBOT.includes(senderID) && adminbot.adminOnly == true) {
            return api.sendMessage('MODE » Only admins can use bots', threadID, messageID);
        }

        // NDH only check
        if (!NDH.includes(senderID) && 
            !ADMINBOT.includes(senderID) && 
            adminbot.ndhOnly == true) {
            return api.sendMessage('MODE » Only bot support can use bots', threadID, messageID);
        }

        // Admin box check
        try {
            const dataAdbox = require('../../Aman/commands/cache/data.json');
            var threadInf = (threadInfo.get(threadID) || await Threads.getInfo(threadID));
            const findd = threadInf.adminIDs.find(el => el.id == senderID);
            
            if (dataAdbox.adminbox && 
                dataAdbox.adminbox.hasOwnProperty(threadID) && 
                dataAdbox.adminbox[threadID] == true && 
                !ADMINBOT.includes(senderID) && 
                !findd && 
                event.isGroup == true) {
                return api.sendMessage('MODE » Only admins can use bots', event.threadID, event.messageID);
            }
        } catch (err) {
            // If data.json doesn't exist, continue without admin box check
        }

        // Ban checks
        if (userBanned.has(senderID) || 
            threadBanned.has(threadID) || 
            (allowInbox == false && senderID == threadID)) {
            
            if (!ADMINBOT.includes(senderID)) {
                if (userBanned.has(senderID)) {
                    const { reason, dateAdded } = userBanned.get(senderID) || {};
                    return api.sendMessage(
                        global.getText("handleCommand", "userBanned", reason, dateAdded), 
                        threadID, 
                        async (err, info) => {
                            await new Promise(resolve => setTimeout(resolve, 5 * 1000));
                            return api.unsendMessage(info.messageID);
                        }, 
                        messageID
                    );
                } else if (threadBanned.has(threadID)) {
                    const { reason, dateAdded } = threadBanned.get(threadID) || {};
                    return api.sendMessage(
                        global.getText("handleCommand", "threadBanned", reason, dateAdded), 
                        threadID, 
                        async (err, info) => {
                            await new Promise(resolve => setTimeout(resolve, 5 * 1000));
                            return api.unsendMessage(info.messageID);
                        }, 
                        messageID
                    );
                }
            }
        }

        // Parse command
        const [matchedPrefix] = body.match(prefixRegex);
        const args = body.slice(matchedPrefix.length).trim().split(/ +/);
        const commandName = args.shift().toLowerCase();
        
        var command = commands.get(commandName);
        
        // Command not found - suggest similar
        if (!command) {
            var allCommandName = [];
            const commandValues = commands.keys();
            for (const cmd of commandValues) allCommandName.push(cmd);
            
            const checker = stringSimilarity.findBestMatch(commandName, allCommandName);
            if (checker.bestMatch.rating >= 0.5) {
                command = commands.get(checker.bestMatch.target);
            } else {
                return api.sendMessage(
                    global.getText("handleCommand", "commandNotExist", checker.bestMatch.target), 
                    threadID
                );
            }
        }

        // Command ban checks
        if (commandBanned.get(threadID) || commandBanned.get(senderID)) {
            if (!ADMINBOT.includes(senderID)) {
                const banThreads = commandBanned.get(threadID) || [];
                const banUsers = commandBanned.get(senderID) || [];
                
                if (banThreads.includes(command.config.name)) {
                    return api.sendMessage(
                        global.getText("handleCommand", "commandThreadBanned", command.config.name), 
                        threadID, 
                        async (err, info) => {
                            await new Promise(resolve => setTimeout(resolve, 5 * 1000));
                            return api.unsendMessage(info.messageID);
                        }, 
                        messageID
                    );
                }
                
                if (banUsers.includes(command.config.name)) {
                    return api.sendMessage(
                        global.getText("handleCommand", "commandUserBanned", command.config.name), 
                        threadID, 
                        async (err, info) => {
                            await new Promise(resolve => setTimeout(resolve, 5 * 1000));
                            return api.unsendMessage(info.messageID);
                        }, 
                        messageID
                    );
                }
            }
        }

        // NSFW check
        if (command.config.commandCategory && 
            command.config.commandCategory.toLowerCase() == 'nsfw' && 
            !global.data.threadAllowNSFW.includes(threadID) && 
            !ADMINBOT.includes(senderID)) {
            return api.sendMessage(
                global.getText("handleCommand", "threadNotAllowNSFW"), 
                threadID, 
                async (err, info) => {
                    await new Promise(resolve => setTimeout(resolve, 5 * 1000));
                    return api.unsendMessage(info.messageID);
                }, 
                messageID
            );
        }

        // Get thread info
        var threadInfo2;
        if (event.isGroup == true) {
            try {
                threadInfo2 = (threadInfo.get(threadID) || await Threads.getInfo(threadID));
                if (Object.keys(threadInfo2).length == 0) throw new Error();
            } catch (err) {
                logger(global.getText("handleCommand", "cantGetInfoThread"), "error");
            }
        }

        // Permission check
        var permssion = 0;
        var threadInfoo = (threadInfo.get(threadID) || await Threads.getInfo(threadID));
        const find = threadInfoo.adminIDs.find(el => el.id == senderID);
        
        if (NDH.includes(senderID)) permssion = 2;
        if (ADMINBOT.includes(senderID)) permssion = 3;
        else if (!ADMINBOT.includes(senderID) && !NDH.includes(senderID) && find) permssion = 1;
        
        if (command.config.hasPermssion > permssion) {
            return api.sendMessage(
                global.getText("handleCommand", "permssionNotEnough", command.config.name), 
                event.threadID, 
                event.messageID
            );
        }

        // Cooldown check
        if (!cooldowns.has(command.config.name)) {
            cooldowns.set(command.config.name, new Map());
        }
        
        const timestamps = cooldowns.get(command.config.name);
        const expirationTime = (command.config.cooldowns || 1) * 1000;
        
        if (timestamps.has(senderID) && dateNow < timestamps.get(senderID) + expirationTime) {
            const timeLeft = ((timestamps.get(senderID) + expirationTime - dateNow) / 1000).toFixed(1);
            return api.sendMessage(
                `You just used this command. Please wait ${timeLeft} seconds before using it again.`, 
                threadID, 
                messageID
            );
        }

        // Language support
        var getText2;
        if (command.languages && 
            typeof command.languages == 'object' && 
            command.languages.hasOwnProperty(global.config.language)) {
            getText2 = (...values) => {
                var lang = command.languages[global.config.language][values[0]] || '';
                for (var i = values.length; i > 1; i--) {
                    const expReg = RegExp('%' + i, 'g');
                    lang = lang.replace(expReg, values[i]);
                }
                return lang;
            };
        } else {
            getText2 = () => {};
        }

        // Execute command
        try {
            const Obj = {
                api: api,
                event: event,
                args: args,
                models: models,
                Users: Users,
                Threads: Threads,
                Currencies: Currencies,
                permssion: permssion,
                getText: getText2
            };
            
            command.run(Obj);
            timestamps.set(senderID, dateNow);
            
            if (DeveloperMode == true) {
                logger(
                    global.getText(
                        "handleCommand", 
                        "executeCommand", 
                        time, 
                        commandName, 
                        senderID, 
                        threadID, 
                        args.join(" "), 
                        (Date.now()) - dateNow
                    ), 
                    "[ DEV MODE ]"
                );
            }
            
            return;
        } catch (e) {
            return api.sendMessage(
                global.getText("handleCommand", "commandError", commandName, e), 
                threadID
            );
        }
    };
};
