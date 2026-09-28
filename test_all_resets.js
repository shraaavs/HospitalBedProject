import axios from 'axios';

async function testAllRolesReset() {
  try {
    const tests = [
      { role: 'Admin', id: 'admin@mediflow.com', pass: 'adminNewPass123!' },
      { role: 'Doctor', id: 'DOC-001', pass: 'docNewPass123!' },
      { role: 'Nurse', id: 'nurse', pass: 'nurseNewPass123!' }
    ];

    for (const t of tests) {
      console.log(`Testing ${t.role} reset with identifier ${t.id}...`);
      const reset = await axios.post('http://127.0.0.1:5000/api/auth/reset-password', {
        role: t.role,
        identifier: t.id,
        newPassword: t.pass
      });
      console.log(`${t.role} reset:`, reset.data.message);

      const login = await axios.post(`http://127.0.0.1:5000/api/auth/${t.role.toLowerCase()}/login`, {
        username: t.id,
        password: t.pass
      });
      console.log(`${t.role} login success:`, !!login.data.token);
    }
  } catch (err) {
    console.error('Test error:', err.response?.data || err.message);
  }
}

testAllRolesReset();
