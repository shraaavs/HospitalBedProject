async function run() {
  let token;
  const loginRes = await fetch('http://localhost:5000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@hospitalbed.com', password: 'admin123' })
  });
  const loginData = await loginRes.json();
  token = loginData.token;

  if (!token) {
      console.log('Could not get token');
      return;
  }

  const bedsRes = await fetch('http://localhost:5000/api/beds', { headers: { 'Authorization': 'Bearer ' + token } });
  const beds = await bedsRes.json();
  
  if (!Array.isArray(beds)) {
      console.log('Beds is not array:', beds);
      return;
  }

  const occupied = beds.find(b => b.status === 'Occupied');
  const available = beds.find(b => b.status === 'Available');

  console.log('Occupied:', occupied ? occupied.bedNumber : 'none');
  console.log('Available:', available ? available.bedNumber : 'none');

  if (!occupied || !available) return;

  const res = await fetch('http://localhost:5000/api/beds/transfer', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + token,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ fromBedId: occupied._id, toBedId: available._id, reason: 'test' })
  });

  console.log('Status:', res.status);
  console.log('Body:', await res.json());
}

run().catch(console.error);
