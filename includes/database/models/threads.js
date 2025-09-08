module.exports = function({ sequelize, Sequelize }) {
    const Threads = sequelize.define('Threads', {
        num: {
            type: Sequelize.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        threadID: {
            type: Sequelize.BIGINT,
            unique: true,
            allowNull: false,
            validate: {
                notNull: {
                    msg: 'Thread ID is required'
                },
                notEmpty: {
                    msg: 'Thread ID cannot be empty'
                }
            }
        },
        threadInfo: {
            type: Sequelize.JSON,
            defaultValue: {},
            get() {
                const rawValue = this.getDataValue('threadInfo');
                return rawValue || {};
            }
        },
        data: {
            type: Sequelize.JSON,
            defaultValue: {},
            get() {
                const rawValue = this.getDataValue('data');
                return rawValue || {};
            }
        }
    }, {
        indexes: [
            {
                unique: true,
                fields: ['threadID']
            }
        ],
        hooks: {
            beforeCreate: (thread, options) => {
                if (!thread.threadInfo) {
                    thread.threadInfo = {};
                }
                if (!thread.data) {
                    thread.data = {};
                }
            },
            beforeUpdate: (thread, options) => {
                if (!thread.threadInfo) {
                    thread.threadInfo = {};
                }
                if (!thread.data) {
                    thread.data = {};
                }
            }
        }
    });

    return Threads;
};
