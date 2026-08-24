/**
 * Código com algumas funções (úteis) que são usadas
 * ao longo do projeto inteiro.
 */

// Imports
const {PerfilVendedor, Produto, Avaliacao, User} = require('./db');
const {Op} = require('sequelize');

function exigirLogin(req, res, next) {
    if (req.session?.user?.id) next();
    else res.redirect('/login');
}

function exigirUsuarioDeslogado(req, res, next) {
    if (!req.session?.user?.id) next();
    else res.redirect('/');
}

/**
 * Verifica se o usuário local tem um perfil de vendedor.S
 */
async function exigirVendedor(req, res, next) {
    let idLocal = req.session?.user?.id;
    if (idLocal && await existePerfilVendedor(idLocal)) next();
    else res.redirect('/cadastro-vendedor');
}
/**
 * Verifica se o usuário local tem um perfil de vendedor.
 */

function exigirAdmin(req, res, next) {
    if (req.session?.user?.role === 'admin') {
        next();
    } else {
        res.status(403).render('acesso-negado');
    }
}

/**
 * Retorna se existe um perfil de vendedor com o id dado.
 * @param id o id que se deseja obter a existência do perfil de vendedor
 * @returns {Promise<boolean>} promessa com um booleano que é verdadeiro caso exista um perfil.
 */
async function existePerfilVendedor(id) {
    const lojaJaExiste = await getPerfilVendedor(id);
    return !!lojaJaExiste; // not (not (...)) retorna um booleano ao invés do objeto!
}

/**
 * Obtém os produtos de acordo com os ids passados.
 * @param {Array<Number>} ids ids dos produtos que se deseja obter
 * @returns {Promise<Array<Produto>>}
 */
async function getProdutosFromIds(ids) {
    console.log("os ids sao: ")
    console.log(ids)
    return await Produto.findAll({
        where: {
            id: ids
        }
    });
}

/**
 * Obtém o produto com o id dado, ou null se não houver.
 * @param id o id do produto que se deseja obter
 * @returns {Promise<Produto|null>} Uma promessa com o produto com o id dado
 */
async function getProdutoFromId(id) {
    const produtos = await getProdutosFromIds([id]);
    return produtos[0] || null;
}

/**
 * Obtém o perfil de vendedor do usuário dado.
 * @param idUser o id do usuário para o qual se deseja obter o perfil de vendedor
 * @returns {Promise<PerfilVendedor|null>}
 */
async function getPerfilVendedor(idUser) {
    return await PerfilVendedor.findOne({where: {idUser}});
}

/**
 * Obtém todas as avaliações de um produto pelo id, incluindo os dados do usuário.
 * @param produtoId o id do produto
 * @returns {Promise<Array<Avaliacao>>}
 */
async function getAvaliacoesFromProduto(produtoId) {
    return await Avaliacao.findAll({
        where: { produtoId },
        include: [{
            model: User,
            as: 'user',
            attributes: ['id', 'username']
        }],
        order: [['createdAt', 'DESC']]
    });
}

/**
 * Obtém todos os produtos de uma determinada categoria.
 * @param {string} categoria
 * @returns {Promise<Array<Produto>>}
 */
async function getProdutosByCategoria(categoria) {
    if (!categoria) return [];
    return await Produto.findAll({
        where: {
            categoria: {
                [Op.like]: `%${categoria}%`
            }
        }
    });
}


// Exporta as funções
module.exports = {
    exigirLogin,
    exigirUsuarioDeslogado,
    exigirVendedor,
    existePerfilVendedor,
    getProdutosFromIds,
    exigirAdmin,
    getProdutoFromId,
    getPerfilVendedor,
    getAvaliacoesFromProduto,
    getProdutosByCategoria
};