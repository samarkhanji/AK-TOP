const Sequelize = require("sequelize");
const { resolve } = require("path");
const { DATABASE } = global.config;

// Get database configuration
const dialect = Object.keys(DATABASE)[0];
const storage = resolve(__dirname, `../${DATABASE[dialect].storage}`);

// Create Sequelize instance with optimized settings
const sequelize = new Sequelize({
    dialect,
    storage,
    pool: {
        max: 20,
        min: 0,
        acquire: 60000,
        idle: 20000
    },
    retry: {
        match: [
            /SQLITE_BUSY/,
            /SQLITE_LOCKED/,
            /database is locked/
        ],
        name: 'query',
        max: 20
    },
    logging: false,
    transactionType: 'IMMEDIATE',
    define: {
        underscored: false,
        freezeTableName: true,
        charset: 'utf8',
        dialectOptions: {
            collate: 'utf8_general_ci'
        },
        timestamps: true
    },
    sync: {
        force: false
    }
});

module.exports = {
    sequelize,
    Sequelize
};
