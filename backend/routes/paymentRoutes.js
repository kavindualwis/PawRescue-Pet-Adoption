const express = require('express');
const router = express.Router();
const { getPaymentParams, handleNotify } = require('../controllers/paymentController');

router.post('/params', getPaymentParams);
router.post('/notify', handleNotify);

module.exports = router;
