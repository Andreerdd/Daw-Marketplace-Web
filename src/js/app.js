/**
 * Código principal do projeto.
 */

// Imports
const {
    exigirLogin,
    exigirUsuarioDeslogado,
    exigirVendedor,
    exigirAdmin,
    existePerfilVendedor,
    getProdutosFromIds,
    getProdutoFromId,
    getPerfilVendedor,
    getAvaliacoesFromProduto,
    getProdutosByCategoria
} = require('./utils');
const {
    sequelize,
    User,
    PerfilVendedor,
    Categoria,
    Produto,
    Carrinho,
    ItemCarrinho,
    Pedido,
    ItemPedido,
    Avaliacao,
    HistoricoEstadoPedido
} = require('./db');
const { Op } = require('sequelize');


const express = require('express');
const session = require('express-session');
const http = require('http');
const {Server} = require('socket.io');
const path = require('path');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const upload = multer({dest: path.join(__dirname, '../views/uploads/')});

const app = express();
const server = http.createServer(app);
const io = new Server(server);

//se algm mudar isso aqui é ban
const TAMANHO_MINIMO_SENHA = 6 // 67

const mapCategorias = {
    'jogos-de-cartas': 'Jogos de Cartas',
    'jogos-de-tabuleiro': 'Jogos de Tabuleiro',
    'cartas': 'Jogos de Cartas',
    'tabuleiro': 'Jogos de Tabuleiro',
    'outros': 'Outros'
};

// Configuração do EJS
app.set('views', path.join(__dirname, '../views'));
app.set('view engine', 'ejs');

app.use(express.urlencoded({extended: true}));

// Define a pasta estática (imagens, css, site, etc)
app.use(express.static(path.join(__dirname, '../views')));
// Define o jQuery
app.use('/scripts', express.static(path.join(__dirname, '../../node_modules/jquery/dist')));
// Define o bootstrap
app.use('/bootstrap', express.static(path.join(__dirname, '../../node_modules/bootstrap/dist')));

// Configuração da Sessão
app.use(session({
    secret: 'segredo_super_seguro_do_stop',
    resave: false,
    saveUninitialized: false
}));

// Rota para a página inical
app.get('/', async (req, res) => {
    try {
        const produtos = await Produto.findAll();
        return res.render('index', {
            produtos: produtos || [],
            username: req.session?.user?.username || null
        });
    } catch (err) {
        console.error(err);
        return res.render('index', {
            produtos: [],
            username: req.session?.user?.username || null
        });
    }
});



app.get(['/categoria/:categoria', '/categoria', '/produtos/categoria/:categoria'], async (req, res) => {
    try {
        const paramCategoria = req.params.categoria || req.query.categoria || '';
        const categoriaFormatada = mapCategorias[paramCategoria.toLowerCase()] || (paramCategoria ? decodeURIComponent(paramCategoria) : '');
        
        let produtos = [];
        if (categoriaFormatada) {
            produtos = await getProdutosByCategoria(categoriaFormatada);
        } else {
            produtos = await Produto.findAll();
        }

        res.render('categoria', {
            nomeCategoria: categoriaFormatada || 'Todos',
            produtos: produtos || [],
            username: req.session?.user?.username || null
        });
    } catch (err) {
        console.error(err);
        res.redirect('/');
    }
});

app.post('/pesquisa', async (req, res) => {
    try {
        const { search } = req.body;
        const termo = search ? search.trim() : '';
        const produtos = termo ? await Produto.findAll({
            where: {
                [Op.or]: [
                    { nome: { [Op.like]: `%${termo}%` } },
                    { descricao: { [Op.like]: `%${termo}%` } },
                    { categoria: { [Op.like]: `%${termo}%` } }
                ]
            }
        }) : await Produto.findAll();

        res.render('categoria', {
            nomeCategoria: termo ? `Busca: "${termo}"` : 'Todos',
            produtos: produtos || [],
            username: req.session?.user?.username || null
        });
    } catch (err) {
        console.error(err);
        res.redirect('/');
    }
});

app.get('/perfil', exigirLogin, (req, res) => {
    return res.render('perfil', {user: req.session?.user, username: req.session?.user?.username});
});

