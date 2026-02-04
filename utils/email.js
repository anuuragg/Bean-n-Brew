const nodemailer = require('nodemailer');

const sendEmail = async options => {

    if(!process.env.EMAIL_HOST || !process.env.EMAIL_PORT){
        throw new Error('Email service not configured!');
    }

    const transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port: process.env.EMAIL_PORT,
        auth: {
            user: process.env.EMAIL_USERNAME,
            pass: process.env.EMAIL_PASSWORD
        }
    })
    
    const emailOptions = {
        from: 'Support <hello@bean-n-brew.com>',
        to: options.email,
        subject: options.subject,
        text: options.message
    }
    
    await transporter.sendMail(emailOptions)
}

module.exports = sendEmail;