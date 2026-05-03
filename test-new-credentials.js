require('dotenv').config();

const phone = '+9779844722697'; // Your WhatsApp number

async function test() {
    console.log('\n🔍 Testing NEW credentials');
    console.log('Client ID:', process.env.OTPLESS_CLIENT_ID);
    console.log('Phone:', phone);
    
    const response = await fetch('https://auth.otpless.app/auth/otp/v1/send', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'clientId': process.env.OTPLESS_CLIENT_ID,
            'clientSecret': process.env.OTPLESS_CLIENT_SECRET
        },
        body: JSON.stringify({
            phoneNumber: phone,
            otpLength: 6,
            channel: 'WHATSAPP',
            expiry: 300
        })
    });
    
    const data = await response.json();
    console.log('\nStatus:', response.status);
    console.log('Response:', JSON.stringify(data, null, 2));
    
    if (data.orderId) {
        console.log('\n✅ API says OTP sent');
        console.log('📱 Check WhatsApp on:', phone);
        console.log('\n⚠️ If not received:');
        console.log('1. Check OTPless dashboard logs');
        console.log('2. Verify WhatsApp is active on this number');
        console.log('3. Contact OTPless support');
    }
}

test();
