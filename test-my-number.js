require('dotenv').config();

// Test with YOUR actual WhatsApp number
const myWhatsAppNumber = '+9779814789009'; // CHANGE THIS to your actual WhatsApp number

async function testOTP() {
    console.log('\n🔍 Testing OTP to:', myWhatsAppNumber);
    console.log('Make sure this number has WhatsApp installed and active!\n');
    
    try {
        const response = await fetch('https://auth.otpless.app/auth/otp/v1/send', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'clientId': process.env.OTPLESS_CLIENT_ID,
                'clientSecret': process.env.OTPLESS_CLIENT_SECRET
            },
            body: JSON.stringify({
                phoneNumber: myWhatsAppNumber,
                otpLength: 6,
                channel: 'WHATSAPP',
                expiry: 300
            })
        });

        const data = await response.json();
        console.log('Status:', response.status);
        console.log('Response:', JSON.stringify(data, null, 2));
        
        if (data.orderId) {
            console.log('\n✅ OTP sent successfully!');
            console.log('📱 Check your WhatsApp now!');
            console.log('Order ID:', data.orderId);
        } else {
            console.log('\n❌ Failed to send OTP');
            console.log('Error:', data.message || data.errorMessage);
        }
    } catch (e) {
        console.error('❌ Error:', e.message);
    }
}

testOTP();
