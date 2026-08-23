/**
 * Script auxiliar para criar um usuario admin para o site
 */

const { User, sequelize } = require('./app/db');

async function criarAdmin() {
    try {
        const admin = await User.create({
            username: 'Administrador',
            email: 'admin@marketplace.com',
            password: 'senha-do-admin',
            role: 'admin'
        });

        console.log('Administrador criado:', admin.email);
    } catch (err) {
        console.error(err);
    } finally {
        await sequelize.close();
    }
}

criarAdmin();