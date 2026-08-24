/**
 * Código que guarda os modelos e outras coisas relacionadas ao
 * banco de dados do projeto.
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
    },
    role: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'cliente',
        validate: {
            isIn: [['cliente', 'admin']]
        }
    },
    bloqueado: {
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
    },
    idProdutos: {
        // NOTA: aqui, são guardados os IDS (pra evitar q o produto daqui não fique sincronizado)!

        // NOTA 2: não dá pra usar DataTypes.ARRAY no Sqlite! Por isso, troquei para JSON
        type: DataTypes.JSON, // array de ids
        defaultValue: [] // o valor padrão é vazio
    }
});

const Categoria = sequelize.define('Categoria', {});

const Produto = sequelize.define('Produto', {
    id: {
        type: ID_DATA_TYPE,
        unique: true,
        primaryKey: true,
        autoIncrement: true
    },
    vendedorId: {
        type: ID_DATA_TYPE,
        allowNull: false
    },
    nome: {
        type: DataTypes.STRING,
        allowNull: false
    },
    descricao: {
        type: DataTypes.STRING,
        allowNull: false
    },
    categoria: {
        type: DataTypes.STRING
    },
    preco: {
        type: DataTypes.FLOAT,
        allowNull: false
    },
    imagem: {
        type: DataTypes.STRING, // link
        allowNull: false
    },
    pecas: {
        type: DataTypes.INTEGER
    },
    cartas: {
        type: DataTypes.INTEGER
    }
});
const Carrinho = sequelize.define('Carrinho', {});
const ItemCarrinho = sequelize.define('ItemCarrinho', {});
const Pedido = sequelize.define('Pedido', {});
const ItemPedido = sequelize.define('ItemPedido', {});
const Conversa = sequelize.define('Conversa', {
    id: {
        type: ID_DATA_TYPE,
        unique: true,
        primaryKey: true,
        autoIncrement: true
    },
    user1Id: {
        type: ID_DATA_TYPE,
        allowNull: false
    },
    user2Id: {
        type: ID_DATA_TYPE,
        allowNull: false
    }
});
const Mensagem = sequelize.define('Mensagem', {
    id: {
        type: ID_DATA_TYPE,
        unique: true,
        primaryKey: true,
        autoIncrement: true
    },
    conversaId: {
        type: ID_DATA_TYPE,
        allowNull: false
    },
    remetenteId: {
        type: ID_DATA_TYPE,
        allowNull: false
    },
    conteudo: {
        type: DataTypes.TEXT,
        allowNull: false
    }
});
const Avaliacao = sequelize.define('Avaliacao', {
    id: {
        type: ID_DATA_TYPE,
        unique: true,
        primaryKey: true,
        autoIncrement: true
    },
    produtoId: {
        type: ID_DATA_TYPE,
        allowNull: false
    },
    userId: {
        type: ID_DATA_TYPE,
        allowNull: false
    },
    mensagem: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    nota: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: {
            min: 1,
            max: 5
        }
    },
    status: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'aprovada',
        validate: {
            isIn: [['aprovada', 'pendente', 'oculta']]
        }
    }
});

// Associações (aquele trem do fantini de 1:m, n:m e tal)
// "mysql workbench" em código s2
Avaliacao.belongsTo(User, { foreignKey: 'userId', as: 'user' });
User.hasMany(Avaliacao, { foreignKey: 'userId', as: 'avaliacoes' });
Avaliacao.belongsTo(Produto, { foreignKey: 'produtoId', as: 'produto' });
Produto.hasMany(Avaliacao, { foreignKey: 'produtoId', as: 'avaliacoes' });

Conversa.belongsTo(User, { foreignKey: 'user1Id', as: 'user1' });
Conversa.belongsTo(User, { foreignKey: 'user2Id', as: 'user2' });
User.hasMany(Conversa, { foreignKey: 'user1Id', as: 'conversasComoUser1' });
User.hasMany(Conversa, { foreignKey: 'user2Id', as: 'conversasComoUser2' });

Mensagem.belongsTo(Conversa, { foreignKey: 'conversaId', as: 'conversa' });
Conversa.hasMany(Mensagem, { foreignKey: 'conversaId', as: 'mensagens' });
Mensagem.belongsTo(User, { foreignKey: 'remetenteId', as: 'remetente' });
User.hasMany(Mensagem, { foreignKey: 'remetenteId', as: 'mensagensEnviadas' });

const HistoricoEstadoPedido = sequelize.define('HistoricoEstadoPedido', {});

// Sincroniza o banco
sequelize.sync().then();

module.exports = {
    sequelize,
    User,
    PerfilVendedor,
    Categoria,
    Produto,
    Carrinho,
    ItemCarrinho,
    Pedido,
    ItemPedido,
    Conversa,
    Mensagem,
    Avaliacao,
    HistoricoEstadoPedido
};