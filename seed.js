import { MongoClient, ObjectId } from 'mongodb';
import bcrypt from 'bcryptjs';

const uri = "mongodb+srv://hospitalbed.uummffz.mongodb.net/HospitalDB?retryWrites=true&w=majority";

async function main() {
  const client = new MongoClient(uri, {
    auth: {
      username: "shravyaacharya85_db_user",
      password: "Shravya@#1305"
    },
    authSource: "admin"
  });

  try {
    console.log("Connecting to MongoDB Atlas...");
    await client.connect();
    console.log("Connected successfully!");

    const db = client.db("HospitalDB");

    // Drop existing collections to reset clean
    const collections = await db.listCollections().toArray();
    const collectionNames = collections.map(c => c.name);

    for (const name of ['hospitals', 'beds', 'patients', 'users', 'inventoryitems', 'resourcerequests', 'medicalrecords', 'nursingtasks']) {
      if (collectionNames.includes(name)) {
        console.log(`Dropping existing collection: ${name}`);
        await db.collection(name).drop();
      }
    }

    // 1. Seed Hospitals
    console.log("Seeding Hospitals...");
    const hospitalData = [
      {
        _id: new ObjectId(),
        name: "City General Hospital",
        address: "123 Health Ave, Metro City",
        contactNumber: "+1-555-0199",
        city: "Metro City",
        totalBeds: 50,
        availableBeds: 47
      },
      {
        _id: new ObjectId(),
        name: "St. Jude Medical Center",
        address: "456 Wellness Blvd, Caretown",
        contactNumber: "+1-555-0288",
        city: "Caretown",
        totalBeds: 30,
        availableBeds: 28
      },
      {
        _id: new ObjectId(),
        name: "Grace Memorial Hospital",
        address: "789 Hope St, Healing Hills",
        contactNumber: "+1-555-0377",
        city: "Healing Hills",
        totalBeds: 40,
        availableBeds: 40
      }
    ];

    const hospitalsCollection = db.collection('hospitals');
    await hospitalsCollection.insertMany(hospitalData);
    console.log(`Successfully seeded ${hospitalData.length} hospitals.`);

    // 2. Seed Beds
    console.log("Seeding Beds...");
    const bedData = [];
    const types = ["ICU", "General", "Oxygen Bed", "Ventilator"];
    const statuses = ["Available", "Occupied", "Under Maintenance"];

    // We will generate beds for each hospital
      let hospitalIndex = 1;
      for (const hospital of hospitalData) {
        // Let's create some sample beds
        for (let i = 1; i <= 10; i++) {
          // Decide status and type
          let status = "Available";
          let type = types[i % types.length];
          let pricePerDay = 100 + (i * 20);

          if (i <= 2) status = "Occupied";
          else if (i === 3) status = "Cleaning";
          else if (i === 4) status = "Reserved";

          // Calculate unique bed number
          let bedNum = `${type.substring(0, 3)}-${100 + i}-H${hospitalIndex}`;

          bedData.push({
            _id: new ObjectId(),
            hospitalId: hospital._id,
            bedNumber: bedNum,
            type: type,
            status: status,
            pricePerDay: pricePerDay
          });
        }
        hospitalIndex++;
      }

    const bedsCollection = db.collection('beds');
    await bedsCollection.insertMany(bedData);
    console.log(`Successfully seeded ${bedData.length} beds.`);

    // 3. Seed Patients (linked to the occupied beds)
    console.log("Seeding Patients...");
    const patientData = [];
    const occupiedBeds = bedData.filter(b => b.status === "Occupied");

    const samplePatients = [
      { name: "John Doe", age: 45, gender: "Male", contactNumber: "+1-555-9876" },
      { name: "Jane Smith", age: 34, gender: "Female", contactNumber: "+1-555-8765" },
      { name: "Robert Johnson", age: 62, gender: "Male", contactNumber: "+1-555-7654" }
    ];

    for (let i = 0; i < occupiedBeds.length; i++) {
      const bed = occupiedBeds[i];
      const patient = samplePatients[i % samplePatients.length];

      patientData.push({
        _id: new ObjectId(),
        name: patient.name,
        age: patient.age,
        gender: patient.gender,
        contactNumber: patient.contactNumber,
        hospitalId: bed.hospitalId,
        bedId: bed._id,
        admissionDate: new Date(),
        status: "Admitted"
      });
    }

    const patientsCollection = db.collection('patients');
    if (patientData.length > 0) {
      await patientsCollection.insertMany(patientData);
      console.log(`Successfully seeded ${patientData.length} patients.`);
    }

    // Update the beds collection to assign the patients
    for (const patient of patientData) {
      await bedsCollection.updateOne(
        { _id: patient.bedId },
        { $set: { patientId: patient._id } }
      );
    }

    // 4. Seed Users
    console.log("Seeding Users...");
    
    // Create actual hashed passwords for testing
    const salt = await bcrypt.genSalt(10);
    const adminPassword = await bcrypt.hash("admin123", salt);
    const staffPassword = await bcrypt.hash("staff123", salt);
    const doctorPassword = await bcrypt.hash("doctor123", salt);
    const nursePassword = await bcrypt.hash("nurse123", salt);
    const receptionistPassword = await bcrypt.hash("receptionist123", salt);
    const inventoryPassword = await bcrypt.hash("inventory123", salt);
    
    const userData = [
      {
        name: "Super Admin",
        email: "admin@hospitalbed.com",
        password: adminPassword,
        role: "Admin",
        hospitalId: null
      },
      {
        name: "City General Staff",
        email: "staff.city@hospitalbed.com",
        password: staffPassword,
        role: "Staff",
        hospitalId: hospitalData[0]._id
      },
      {
        name: "Dr. Smith",
        email: "doctor@mediflow.com",
        password: doctorPassword,
        role: "Doctor",
        hospitalId: hospitalData[0]._id
      },
      {
        name: "Nurse Joy",
        email: "nurse@mediflow.com",
        password: nursePassword,
        role: "Nurse",
        hospitalId: hospitalData[0]._id
      },
      {
        name: "Receptionist Pam",
        email: "receptionist@mediflow.com",
        password: receptionistPassword,
        role: "Receptionist",
        hospitalId: hospitalData[0]._id
      },
      {
        name: "Inventory Manager Bob",
        email: "inventory@mediflow.com",
        password: inventoryPassword,
        role: "Inventory Manager",
        hospitalId: hospitalData[0]._id
      }
    ];

    const usersCollection = db.collection('users');
    await usersCollection.insertMany(userData);
    console.log(`Successfully seeded ${userData.length} users.`);

    // 5. Seed Inventory Items
    console.log("Seeding Inventory...");
    const inventoryData = [
      { itemName: "Oxygen Cylinder (H-Type)", category: "Equipment", quantity: 142, unit: "cylinders", lowStockThreshold: 40, status: "In Stock" },
      { itemName: "Portable Ventilator", category: "Equipment", quantity: 28, unit: "units", lowStockThreshold: 10, status: "In Stock" },
      { itemName: "Patient Monitor V3", category: "Equipment", quantity: 94, unit: "units", lowStockThreshold: 15, status: "In Stock" },
      { itemName: "N95 Masks", category: "PPE", quantity: 5000, unit: "boxes", lowStockThreshold: 1000, status: "In Stock" },
      { itemName: "Paracetamol 500mg", category: "Medicine", quantity: 5, unit: "boxes", lowStockThreshold: 20, status: "Low Stock" }
    ];

    const inventoryCollection = db.collection('inventoryitems');
    await inventoryCollection.insertMany(inventoryData);
    console.log(`Successfully seeded ${inventoryData.length} inventory items.`);

    // 8. Seed Nursing Tasks
    console.log("Seeding Nursing Tasks...");
    const taskData = [];
    
    // Assign tasks for the first 5 patients
    for (let i = 0; i < 5 && i < patientData.length; i++) {
        const p = patientData[i];
        // 1 pending Vitals task
        taskData.push({
            _id: new ObjectId(),
            patient: p._id,
            taskType: 'Vitals',
            description: 'Check blood pressure and temperature',
            status: 'Pending',
            assignedTo: null,
            dueDate: new Date(Date.now() + 1000 * 60 * 30), // 30 mins from now
            createdAt: new Date(),
            updatedAt: new Date()
        });
        
        // 1 pending Medication task
        taskData.push({
            _id: new ObjectId(),
            patient: p._id,
            taskType: 'Medication',
            description: 'Administer prescribed antibiotics',
            status: 'Pending',
            assignedTo: null,
            dueDate: new Date(Date.now() + 1000 * 60 * 60), // 1 hour from now
            createdAt: new Date(),
            updatedAt: new Date()
        });
        
        // 1 completed General task
        taskData.push({
            _id: new ObjectId(),
            patient: p._id,
            taskType: 'General',
            description: 'Assist with morning mobility',
            status: 'Completed',
            assignedTo: null,
            dueDate: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
            createdAt: new Date(Date.now() - 1000 * 60 * 60 * 4),
            updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 2)
        });
    }

    const tasksCollection = db.collection('nursingtasks');
    await tasksCollection.insertMany(taskData);
    console.log("Seeded Nursing Tasks");

    console.log("Database initialized and formatted successfully!");

  } catch (error) {
    console.error("Error during database seeding:", error);
  } finally {
    await client.close();
    console.log("Connection closed.");
  }
}

main().catch(console.dir);
