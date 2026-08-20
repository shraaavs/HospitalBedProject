import fetch from 'node-fetch';

async function test() {
  const loginRes = await fetch('http://localhost:5000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@hospital.com', password: 'adminpassword' })
  });
  
  const loginData = await loginRes.json();
  console.log('Login:', loginData);
}

test().catch(console.dir);
