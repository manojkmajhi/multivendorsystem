require('dotenv').config();

const clientId = process.env.OTPLESS_CLIENT_ID;
const clientSecret = process.env.OTPLESS_CLIENT_SECRET;
const targetPhone = '+9779844722697'; // User's specific number

async function sendTestOtp(phone, label) {
    console.log(`\nTesting ${label}: ${phone}`);
    try {
        const response = await fetch('https://auth.otpless.app/auth/otp/v1/send', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'clientId': clientId,
                'clientSecret': clientSecret
            },
            body: JSON.stringify({
                phoneNumber: phone,
                otpLength: 6,
                channel: 'WHATSAPP',
                expiry: 300
            })
        });

        const data = await response.json();
        console.log('Response:', JSON.stringify(data));
    } catch (e) {
        console.error('Error:', e.message);
    }
}

async function run() {
    // Test 1: With +
    await sendTestOtp(targetPhone, "With +");

    // Test 2: Without + (just 977...)
    const noPlus = targetPhone.replace('+', '');
    await sendTestOtp(noPlus, "Without +");
}

run();
