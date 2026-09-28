import axios from 'axios';

async function testPasswordReset() {
  try {
    const testIdentifier = 'emma@mediflow.com'; // Seeded receptionist email
    const newPass = 'newPassword456!';

    console.log('1. Attempting reset password for Receptionist:', testIdentifier);
    const resetRes = await axios.post('http://127.0.0.1:5000/api/auth/reset-password', {
      role: 'Receptionist',
      identifier: testIdentifier,
      newPassword: newPass
    });
    console.log('Reset response:', resetRes.data);

    console.log('2. Trying login with OLD password (should fail)...');
    try {
      await axios.post('http://127.0.0.1:5000/api/auth/receptionist/login', {
        username: testIdentifier,
        password: 'password123'
      });
      console.log('UNEXPECTED: Old password still worked');
    } catch (loginErr) {
      console.log('EXPECTED: Old password rejected with status', loginErr.response?.status);
    }

    console.log('3. Trying login with NEW password (should succeed)...');
    const newLoginRes = await axios.post('http://127.0.0.1:5000/api/auth/receptionist/login', {
      username: testIdentifier,
      password: newPass
    });
    console.log('Login with new password SUCCESS! Token received:', !!newLoginRes.data.token);

  } catch (err) {
    console.error('Error in test:', err.response?.data || err.message);
  }
}

testPasswordReset();