app.get('/dashboard', exigirLogin, async (req, res) => {
    const idUser = req.session.user.id;
    const perfilVendedor = await getPerfilVendedor(idUser);

    const produtos = await getProdutosFromIds(perfilVendedor?.idProdutos || []);
    console.log("============================")
    console.log("Produtos: ")
    console.log(produtos)
    console.log("============================")
    return res.render('dashboard', {
        user: req.session.user,
        username: req.session.user.username,
        isVendor: !!(perfilVendedor), // os dois `!` é para ter certeza q é booleano
        perfilVendedor: perfilVendedor,
        produtos: produtos // obtém os produtos do usuário local
    });
});

app.get('/login', exigirUsuarioDeslogado, (_, res) => {
    res.render('login')
})

app.post('/login', exigirUsuarioDeslogado, async (req, res) => {

    const {email, password} = req.body

    try {

        const user = await User.findOne({where: {email}})

        if (!user) {
            return res.render('login', {mensagem: 'Não encontramos esse usuário!'})
        }

        if (user.bloqueado) {
            return res.render('login', { mensagem: 'Essa conta está bloqueada.'})
        }

        const correctPassword = await bcrypt.compare(password, user.password)

        if (!correctPassword) {
            return res.render('login', {mensagem: 'Senha incorreta!'})
        }

        req.session.user = {
            id: user.id,
            username: user.username,
            email: user.email,
            role: user.role
        }

        res.redirect('/')
    } catch (err) {
        console.error(err)
        res.render('login', {mensagem: 'erro ao fazer o login'})
    }

})

app.get('/cadastro', exigirUsuarioDeslogado, (_, res) => {
    res.render('cadastro')
})

app.get('/novo-produto', exigirVendedor, (_, res) => {
    res.render('cadastro-produto')
})

// obs: coloquei pros 2 links funcionarem :)
app.get(['/editar/:id', '/editar-produto/:id'], exigirVendedor, async (req, res) => {
    try {
        const produtoId = req.params.id;
        const produto = await getProdutoFromId(produtoId);

        if (!produto) {
            return res.redirect('/dashboard');
        }

        if (produto.vendedorId !== req.session.user.id) {
            return res.redirect('/dashboard');
        }

        res.render('editar-produto', {
            produto,
            username: req.session.user.username
        });
    } catch (err) {
        console.error(err);
        res.redirect('/dashboard');
    }
});

app.get('/produto/:id', async (req, res) => {
    try {
        const produtoId = req.params.id;
        const produto = await getProdutoFromId(produtoId);
        if (!produto) {
            return res.redirect('/');
        }
        const loja = await getPerfilVendedor(produto.vendedorId);
        const avaliacoes = await getAvaliacoesFromProduto(produtoId);
        const userId = req.session?.user?.id || null;
        const usuarioJaAvaliou = userId ? avaliacoes.some(a => a.userId === userId) : false;

        res.render('produto', {
            produto,
            loja,
            avaliacoes,
            usuarioJaAvaliou,
            userId,
            username: req.session?.user?.username || null
        });
    } catch (err) {
        console.error(err);
        res.redirect('/');
    }
});

app.get('/comprar/:id', exigirLogin, async (req, res) => {
    try {
        const produtoId = req.params.id;
        const produto = await getProdutoFromId(produtoId);

        if (!produto) {
            return res.redirect('/');
        }

        const loja = await getPerfilVendedor(produto.vendedorId);
        const avaliacoes = await getAvaliacoesFromProduto(produtoId);
        const userId = req.session?.user?.id || null;
        const usuarioJaAvaliou = userId ? avaliacoes.some(a => a.userId === userId) : false;
        console.log("Produto comprado!");

        return res.render('produto', {
            produto,
            loja,
            avaliacoes,
            usuarioJaAvaliou,
            userId,
            username: req.session?.user?.username || null,
            mensagem: 'Produto comprado com sucesso!'
        });
    } catch (err) {
        console.error(err);
        return res.redirect('/');
    }
});

