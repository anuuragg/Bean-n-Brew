const dotenv = require('dotenv');
const mongoose = require('mongoose');

dotenv.config({path: './config.env'});

const app = require('./app');

const databaseUrl = process.env.DATABASE;
if (!databaseUrl) {
    throw new Error('DATABASE must be set in config.env');
}
for (const variable of ['JWT_SECRET', 'JWT_EXPIRES_IN', 'JWT_COOKIE_EXPIRES_IN']) {
    if (!process.env[variable]) throw new Error(`${variable} must be set in config.env`);
}
if (!Number.isFinite(Number(process.env.JWT_COOKIE_EXPIRES_IN)) || Number(process.env.JWT_COOKIE_EXPIRES_IN) <= 0) {
    throw new Error('JWT_COOKIE_EXPIRES_IN must be a positive number of days');
}

if (databaseUrl.includes('<db_password>') && !process.env.DB_PASSWORD) {
    throw new Error('DB_PASSWORD must be set when DATABASE contains <db_password>');
}
const DB = databaseUrl.replace('<db_password>', process.env.DB_PASSWORD || '');
const databaseReady = mongoose.connect(DB);
app.locals.databaseReady = databaseReady;

if (require.main === module) {
    databaseReady
        .then(() => {
            const port = process.env.PORT || 3000;
            app.listen(port, () => console.log(`App running on port ${port}`));
        })
        .catch(err => {
            console.error('Database connection failed:', err);
            process.exitCode = 1;
        });
}

module.exports = app;
