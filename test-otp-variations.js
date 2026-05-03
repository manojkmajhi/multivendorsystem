require('dotenv').config();

const clientId = process.env.OTPLESS_CLIENT_ID;
const clientSecret = process.env.OTPLESS_CLIENT_SECRET;
const phoneWithPlus = '+9779814789009'; // User's phone
const phoneclean = '9779814789009';

async function sendOtp(label, payload) {
    console.log(`\n--- Testing: ${label} ---`);
    console.log('Payload:', JSON.stringify(payload));
    try {
        const response = await fetch('https://auth.otpless.app/auth/otp/v1/send', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'clientId': clientId,
                'clientSecret': clientSecret
            },
            body: JSON.stringify(payload)
        });

        const data = await response.json();
        console.log('Status:', response.status);
        console.log('Response:', JSON.stringify(data));
    } catch (e) {
        console.error('Error:', e.message);
    }
}

async function runTests() {
    if (!clientId || !clientSecret) {
        console.error('Credentials missing in .env');
        return;
    }

    // Test 1: Standard with Plus
    await sendOtp('Standard (+977)', {
        phoneNumber: phoneWithPlus,
        otpLength: 6,
        channel: 'WHATSAPP',
        expiry: 300
    });

    // Test 2: Standard without Plus
    await sendOtp('No Plus (977)', {
        phoneNumber: phoneclean,
        otpLength: 6,
        channel: 'WHATSAPP',
        expiry: 300
    });

    // Test 3: Lowercase channel
    await sendOtp('Lowercase Channel', {
        phoneNumber: phoneWithPlus,
        otpLength: 6,
        channel: 'whatsapp',
        expiry: 300
    });

    // Test 4: SMS Channel (just to check error or success)
    await sendOtp('SMS Channel', {
        phoneNumber: phoneWithPlus,
        otpLength: 6,
        channel: 'SMS',
        expiry: 300
    });
}

runTests();
