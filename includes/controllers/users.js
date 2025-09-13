module.exports = function ({ models, api }) {
    const Users = models.use('Users');

    /**
     * Sanitize user name to prevent validation errors
     * @param {string} name - Raw name
     * @returns {string} Sanitized name
     */
    function sanitizeName(name) {
        if (!name || typeof name !== 'string') return "Facebook User";
        
        // Remove special characters that might cause issues
        let cleanName = name.replace(/[^\w\s\u00C0-\u017F\u1EA0-\u1EF9]/g, '');
        
        // Trim whitespace
        cleanName = cleanName.trim();
        
        // Ensure it's not empty after cleaning
        if (!cleanName || cleanName.length === 0) {
            cleanName = "Facebook User";
        }
        
        // Limit to 200 characters (safe margin below 255)
        if (cleanName.length > 200) {
            cleanName = cleanName.substring(0, 200).trim();
        }
        
        return cleanName;
    }

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
                    const safeName = sanitizeName(userData.name);
                    global.data.userName.set(id, safeName);
                    return safeName;
                }
            }
            
            // Try to get from Facebook API
            try {
                const userInfo = await getInfo(id);
                if (userInfo && userInfo.name) {
                    const safeName = sanitizeName(userInfo.name);
                    global.data.userName.set(id, safeName);
                    return safeName;
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
     * Update user data with sanitization
     * @param {string|number} userID - User ID
     * @param {Object} options - Update options
     */
    async function setData(userID, options = {}) {
        if (!userID) throw new Error("User ID is required");
        if (typeof options != 'object' || Array.isArray(options)) {
            throw new Error("Options must be an object");
        }
        
        try {
            // Sanitize name if provided
            if (options.name) {
                options.name = sanitizeName(options.name);
            }
            
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
     * Create new user record with enhanced validation
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
                        defaults.name = sanitizeName(userInfo.name);
                    }
                } catch (apiError) {
                    console.log('Could not fetch user info from API:', apiError.message);
                    defaults.name = "Facebook User";
                }
            } else {
                // Sanitize provided name
                defaults.name = sanitizeName(defaults.name);
            }
            
            // Ensure we have a valid name
            if (!defaults.name || defaults.name.length === 0) {
                defaults.name = "Facebook User";
            }
            
            console.log(`[Users] Creating user ${userID} with name: "${defaults.name}" (length: ${defaults.name.length})`);
            
            const [user, created] = await Users.findOrCreate({ 
                where: { userID }, 
                defaults: {
                    name: defaults.name,
                    data: defaults.data || {},
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
            
            if (created) {
                console.log(`[Users] Successfully created user: ${userID}`);
            }
            
            return { user: user.get({ plain: true }), created };
        } catch (error) {
            console.error(`[Users] createData error for ${userID}:`, error);
            
            // If it's a validation error, try with a simple fallback name
            if (error.message && error.message.includes('ValidationError')) {
                console.log(`[Users] Validation error, retrying with fallback name for ${userID}`);
                try {
                    const [user, created] = await Users.findOrCreate({ 
                        where: { userID }, 
                        defaults: {
                            name: `User_${String(userID).slice(-6)}`, // Simple fallback
                            data: defaults.data || {}
                        }
                    });
                    
                    console.log(`[Users] Successfully created user with fallback name: ${userID}`);
                    return { user: user.get({ plain: true }), created };
                    
                } catch (fallbackError) {
                    console.error(`[Users] Fallback creation also failed for ${userID}:`, fallbackError);
                    throw new Error(`Failed to create user data even with fallback: ${fallbackError.message}`);
                }
            }
            
            throw new Error(`Failed to create user data: ${error.message}`);
        }
    }

    /**
     * Update user name and cache with sanitization
     * @param {string|number} userID - User ID
     * @param {string} name - New name
     */
    async function updateName(userID, name) {
        if (!userID) throw new Error("User ID is required");
        if (!name || typeof name !== 'string') throw new Error("Name must be a non-empty string");
        
        try {
            const safeName = sanitizeName(name);
            await setData(userID, { name: safeName });
            global.data.userName.set(userID, safeName);
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
     * Refresh user info from Facebook API with sanitization
     * @param {string|number} userID - User ID
     */
    async function refreshUserInfo(userID) {
        if (!userID) throw new Error("User ID is required");
        
        try {
            const userInfo = await getInfo(userID);
            if (userInfo && userInfo.name) {
                const safeName = sanitizeName(userInfo.name);
                await setData(userID, { name: safeName });
                global.data.userName.set(userID, safeName);
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
