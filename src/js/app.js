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

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const TAMANHO_SENHA = 67// resenhaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa

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
    //linha comentada pro amigo testar a pagina de cadastro <3
    //res.render('index');

    res.render('cadastro')
});

app.get('/cadastro', (req, res) => {
    res.render('cadastro')
})

app.post('/cadastro', (req, res) => {

    //coleta os dados da pagina
    const {username, email, password} = req.body

    try{

        //verifica se todos os campos foram preenchidos
        if(!nome || !email || !password || password.length < TAMANHO_SENHA) {
            res.render('cadastro', {mensagem: 'preencha todos os campos e a senha deve ter pelo menos 67(mt resenha msm) caracteres'})
        }

        //procura um usuario com o email recebido
        const userExisting = User.findOne({ where: {email} })

        //se achar, vai nos avisando
        if(userExisting){
            res.render('cadastro', {mesagem: 'esse email já está sendo utilizado.'})
        }

        //o hash da senha está sendo gerado no db.js
        User.create({
            username,
            email,
            password
        })

        //n tem essa pagina ainda ^_^
        //res.redirect('/login')
    } catch(err) {
        console.error(err)
        res.render('cadastro', {mensagem: 'erro interno no servidor'})
    }

})



server.listen(3000, () => {
    console.log('Servidor rodando na porta 3000');
});