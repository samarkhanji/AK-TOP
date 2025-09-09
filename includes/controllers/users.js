module.exports = function ({ models, api }) {
    const Users = models.use('Users');

    /**
     * Get user info from Facebook API
     * @param {string|number} id - User ID
     */
    async function getInfo(id) {
        if (!id) throw new Error("User ID is required");
        
        try {
            const result = await api.getUserInfo(id);
            return result[id];
        } catch (error) {
            console.error('getInfo user error:', error);
            throw new Error(`Failed to get user info: ${error.message}`);
        }
    }

    /**
     * Get user name (from cache or database)
     * @param {string|number} id - User ID
     */
    async function getNameUser(id) {
        if (!id) return "Unknown User";
        
        try {
            // Check global cache first
            if (global.data.userName.has(id)) {
                return global.data.userName.get(id);
            }
            
            // Check if user exists in our system
            if (global.data.allUserID.includes(id)) {
                const userData = await getData(id);
                if (userData && userData.name) {
                    global.data.userName.set(id, userData.name);
                    return userData.name;
                }
            }
            
            // Try to get from Facebook API
            try {
                const userInfo = await getInfo(id);
                if (userInfo && userInfo.name) {
                    global.data.userName.set(id, userInfo.name);
                    return userInfo.name;
                }
            } catch (apiError) {
                console.log('API error for getNameUser:', apiError.message);
            }
            
            return "Facebook User";
        } catch (error) {
            console.error('getNameUser error:', error);
            return "Unknown User";
        }
    }

    /**
     * Get all users with optional filters
     * @param {...*} data - Filter objects or attribute arrays
     */
    async function getAll(...data) {
        var where, attributes;
        
        for (const i of data) {
            if (typeof i != 'object') {
                throw new Error("Parameters must be objects or arrays");
            }
            if (Array.isArray(i)) attributes = i;
            else where = i;
        }
        
        try {
            const results = await Users.findAll({ where, attributes });
            return results.map(e => e.get({ plain: true }));
        } catch (error) {
            console.error('getAll users error:', error);
            throw new Error(`Failed to get users: ${error.message}`);
        }
    }

    /**
     * Get user data from database
     * @param {string|number} userID - User ID
     */
    async function getData(userID) {
        if (!userID) throw new Error("User ID is required");
        
        try {
            const data = await Users.findOne({ where: { userID } });
            return data ? data.get({ plain: true }) : null;
        } catch (error) {
            console.error('getData user error:', error);
            throw new Error(`Failed to get user data: ${error.message}`);
        }
    }

    /**
     * Update user data
     * @param {string|number} userID - User ID
     * @param {Object} options - Update options
     */
    async function setData(userID, options = {}) {
        if (!userID) throw new Error("User ID is required");
        if (typeof options != 'object' || Array.isArray(options)) {
            throw new Error("Options must be an object");
        }
        
        try {
            const user = await Users.findOne({ where: { userID } });
            if (user) {
                await user.update(options);
                
                // Update global cache if name was updated
                if (options.name) {
                    global.data.userName.set(userID, options.name);
                }
                
                return true;
            } else {
                // Create new record if doesn't exist
                await createData(userID, options);
                return true;
            }
        } catch (error) {
            console.error('setData user error:', error);
            throw new Error(`Failed to set user data: ${error.message}`);
        }
    }

    /**
     * Delete user data
     * @param {string|number} userID - User ID
     */
    async function delData(userID) {
        if (!userID) throw new Error("User ID is required");
        
        try {
            const user = await Users.findOne({ where: { userID } });
            if (user) {
                await user.destroy();
                
                // Remove from global cache
                global.data.userName.delete(userID);
                const userIndex = global.data.allUserID.indexOf(userID);
                if (userIndex > -1) {
                    global.data.allUserID.splice(userIndex, 1);
                }
                
                return true;
            }
            return false;
        } catch (error) {
            console.error('delData user error:', error);
            throw new Error(`Failed to delete user data: ${error.message}`);
        }
    }

    /**
     * Create new user record
     * @param {string|number} userID - User ID
     * @param {Object} defaults - Default values
     */
    async function createData(userID, defaults = {}) {
        if (!userID) throw new Error("User ID is required");
        if (typeof defaults != 'object' || Array.isArray(defaults)) {
            throw new Error("Defaults must be an object");
        }
        
        try {
            // Get user info from API if name not provided
            if (!defaults.name) {
                try {
                    const userInfo = await getInfo(userID);
                    if (userInfo && userInfo.name) {
                        defaults.name = userInfo.name;
                    }
                } catch (apiError) {
                    console.log('Could not fetch user info from API:', apiError.message);
                }
            }
            
            const [user, created] = await Users.findOrCreate({ 
                where: { userID }, 
                defaults: {
                    name: null,
                    data: {},
                    ...defaults
                }
            });
            
            // Update global cache
            if (user.name) {
                global.data.userName.set(userID, user.name);
            }
            if (!global.data.allUserID.includes(userID)) {
                global.data.allUserID.push(userID);
            }
            
            return { user: user.get({ plain: true }), created };
        } catch (error) {
            console.error('createData user error:', error);
            throw new Error(`Failed to create user data: ${error.message}`);
        }
    }

    /**
     * Update user name and cache
     * @param {string|number} userID - User ID
     * @param {string} name - New name
     */
    async function updateName(userID, name) {
        if (!userID) throw new Error("User ID is required");
        if (!name || typeof name !== 'string') throw new Error("Name must be a non-empty string");
        
        try {
            await setData(userID, { name });
            global.data.userName.set(userID, name);
            return true;
        } catch (error) {
            console.error('updateName error:', error);
            throw new Error(`Failed to update user name: ${error.message}`);
        }
    }

    /**
     * Get user settings (data field)
     * @param {string|number} userID - User ID
     */
    async function getSettings(userID) {
        if (!userID) throw new Error("User ID is required");
        
        try {
            const userData = await getData(userID);
            return userData ? (userData.data || {}) : {};
        } catch (error) {
            console.error('getSettings error:', error);
            throw new Error(`Failed to get user settings: ${error.message}`);
        }
    }

    /**
     * Update user settings
     * @param {string|number} userID - User ID
     * @param {Object} settings - Settings to update
     */
    async function setSettings(userID, settings = {}) {
        if (!userID) throw new Error("User ID is required");
        if (typeof settings != 'object' || Array.isArray(settings)) {
            throw new Error("Settings must be an object");
        }
        
        try {
            const currentData = await getData(userID);
            const currentSettings = currentData ? (currentData.data || {}) : {};
            const newSettings = { ...currentSettings, ...settings };
            
            await setData(userID, { data: newSettings });
            return true;
        } catch (error) {
            console.error('setSettings error:', error);
            throw new Error(`Failed to set user settings: ${error.message}`);
        }
    }

    /**
     * Check if user is banned
     * @param {string|number} userID - User ID
     */
    async function isBanned(userID) {
        if (!userID) throw new Error("User ID is required");
        
        try {
            const settings = await getSettings(userID);
            return settings.banned === true || settings.banned === 1;
        } catch (error) {
            console.error('isBanned error:', error);
            return false;
        }
    }

    /**
     * Refresh user info from Facebook API
     * @param {string|number} userID - User ID
     */
    async function refreshUserInfo(userID) {
        if (!userID) throw new Error("User ID is required");
        
        try {
            const userInfo = await getInfo(userID);
            if (userInfo && userInfo.name) {
                await setData(userID, { name: userInfo.name });
                global.data.userName.set(userID, userInfo.name);
            }
            return userInfo;
        } catch (error) {
            console.error('refreshUserInfo error:', error);
            throw new Error(`Failed to refresh user info: ${error.message}`);
        }
    }

    return {
        getInfo,
        getNameUser,
        getAll,
        getData,
        setData,
        delData,
        createData,
        updateName,
        getSettings,
        setSettings,
        isBanned,
        refreshUserInfo
    };
};
