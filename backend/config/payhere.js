const PAYHERE_CONFIG = {
    MERCHANT_ID: process.env.PAYHERE_MERCHANT_ID,
    MERCHANT_SECRET: process.env.PAYHERE_MERCHANT_SECRET,
    APP_ID: process.env.PAYHERE_APP_ID,
    APP_SECRET: process.env.PAYHERE_APP_SECRET,
    IS_SANDBOX: process.env.PAYHERE_IS_SANDBOX !== 'false', // Defaults to true (sandbox)
};

module.exports = PAYHERE_CONFIG;