app.post('/produto/:id/avaliacao', exigirLogin, async (req, res) => {
    const produtoId = req.params.id;
    const userId = req.session.user.id;
    const { nota, mensagem } = req.body;

    try {
        const produto = await getProdutoFromId(produtoId);
        if (!produto) {
            return res.redirect('/');
        }

        // Verifica se o usuário já avaliou este produto
        const avaliacaoExistente = await Avaliacao.findOne({
            where: { produtoId, userId }
        });

        if (avaliacaoExistente) {
            return res.redirect(`/produto/${produtoId}`);
        }

        const notaNum = parseInt(nota, 10);
        if (isNaN(notaNum) || notaNum < 1 || notaNum > 5 || !mensagem || mensagem.trim() === '') {
            return res.redirect(`/produto/${produtoId}`);
        }

        await Avaliacao.create({
            produtoId,
            userId,
            nota: notaNum,
            mensagem: mensagem.trim()
        });

        res.redirect(`/produto/${produtoId}`);
    } catch (err) {
        console.error(err);
        res.redirect(`/produto/${produtoId}`);
    }
});

app.post(['/remover-avaliacao/:id', '/avaliacao/remover/:id', '/produto/:produtoId/avaliacao/:id/remover'], exigirLogin, async (req, res) => {
    const avaliacaoId = req.params.id;
    const userId = req.session.user.id;

    try {
        const avaliacao = await Avaliacao.findByPk(avaliacaoId);
        if (!avaliacao) {
            return res.redirect('/');
        }

        // Apenas o autor da mensagem pode apagá-la
        if (avaliacao.userId !== userId) {
            return res.redirect(`/produto/${avaliacao.produtoId}`);
        }

        const produtoId = avaliacao.produtoId;
        await avaliacao.destroy();

        res.redirect(`/produto/${produtoId}`);
    } catch (err) {
        console.error(err);
        res.redirect('/');
    }
});

app.post('/cadastro', exigirUsuarioDeslogado, async (req, res) => {

    console.log(req.body)
    // coleta os dados da pagina
    const {username, email, password} = req.body

    try {

        // verifica se todos os campos foram preenchidos
        if (!username || !email || !password || password.length < TAMANHO_MINIMO_SENHA) {
            return res.render('cadastro', {mensagem: 'Preencha todos os campos corretamente'})
        }

        console.log("cadastro", email)
        // procura um usuario com o email recebido
        console.log("antes do findone")
        const userExisting = await User.findOne({where: {email}})
        console.log("dps do findone", userExisting)

        // se achar, vai nos avisando
        if (userExisting) {
            return res.render('cadastro', {mensagem: `O e-mail '${email}' já está vinculado à uma conta.`})
        }

        // coloca o usuario no database
        const user = await User.create({
            username,
            email,
            password // nao precisa de hash aqui, pois ja esta sendo feito no db.js
        })
        console.log("user criado")


        req.session.user = {
            id: user.id,
            username: user.username,
            email: user.email
        }

        res.redirect('/')
    } catch (err) {
        // se der erro printa no terminal e manda para a pagina
        console.error(err)
        res.render('cadastro', {mensagem: 'erro interno no servidor'})
    }

})

app.post('/atualizar-cadastro', exigirLogin, async (req, res) => {

    const {username} = req.body
    const email = req.session.user.email

    try {
        const userExisting = await User.findOne({where: {email}})

        if (!userExisting) {
            console.log("o usuário de algum jeito não existe!!!!!!!!")
            res.redirect('/perfil#conta')
            return;
        }

        // coloca o usuario no database
        await User.update(
            {username: username},
            {where: {email: email}}
        )

        req.session.user.username = username

        console.log("usuario atualizado")
        res.redirect('/perfil#conta')
    } catch (err) {
        console.error(err)
        res.redirect('/perfil#conta')
    }
})

app.get('/logout', exigirLogin, async (req, res) => {
    req.session.destroy();
    res.redirect('/');
});

app.get('/cadastro-vendedor', exigirLogin, (req, res) => {
    res.render('cadastro-vendedor', {username: req.session.user.username})
})

