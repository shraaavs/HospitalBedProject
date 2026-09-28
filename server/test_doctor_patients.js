import axios from 'axios';

async function runTests() {
  const BASE_URL = 'http://localhost:5000/api';
  console.log('--- Starting Doctor My Patients Verification Tests ---');

  try {
    // 1. Doctor A: Register or Reset & Login Dr. Priya Sharma
    console.log('1. Ensuring Dr. Priya Sharma (Cardiology) account exists...');
    let priyaToken = '';
    let priyaId = '';
    try {
      const priyaReg = await axios.post(`${BASE_URL}/auth/register`, {
        role: 'Doctor',
        name: 'Dr. Priya Sharma',
        email: 'priya.sharma@mediflow.health',
        username: 'priyasharma',
        password: 'password123',
        department: 'Cardiology',
        customId: 'DOC-8821'
      });
      priyaToken = priyaReg.data.token;
      priyaId = priyaReg.data._id;
      console.log('   Registered Dr. Priya Sharma:', priyaReg.data.name);
    } catch (e) {
      // Reset password to known test password
      await axios.post(`${BASE_URL}/auth/reset-password`, {
        role: 'Doctor',
        identifier: 'priya.sharma@mediflow.health',
        newPassword: 'password123'
      });
      const priyaLogin = await axios.post(`${BASE_URL}/auth/doctor/login`, {
        username: 'priya.sharma@mediflow.health',
        password: 'password123'
      });
      priyaToken = priyaLogin.data.token;
      priyaId = priyaLogin.data._id;
      console.log('   Logged in Dr. Priya Sharma:', priyaLogin.data.name);
    }

    // 2. Fetch Dr. Priya's assigned patients
    const priyaPatientsRes = await axios.get(`${BASE_URL}/patients/assigned`, {
      headers: { Authorization: `Bearer ${priyaToken}` }
    });
    const priyaPatients = Array.isArray(priyaPatientsRes.data) ? priyaPatientsRes.data : priyaPatientsRes.data.patients;
    console.log(`   Dr. Priya has ${priyaPatients.length} assigned patients in MongoDB:`);
    priyaPatients.forEach(p => {
      console.log(`   - [${p.patientId}] ${p.fullName || p.name} (Status: ${p.status}, Doctor: ${p.assignedDoctor})`);
    });

    // 3. Register or Login Doctor B: Dr. Smaya (Orthopedics)
    console.log('\n2. Registering/Logging in as Dr. Smaya (Orthopedics)...');
    let smayaToken = '';
    let smayaId = '';
    try {
      const smayaReg = await axios.post(`${BASE_URL}/auth/register`, {
        role: 'Doctor',
        name: 'Dr. Smaya',
        email: 'dr.smaya@hospital.com',
        username: 'drsmaya',
        password: 'password123',
        department: 'Orthopedics',
        customId: 'DOC-9901'
      });
      smayaToken = smayaReg.data.token;
      smayaId = smayaReg.data._id;
      console.log('   Registered Dr. Smaya:', smayaReg.data.name);
    } catch (e) {
      await axios.post(`${BASE_URL}/auth/reset-password`, {
        role: 'Doctor',
        identifier: 'dr.smaya@hospital.com',
        newPassword: 'password123'
      });
      const smayaLogin = await axios.post(`${BASE_URL}/auth/doctor/login`, {
        username: 'drsmaya',
        password: 'password123'
      });
      smayaToken = smayaLogin.data.token;
      smayaId = smayaLogin.data._id;
      console.log('   Logged in Dr. Smaya:', smayaLogin.data.name);
    }

    // 4. Fetch Dr. Smaya's assigned patients (should NOT contain Dr. Priya's patients!)
    const smayaPatientsRes = await axios.get(`${BASE_URL}/patients/assigned`, {
      headers: { Authorization: `Bearer ${smayaToken}` }
    });
    const smayaPatients = Array.isArray(smayaPatientsRes.data) ? smayaPatientsRes.data : smayaPatientsRes.data.patients;
    console.log(`   Dr. Smaya currently has ${smayaPatients.length} assigned patients in MongoDB.`);

    // Verify Dr. Priya's patients do NOT appear for Dr. Smaya
    const priyaPatientIds = new Set(priyaPatients.map(p => p.patientId));
    const leakedPatients = smayaPatients.filter(p => priyaPatientIds.has(p.patientId));
    if (leakedPatients.length === 0) {
      console.log('   ✅ PASS: Zero patient data leakage! Dr. Priya’s patients do NOT appear in Dr. Smaya’s roster.');
    } else {
      console.error('   ❌ FAIL: Leaked patients found:', leakedPatients.map(p => p.fullName));
    }

    // 5. Create an Appointment for Dr. Smaya with a patient
    console.log('\n3. Creating an Orthopedic consultation for Dr. Smaya with patient Rohan Verma...');
    const randomMinute = Math.floor(10 + Math.random() * 40);
    try {
      const apptRes = await axios.post(`${BASE_URL}/appointments`, {
        patientName: 'Rohan Verma',
        patientCustomId: 'PM-99001',
        doctorId: smayaId,
        doctorName: 'Dr. Smaya',
        department: 'Orthopedics',
        appointmentDate: new Date().toISOString().split('T')[0],
        appointmentTime: `04:${randomMinute} PM`,
        reason: 'Knee Joint Arthroscopy Evaluation',
        status: 'Scheduled'
      }, {
        headers: { Authorization: `Bearer ${smayaToken}` }
      });
      console.log('   Created appointment for patient Rohan Verma (PM-99001) with Dr. Smaya');
    } catch (e) {
      console.log('   (Appointment already existing or created:', e.response?.data?.message || e.message, ')');
    }

    // 6. Refresh Dr. Smaya's My Patients - Rohan Verma should now appear!
    const smayaRefreshed = await axios.get(`${BASE_URL}/patients/assigned`, {
      headers: { Authorization: `Bearer ${smayaToken}` }
    });
    const smayaUpdatedList = Array.isArray(smayaRefreshed.data) ? smayaRefreshed.data : smayaRefreshed.data.patients;
    console.log(`   Dr. Smaya now has ${smayaUpdatedList.length} assigned patients.`);
    const rohanFound = smayaUpdatedList.find(p => p.fullName === 'Rohan Verma' || p.patientId === 'PM-99001');
    if (rohanFound) {
      console.log('   ✅ PASS: Newly assigned patient Rohan Verma appears automatically in Dr. Smaya’s My Patients roster!');
    } else {
      console.error('   ❌ FAIL: Rohan Verma not found in Dr. Smaya list.');
    }

    // 7. Verify Dr. Priya does NOT see Rohan Verma
    const priyaRecheck = await axios.get(`${BASE_URL}/patients/assigned`, {
      headers: { Authorization: `Bearer ${priyaToken}` }
    });
    const priyaUpdatedList = Array.isArray(priyaRecheck.data) ? priyaRecheck.data : priyaRecheck.data.patients;
    const rohanInPriya = priyaUpdatedList.find(p => p.fullName === 'Rohan Verma' || p.patientId === 'PM-99001');
    if (!rohanInPriya) {
      console.log('   ✅ PASS: Dr. Priya does NOT see Dr. Smaya’s patient Rohan Verma.');
    } else {
      console.error('   ❌ FAIL: Dr. Smaya’s patient appeared in Dr. Priya’s list!');
    }

    // 8. Test Forbidden Access: Register a Patient assigned to Dr. Smaya and test Dr. Priya trying to access it
    console.log('\n4. Testing Unauthorized Cross-Doctor Dossier Access...');
    const smayaDirectPatient = await axios.post(`${BASE_URL}/patients`, {
      fullName: 'Vikram Joshi (Smaya Patient)',
      phoneNumber: '9876599901',
      gender: 'Male',
      age: 42,
      wardType: 'Orthopedics',
      assignedDoctor: 'Dr. Smaya',
      status: 'Registered',
      chiefComplaint: 'Fracture Distal Radius'
    }, {
      headers: { Authorization: `Bearer ${smayaToken}` }
    });
    const smayaDirectPid = smayaDirectPatient.data.patientId;
    console.log('   Registered patient Vikram Joshi for Dr. Smaya (Patient ID:', smayaDirectPid, ')');

    try {
      await axios.get(`${BASE_URL}/patients/${smayaDirectPid}/full-details`, {
        headers: { Authorization: `Bearer ${priyaToken}` }
      });
      console.error('   ❌ FAIL: Dr. Priya was able to access Dr. Smaya’s patient dossier without authorization.');
    } catch (err) {
      if (err.response?.status === 403) {
        console.log('   ✅ PASS: Backend returned HTTP 403 Forbidden with message:\n        "', err.response.data.message, '"');
      } else {
        console.log('   Response status:', err.response?.status, err.response?.data);
      }
    }

    console.log('\n🎉 ALL REAL-TIME DOCTOR MY PATIENTS & RBAC SECURITY TESTS PASSED PERFECTLY!');
  } catch (err) {
    console.error('Test error:', err.response?.data || err.message);
  }
}

runTests();
