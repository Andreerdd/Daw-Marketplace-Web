/**
 * Código principal do projeto.
 *
 * @author André Dias
 */

const express = require('express');
const session = require('express-session');
const http = require('http');
const { Server } = require('socket.io');
const { User } = require('./db');
const path = require('path');
const bcrypt = require('bcryptjs');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

//se algm mudar isso aqui é ban
const TAMANHO_SENHA = 6// resenhaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa

// Configuração do EJS
app.set('views', path.join(__dirname, '../views'));
app.set('view engine', 'ejs');

app.use(express.urlencoded({ extended: true }));

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
    // linha comentada pro amigo testar a pagina de cadastro <3
    //res.render('index');
    if(!req.session.user) return res.redirect('/login')
    return res.render('index')
});

app.get('/cadastro', (_, res) => {
    res.render('cadastro')
})

app.post('/cadastro', async (req, res) => {

    console.log(req.body)
    // coleta os dados da pagina
    const {username, email, password} = req.body

    try{

        // verifica se todos os campos foram preenchidos
        if(!username || !email || !password || password.length < TAMANHO_SENHA) {
            return res.render('cadastro', {mensagem: 'preencha todos os campos e a senha deve ter pelo menos 67(mt resenha msm) caracteres'})
        }

        console.log("cadastro", email)
        // procura um usuario com o email recebido
        console.log("antes do findone")
        const userExisting = await User.findOne({ where: { email } })
        console.log("dps do findone", userExisting)

        // se achar, vai nos avisando
        if(userExisting){
            return res.render('cadastro', {mensagem: 'esse email já está sendo utilizado.'})
        }

        // coloca o usuario no database
        await User.create({
            username,
            email,
            password // nao precisa de hash aqui, pois ja esta sendo feito no db.js
        })
        console.log("user criado")
        //no final, manda o user de volta para a pagina de login
        return res.redirect('/login')
    } catch(err) {
        // se der erro printa no terminal e manda para a pagina
        console.error(err)
        res.render('cadastro', {mensagem: 'erro interno no servidor'})
    }

})

app.get('/login', (_, res) => {
    res.render('login', {mensagem : null})
})

app.post('/login', async (req, res) => {

    const { email, password } = req.body

    try{
        
        const user = await User.findOne({ where: { email } })
        
        if(!user) {
            return res.render('login', {mensagem: 'email ou senha invalidos'})
        }

        const correctPassword = await bcrypt.compare(password, user.password)

        if(!correctPassword) {
            return res.render('login', {mensagem : 'email ou senha invalidos'})
        }

        req.session.user = { 
            id: user.id,
            username: user.username,
            email: user.email
        }
        
        res.redirect('/')
    } catch(err) {
        console.error(err)
        res.render('login', {mensagem : 'erro ao fazer o login'})
    }

})


server.listen(3000, () => {
    console.log('Servidor rodando na porta 3000');
});