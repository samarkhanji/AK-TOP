module.exports = function (input) {
    const force = false;

    // Initialize all models
    const Users = require("./models/users")(input);
    const Threads = require("./models/threads")(input);
    const Currencies = require("./models/currencies")(input);

    // Sync all models with database
    const syncModels = async () => {
        try {
            await Users.sync({ force });
            await Threads.sync({ force });
            await Currencies.sync({ force });
            console.log("✅ Database models synced successfully");
        } catch (error) {
            console.error("❌ Database sync error:", error);
        }
    };

    // Run sync
    syncModels();

    return {
        model: {
            Users,
            Threads,
            Currencies
        },
        use: function (modelName) {
            return this.model[modelName];
        },
        // Helper function to get all models
        getAllModels: function() {
            return this.model;
        },
        // Helper function to check if model exists
        hasModel: function(modelName) {
            return !!this.model[modelName];
        }
    };
};
