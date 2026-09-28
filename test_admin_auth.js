import axios from 'axios';

async function testAuth() {
  try {
    const adminData = {
      adminId: `ADM-TEST-${Date.now()}`,
      name: 'Test Admin',
      email: `test${Date.now()}@mediflow.com`,
      username: `testadmin${Date.now()}`,
      password: 'password123'
    };

    console.log('Registering:', adminData.email);
    const regRes = await axios.post('http://127.0.0.1:5000/api/auth/admin/register', adminData);
    console.log('Register successful:', regRes.data);

    console.log('Logging in with email...');
    const loginRes = await axios.post('http://127.0.0.1:5000/api/auth/admin/login', {
      username: adminData.email,
      password: 'password123'
    });
    console.log('Login successful:', !!loginRes.data.token);
  } catch (err) {
    console.error('Error:', err.response?.data || err.message);
  }
}

testAuth();
