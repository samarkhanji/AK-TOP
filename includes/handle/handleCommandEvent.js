module.exports = function ({ api, models, Users, Threads, Currencies }) {
    const logger = require("../../utils/log.js");
    
    return function ({ event }) {
        const { allowInbox } = global.config;
        const { userBanned, threadBanned } = global.data;
        const { commands, eventRegistered } = global.client;
        
        var { senderID, threadID } = event;
        senderID = String(senderID);
        threadID = String(threadID);
        
        if (userBanned.has(senderID) || 
            threadBanned.has(threadID) || 
            (allowInbox == false && senderID == threadID)) {
            return;
        }
        
        for (const eventReg of eventRegistered) {
            const cmd = commands.get(eventReg);
            if (!cmd || !cmd.handleEvent) continue;
            
            var getText2;
            if (cmd.languages && typeof cmd.languages == 'object') {
                getText2 = (...values) => {
                    const commandModule = cmd.languages || {};
                    if (!commandModule.hasOwnProperty(global.config.language)) {
                        return api.sendMessage(
                            global.getText('handleCommand','notFoundLanguage', cmd.config.name), 
                            threadID
                        ); 
                    }
                    
                    var lang = cmd.languages[global.config.language][values[0]] || '';
                    for (var i = values.length - 1; i >= 0; i--) {
                        const expReg = RegExp('%' + (i + 1), 'g');
                        lang = lang.replace(expReg, values[i]);
                    }
                    return lang;
                };
            } else {
                getText2 = () => {};
            }

            try {
                const Obj = {
                    event: event,
                    api: api,
                    models: models,
                    Users: Users,
                    Threads: Threads,
                    Currencies: Currencies,
                    getText: getText2
                };
                
                cmd.handleEvent(Obj);
            } catch (error) {
                logger(global.getText('handleCommandEvent', 'moduleError', cmd.config.name), 'error');
            }
        }
    };
};