app.post('/atualizar-vendedor', upload.single('logoLoja'), exigirLogin, async (req, res) => {
    const {nomeLoja} = req.body

    try {
        const vendedorExisting = await PerfilVendedor.findOne({where: {idUser: req.session.user.id}})

        if (!vendedorExisting) {
            console.log("o perfil de vendedor de algum jeito não existe!!!!!!!!")
            res.redirect('/dashboard#dados')
            return;
        }

        const idUser = req.session.user.id
        const perfilVendedor = await getPerfilVendedor(idUser);
        const caminhoImagem = req.file ? `/uploads/${req.file.filename}` : perfilVendedor.logoLoja;
        // coloca o usuario no database
        await PerfilVendedor.update(
            {nomeLoja: nomeLoja, logoLoja: caminhoImagem},
            {where: {idUser: idUser}}
        )

        console.log("perfilVendedor atualizado")
        res.redirect('/dashboard#dados')
    } catch (err) {
        console.error(err)
        res.redirect('/dashboard#dados')
    }
})

app.get('/remover-produto/:id', exigirVendedor, async (req, res) => {
    const idProduto = req.params.id;
    const vendedorId = req.session.user.id;


    try {
        const produto = await getProdutoFromId(idProduto);

        if (!produto) {
            return res.redirect('/dashboard');
        }

        if (produto.vendedorId !== vendedorId) {
            return res.redirect('/dashboard');
        }

        const nomeProduto = produto.nome;

        console.log({idProduto, nomeProduto})

        res.render('remover-produto', {idProduto: idProduto, nomeProduto: nomeProduto})

    } catch (err) {
        console.error(err);
        res.render('remover-produto', {
            idProduto: '',
            nomeProduto: '',
            mensagem: 'Erro interno ao atualizar o produto'
        });
    }
})

app.post('/cadastro-vendedor', upload.single('logoLoja'), exigirLogin, async (req, res) => {

    // coleta os dados da pagina
    const {nomeLoja} = req.body;
    const logoLoja = req.file;
    const idUser = req.session.user.id;

    try {

        // verifica se todos os campos foram preenchidos
        if (!nomeLoja || !logoLoja) {
            return res.render('cadastro-vendedor', {mensagem: 'Preencha todos os campos corretamente'})
        }

        // se achar, vai nos avisando
        if (await existePerfilVendedor(idUser)) {
            return res.redirect('/dashboard')
        }

        const caminhoLogo = req.file ? `/uploads/${req.file.filename}` : null;

        const perfilVendedor = await PerfilVendedor.create({
            idUser,
            nomeLoja,
            logoLoja: caminhoLogo
        })

        console.log("loja cadastrada s2")

        res.redirect('/dashboard')
    } catch (err) {
        // se der erro printa no terminal e manda para a pagina
        console.error(err)
        res.render('cadastro-vendedor', {mensagem: 'erro interno no servidor'})
    }

})

app.post('/novo-produto', upload.single('imagemProduto'), exigirVendedor, async (req, res) => {
    // coleta os dados da pagina
    const {nome, categoria, descricao, preco, pecas, cartas} = req.body;
    const imagemProduto = req.file;
    const vendedorId = req.session.user.id; // o vendedor é o usuário que está atualmente logado

    try {

        // verifica se todos os campos foram preenchidos
        if (!nome || !preco || !imagemProduto) {
            return res.render('cadastro-produto', {mensagem: 'Preencha todos os campos corretamente'})
        }

        const caminhoImagem = req.file ? `/uploads/${req.file.filename}` : null;

        const produto = await Produto.create({
            vendedorId,
            nome,
            categoria: categoria || null,
            descricao,
            preco,
            imagem: caminhoImagem,
            pecas,
            cartas
        })

        // Adiciona o id do produto ao inventário do usuário
        const perfilVendedor = await PerfilVendedor.findOne({where: {idUser: vendedorId}});
        if (perfilVendedor) {
            const produtosAtuais = Array.isArray(perfilVendedor.idProdutos) ? [...perfilVendedor.idProdutos] : [];
            produtosAtuais.push(produto.id);
            perfilVendedor.idProdutos = produtosAtuais;
            perfilVendedor.changed('idProdutos', true);
            await perfilVendedor.save();
        }

        res.redirect('/dashboard')
    } catch (err) {
        // se der erro printa no terminal e manda para a pagina
        console.error(err)
        res.render('cadastro-produto', {mensagem: 'erro interno no servidor'})
    }

})

