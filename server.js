const app = require('./app');
const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config({path: './config.env'});

const DB = process.env.DATABASE.replace(
    '<db_password>',
    process.env.DB_PASSWORD
)

mongoose.connect(DB).then(con => console.log("DB connection succesful!"));


app.listen(3000, () => {
    console.log('app running on port 3000');
})