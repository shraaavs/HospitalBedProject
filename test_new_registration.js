import axios from 'axios';

async function testAllRoleRegistrations() {
  const ts = Date.now();
  const testUsers = [
    { role: 'Receptionist', name: 'Smitha Receptionist', email: `smitha_rec_${ts}@gmail.com`, pass: 'password123' },
    { role: 'Doctor', name: 'Dr. John Doe', email: `johndoe_${ts}@mediflow.com`, pass: 'password123', department: 'Cardiology' },
    { role: 'Nurse', name: 'Nurse Mary', email: `mary_${ts}@mediflow.com`, pass: 'password123', assignedWard: 'ICU' },
    { role: 'Admin', name: 'Admin Boss', email: `adminboss_${ts}@mediflow.com`, pass: 'password123' }
  ];

  try {
    for (const u of testUsers) {
      console.log(`Registering new ${u.role}: ${u.email}...`);
      const regRes = await axios.post('http://127.0.0.1:5000/api/auth/register', {
        role: u.role,
        name: u.name,
        email: u.email,
        password: u.pass,
        department: u.department,
        assignedWard: u.assignedWard
      });
      console.log(`${u.role} Registration Success:`, regRes.data.message);

      console.log(`Verifying login for ${u.role}...`);
      const loginEndpoint = `http://127.0.0.1:5000/api/auth/${u.role.toLowerCase()}/login`;
      const loginRes = await axios.post(loginEndpoint, {
        username: u.email,
        password: u.pass
      });
      console.log(`${u.role} Login Success! Role: ${loginRes.data.role}, Token: ${!!loginRes.data.token}`);
    }
  } catch (err) {
    console.error('Registration Test Error:', err.response?.data || err.message);
  }
}

testAllRoleRegistrations();
