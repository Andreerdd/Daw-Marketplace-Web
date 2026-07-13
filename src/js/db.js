const { Sequelize, DataTypes } = require('sequelize');
const bcrypt = require('bcryptjs');

// Inicializa o banco de dados SQLite
const sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: './database.sqlite'
});


// TODO: definição dos modelos do banco de dados
// Definição do Modelo User (não tá pronta)
const User = sequelize.define('User', {
    username: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    },
    password: {
        type: DataTypes.STRING,
        allowNull: false
    }
}, {
    hooks: {
        // Para gerar o hash da senha antes de salvar
        beforeCreate: async (user) => {
            const salt = await bcrypt.genSalt(10);
            user.password = await bcrypt.hash(user.password, salt);
        }
    }
});

// Sincroniza o banco
sequelize.sync().then( );

module.exports = { sequelize, User };