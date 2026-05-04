const crypto = require('crypto');
const Campaign = require('../models/Campaign');
const PAYHERE_CONFIG = require('../config/payhere');

// Generate MD5 hash for PayHere
const generateHash = (orderId, amount, currency) => {
    const merchantId = PAYHERE_CONFIG.MERCHANT_ID;
    const merchantSecret = PAYHERE_CONFIG.MERCHANT_SECRET;
    
    // Use toFixed(2) to ensure exact 2 decimal places as required by PayHere
    const formattedAmount = Number(amount).toFixed(2);
    
    const hashedSecret = crypto.createHash('md5').update(merchantSecret).digest('hex').toUpperCase();
    const mainString = merchantId + orderId + formattedAmount + currency + hashedSecret;
    
    return crypto.createHash('md5').update(mainString).digest('hex').toUpperCase();
};

exports.getPaymentParams = async (req, res) => {
    try {
        const { campaignId, amount, donorName, donorEmail } = req.body;
        
        const campaign = await Campaign.findById(campaignId);
        if (!campaign) {
            return res.status(404).json({ message: "Campaign not found" });
        }

        const orderId = `DONATION_${Date.now()}_${campaignId.substring(0, 5)}`;
        const currency = campaign.currency || "LKR";
        const formattedAmount = Number(amount).toFixed(2);
        
        const hash = generateHash(orderId, amount, currency);

        res.status(200).json({
            merchant_id: PAYHERE_CONFIG.MERCHANT_ID,
            order_id: orderId,
            items: `Donation for ${campaign.title}`,
            amount: formattedAmount,
            currency: currency,
            hash: hash,
            first_name: donorName || "Anonymous",
            last_name: "Donor",
            email: donorEmail || "donor@example.com",
            phone: campaign.orgPhoneNumber || "0771234567",
            address: "N/A",
            city: "Colombo",
            country: "Sri Lanka",
            sandbox: PAYHERE_CONFIG.IS_SANDBOX
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.handleNotify = async (req, res) => {
    try {
        const { 
            merchant_id, 
            order_id, 
            payhere_amount, 
            payhere_currency, 
            status_code, 
            md5sig,
            custom_1 // We'll pass campaignId in custom_1
        } = req.body;

        // Verify hash from PayHere
        const merchantSecret = PAYHERE_CONFIG.MERCHANT_SECRET;
        const hashedSecret = crypto.createHash('md5').update(merchantSecret).digest('hex').toUpperCase();
        
        const localMd5sig = crypto.createHash('md5')
            .update(merchant_id + order_id + payhere_amount + payhere_currency + status_code + hashedSecret)
            .digest('hex')
            .toUpperCase();

        if (localMd5sig === md5sig && status_code == 2) {
            // Payment Success
            const campaignId = custom_1;
            const amount = parseFloat(payhere_amount);

            await Campaign.findByIdAndUpdate(campaignId, {
                $inc: { collectedAmount: amount }
            });
            
            console.log(`Payment successful for campaign ${campaignId}. Amount: ${amount}`);
        }

        res.status(200).send("OK");
    } catch (error) {
        console.error("PayHere Notify Error:", error);
        res.status(500).send("Error");
    }
};
