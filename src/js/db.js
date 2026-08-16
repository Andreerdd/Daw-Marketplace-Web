/**
 * Código que guarda os modelos e outras coisas relacionadas ao
 * banco de dados do projeto.
 *
 * @author André Dias
 * @author Gabriel Della Gaspera
 */

const {Sequelize, DataTypes} = require('sequelize');
const bcrypt = require('bcryptjs');

// Inicializa o banco de dados SQLite
const sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: './database.sqlite'
});

// Tipo de valor que o ID é
const ID_DATA_TYPE = DataTypes.BIGINT;

/* Modelos */

/*
Dicas:
    - Acesse aqui para obter todos os tipos de valores do sequelize: https://sequelize.org/docs/v7/models/data-types/
 */

// TODO: definição dos modelos do banco de dados
const User = sequelize.define('User', {
    id: {
        type: ID_DATA_TYPE,
        unique: true,
        primaryKey: true,
        autoIncrement: true
    },
    email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    },
    username: {
        type: DataTypes.STRING,
        allowNull: false
    },
    password: {
        type: DataTypes.STRING,
        allowNull: false
    },
    vendor: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
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

const Endereco = sequelize.define('Endereco', {
    rua: {
        type: DataTypes.STRING,
        allowNull: false
    },
    numero: {
        type: DataTypes.STRING, // string é melhor de lidar do que número
        allowNull: false
    },
    bairro: {
        type: DataTypes.STRING,
        allowNull: false
    },
    cidade: {
        type: DataTypes.STRING,
        allowNull: false
    },
    pais: {
        type: DataTypes.STRING,
        allowNull: false
    },
    complemento: {
        type: DataTypes.STRING
    }
});

const PerfilVendedor = sequelize.define('PerfilVendedor', {
    idUser: {
        type: ID_DATA_TYPE,
        allowNull: false,
        unique: true
    },
    nomeLoja: {
        type: DataTypes.STRING,
        allowNull: false
    },
    logoLoja: {
        type: DataTypes.STRING,
        allowNull: false
    }
});
const Categoria = sequelize.define('Categoria', {});

const Produto = sequelize.define('Produto', {
    id: {
        type: ID_DATA_TYPE,
        primaryKey: true,
        allowNull: false,
        unique: true
    },
    nome: {
        type: DataTypes.STRING,
        allowNull: false
    },
    preco: {
        type: DataTypes.FLOAT,
        allowNull: false
    },
    imagem: {
        type: DataTypes.STRING, // link
        allowNull: false
    },
});
const Carrinho = sequelize.define('Carrinho', {});
const ItemCarrinho = sequelize.define('ItemCarrinho', {});
const Pedido = sequelize.define('Pedido', {});
const ItemPedido = sequelize.define('ItemPedido', {});
const Avaliacao = sequelize.define('Avaliacao', {});
const HistoricoEstadoPedido = sequelize.define('HistoricoEstadoPedido', {});

// Sincroniza o banco
sequelize.sync().then();

module.exports = { sequelize, User, PerfilVendedor };
