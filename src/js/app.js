/**
 * Código principal do projeto.
 */

// Imports
const {
    exigirLogin,
    exigirUsuarioDeslogado,
    exigirVendedor,
    existePerfilVendedor,
    getProdutosFromIds,
    getProdutoFromId,
    getPerfilVendedor
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
app.get('/', (req, res) => {
    return res.render('index', {username: req.session?.user?.username || null});
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

        const correctPassword = await bcrypt.compare(password, user.password)

        if (!correctPassword) {
            return res.render('login', {mensagem: 'Senha incorreta!'})
        }

        req.session.user = {
            id: user.id,
            username: user.username,
            email: user.email
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

app.get('/produto/:id', async (req, res) => {
    const produtoId = req.params.id;
    const produto = await getProdutoFromId(produtoId);
    const loja = await getPerfilVendedor(produto.vendedorId);
    res.render('produto', {
        produto, // Manda o produto
        loja,
        username: req.session?.user?.username || null // é possível q um deslogado veja um produto
    })
})

app.get('/comprar/:id', exigirLogin, (req, res) => {
    const produtoId = req.params.id;
    console.log("Produto comprado!");
})

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

app.post('/cadastro-vendedor', upload.single('logoLoja'), exigirLogin, async (req, res) => {

    console.log(req.body)
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
    const {nome, preco} = req.body;
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
            preco,
            imagem: caminhoImagem
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


server.listen(3000, () => {
    console.log('Servidor rodando na porta 3000');
});