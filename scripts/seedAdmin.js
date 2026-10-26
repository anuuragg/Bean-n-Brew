const dotenv = require('dotenv');
const mongoose = require('mongoose');
const User = require('../models/userModel');

dotenv.config({ path: './config.env' });

const run = async () => {
    const databaseUrl = process.env.DATABASE;
    if (!databaseUrl) throw new Error('DATABASE must be set in config.env');
    if (databaseUrl.includes('<db_password>') && !process.env.DB_PASSWORD) {
        throw new Error('DB_PASSWORD must be set when DATABASE contains <db_password>');
    }
    const database = databaseUrl.replace('<db_password>', process.env.DB_PASSWORD || '');
    if (!process.env.ADMIN_EMAIL) throw new Error('Set ADMIN_EMAIL in config.env before seeding an admin.');

    await mongoose.connect(database);
    const email = process.env.ADMIN_EMAIL.toLowerCase();
    let user = await User.findOne({ email }).select('+role');
    if (user) {
        user.role = 'admin';
        await user.save({ validateBeforeSave: false });
        console.log(`Promoted ${email} to admin.`);
        return;
    }

    const { ADMIN_NAME: name, ADMIN_PASSWORD: password } = process.env;
    if (!name || !password) throw new Error('Set ADMIN_NAME and ADMIN_PASSWORD to create the first admin account.');
    user = await User.create({ name, email, password, passwordConfirm: password, role: 'admin' });
    console.log(`Created admin account for ${user.email}.`);
};

run()
    .catch(err => {
        console.error('Admin seed failed:', err.message);
        process.exitCode = 1;
    })
    .finally(async () => {
        if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
    });
