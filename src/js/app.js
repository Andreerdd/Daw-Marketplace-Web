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
    res.render('index');
});


server.listen(3000, () => {
    console.log('Servidor rodando na porta 3000');
});