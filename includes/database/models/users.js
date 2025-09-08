module.exports = function({ sequelize, Sequelize }) {
    const Users = sequelize.define('Users', {
        num: {
            type: Sequelize.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        userID: {
            type: Sequelize.BIGINT,
            unique: true,
            allowNull: false,
            validate: {
                notNull: {
                    msg: 'User ID is required'
                },
                notEmpty: {
                    msg: 'User ID cannot be empty'
                }
            }
        },
        name: {
            type: Sequelize.STRING,
            allowNull: true,
            validate: {
                len: {
                    args: [1, 255],
                    msg: 'Name must be between 1 and 255 characters'
                }
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
                fields: ['userID']
            }
        ],
        hooks: {
            beforeCreate: (user, options) => {
                if (!user.data) {
                    user.data = {};
                }
            },
            beforeUpdate: (user, options) => {
                if (!user.data) {
                    user.data = {};
                }
            }
        }
    });

    return Users;
};
