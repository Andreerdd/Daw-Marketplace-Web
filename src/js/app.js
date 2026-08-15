/**
 * Código principal do projeto.
 *
 * @author André Dias
 * @author Gabriel Della Gaspera
 */

const express = require('express');
const session = require('express-session');
const http = require('http');
const {Server} = require('socket.io');
const {User} = require('./db');
const path = require('path');
const bcrypt = require('bcryptjs');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

//se algm mudar isso aqui é ban
const TAMANHO_MINIMO_SENHA = 6// resenhaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa

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

app.get('/login', exigirUsuarioDeslogado, (_, res) => {
    res.render('login')
})

app.get('/cadastro', exigirUsuarioDeslogado, (_, res) => {
    res.render('cadastro')
})

app.get('/produto/:id', (req, res) => {
    const produtoId = req.params.id;
    res.render('produto', {
        // Mandando um produto exemplar apenas para teste
        produto: {
            id: produtoId || 1,
            nome: "Pibbles sao legais acho que todos deveriam ter! janja pf da pibbles de graca",
            preco: 3.67,
            imagem: "https://i.scdn.co/image/ab67616d00001e02a0d9fa7e0467ea67fd7de2bb",
            dono: {nome: "Davi Brito da Silva"}
        },
        username: req.session?.user?.username || null // é possível q um deslogado veja um produto
    })
})

app.get('/comprar/:id', exigirUsuarioDeslogado, (req, res) => {
    const produtoId = req.params.id;

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
        var user = await User.create({
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

app.get('/logout', exigirLogin, async (req, res) => {
    req.session.destroy();
    res.redirect('/');
});

function exigirLogin(req, res, next) {
    if (req.session.user?.id) next();
    else res.redirect('/login');
}

function exigirUsuarioDeslogado(req, res, next) {
    if (!req.session.user?.id) next();
    else res.redirect('/');
}

server.listen(3000, () => {
    console.log('Servidor rodando na porta 3000');
});