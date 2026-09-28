import axios from 'axios';

async function testNurseDashboardApi() {
  try {
    const ts = Date.now();
    const email = `nurse_test_${ts}@hospital.com`;
    const password = 'password123';

    // 1. Register Nurse
    const regRes = await axios.post('http://127.0.0.1:5000/api/auth/register', {
      role: 'Nurse',
      name: 'Nurse Swathi',
      email,
      password,
      assignedWard: 'General'
    });

    const token = regRes.data.token;
    console.log('Registered & Token acquired for Nurse:', regRes.data.name);

    // 2. Query /api/dashboard/nurse
    const dashRes = await axios.get('http://127.0.0.1:5000/api/dashboard/nurse', {
      headers: { Authorization: `Bearer ${token}` }
    });

    console.log('\n--- Real-Time MongoDB Nurse Dashboard Stats ---');
    console.log('Nurse Info:', dashRes.data.nurseInfo);
    console.log('Stats:', dashRes.data.stats);
    console.log('Assigned Patients Count:', dashRes.data.assignedPatientsList?.length);
    console.log('Doctor Instructions Count:', dashRes.data.doctorInstructions?.length);
    console.log('Medication Schedules Count:', dashRes.data.medicationSchedules?.length);
    console.log('Critical Alerts Count:', dashRes.data.criticalAlerts?.length);
  } catch (err) {
    console.error('Error testing Nurse Dashboard API:', err.response?.data || err.message);
  }
}

testNurseDashboardApi();