app.post(['/editar/:id', '/editar-produto/:id'], upload.single('imagemProduto'), exigirVendedor, async (req, res) => {
    const produtoId = req.params.id;
    const {nome, categoria, descricao, preco, pecas, cartas} = req.body;
    const vendedorId = req.session.user.id;

    try {
        const produto = await getProdutoFromId(produtoId);

        if (!produto) {
            return res.redirect('/dashboard');
        }

        if (produto.vendedorId !== vendedorId) {
            return res.redirect('/dashboard');
        }

        if (!nome || !preco || !descricao) {
            return res.render('editar-produto', {
                produto,
                username: req.session.user.username,
                mensagem: 'Preencha todos os campos obrigatórios corretamente'
            });
        }

        const caminhoImagem = req.file ? `/uploads/${req.file.filename}` : produto.imagem;

        await produto.update({
            nome,
            categoria: categoria !== undefined ? categoria : produto.categoria,
            descricao,
            preco: parseFloat(preco),
            imagem: caminhoImagem,
            pecas: (pecas !== undefined && pecas !== '') ? parseInt(pecas, 10) : 0,
            cartas: (cartas !== undefined && cartas !== '') ? parseInt(cartas, 10) : 0
        });

        res.redirect('/dashboard');
    } catch (err) {
        console.error(err);
        const produto = await getProdutoFromId(produtoId);
        res.render('editar-produto', {
            produto,
            username: req.session.user.username,
            mensagem: 'Erro interno ao atualizar o produto'
        });
    }
});

app.post(['/remover/:id', '/remover-produto/:id'], exigirVendedor, async (req, res) => {
    const produtoId = req.params.id;
    const {nome, descricao, preco, pecas, cartas} = req.body;
    const vendedorId = req.session.user.id;

    try {
        const produto = await getProdutoFromId(produtoId);

        if (!produto) {
            return res.redirect('/dashboard');
        }

        if (produto.vendedorId !== vendedorId) {
            return res.redirect('/dashboard');
        }

        await produto.destroy();

        res.redirect('/dashboard');
    } catch (err) {
        console.error(err);
        const produto = await getProdutoFromId(produtoId);
        res.render('editar-produto', {
            produto,
            username: req.session.user.username,
            mensagem: 'Erro interno ao remover o produto'
        });
    }
});

app.get('/admin', exigirAdmin, async (req, res) => {
    try {
        const quantidadeUsuarios = await User.count();
        const quantidadeProdutos = await Produto.count();
        const quantidadeAvaliacoes = await Avaliacao.count();

        res.render('admin/dashboard', {
            user: req.session.user,
            quantidadeUsuarios,
            quantidadeProdutos,
            quantidadeAvaliacoes
        });

    } catch (err) {
        console.error(err);
        res.status(500).render('erro-interno');
    }
});

app.post('/admin/usuarios/:id/bloquear', exigirAdmin, async (req, res) => {
    try {
        const usuario = await User.findByPk(req.params.id);

        if (!usuario) {
            return res.status(404).redirect('/admin/usuarios');
        }

        // Não permite bloquear outro administrador
        if (usuario.role === 'admin') {
            return res.status(403).redirect('/admin/usuarios');
        }

        await usuario.update({
            bloqueado: !usuario.bloqueado
        });

        res.redirect('/admin/usuarios');

    } catch (err) {
        console.error(err);
        res.status(500).redirect('/admin/usuarios');
    }
});

app.get('/admin/produtos', exigirAdmin, async (req, res) => {
    try {
        const produtos = await Produto.findAll();

        res.render('admin/produtos', {
            produtos,
            user: req.session.user
        });

    } catch (err) {
        console.error(err);
        res.status(500).render('erro-interno');
    }
});

app.post('/admin/produtos/:id/remover', exigirAdmin, async (req, res) => {
    try {
        const produto = await Produto.findByPk(req.params.id);

        if (!produto) {
            return res.status(404).redirect('/admin/produtos');
        }

        await produto.destroy();

        res.redirect('/admin/produtos');

    } catch (err) {
        console.error(err);
        res.status(500).redirect('/admin/produtos');
    }
});

//app.get('/admin/usuarios', exigirAdmin, ...);

//app.get('/admin/vendedores', exigirAdmin, ...);

//app.get('/admin/categorias', exigirAdmin, ...);

//app.get('/admin/avaliacoes', exigirAdmin, ...);

server.listen(3000, () => {
    console.log('Servidor rodando na porta 3000');
});