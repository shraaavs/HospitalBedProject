import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';

export default function PatientRegistrationMediFlow() {
  const navigate = useNavigate();
  
  // Controlled States
  const [fullName, setFullName] = useState('');
  const [dob, setDob] = useState('');
  const [gender, setGender] = useState('Male');
  const [contact, setContact] = useState('');
  const [email, setEmail] = useState('');
  
  const [emergencyName, setEmergencyName] = useState('');
  const [emergencyRelationship, setEmergencyRelationship] = useState('Spouse');
  const [emergencyPhone, setEmergencyPhone] = useState('');
  
  const [complaint, setComplaint] = useState('');
  const [bloodGroup, setBloodGroup] = useState('A+');
  const [allergies, setAllergies] = useState(['Penicillin', 'Latex']);
  const [allergyInput, setAllergyInput] = useState('');
  
  const [ward, setWard] = useState('ICU');
  const [doctor, setDoctor] = useState('Dr. Elena Rodriguez (Cardiology)');

  const handleAddAllergy = (e) => {
    if (e.key === 'Enter' && allergyInput.trim() !== '') {
      e.preventDefault();
      if (!allergies.includes(allergyInput.trim())) {
        setAllergies([...allergies, allergyInput.trim()]);
      }
      setAllergyInput('');
    }
  };

  const handleRemoveAllergy = (indexToRemove) => {
    setAllergies(allergies.filter((_, index) => index !== indexToRemove));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const response = await fetch('/api/patients', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('userToken')}`
        },
        body: JSON.stringify({
          fullName, dob, gender, contact, email,
          emergencyName, emergencyRelationship, emergencyPhone,
          complaint, bloodGroup, allergies,
          ward, doctor
        })
      });
      let data;
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.indexOf("application/json") !== -1) {
        data = await response.json();
      } else {
        const text = await response.text();
        console.error("Non-JSON response:", text);
        throw new Error("Server returned non-JSON response. The backend might be down.");
      }

      if (response.ok) {
        let htmlMsg = `Patient <b>${fullName}</b> has been registered.<br/>Patient ID: <b>${data.patientId}</b>`;
        if (data.bedNumber) {
          htmlMsg += `<br/>Bed Allocated: <b>${data.bedNumber}</b>`;
        }
        Swal.fire({
          icon: 'success',
          title: 'Registration Successful',
          html: htmlMsg,
          confirmButtonColor: '#0056b3'
        }).then(() => {
          navigate('/dashboard');
        });
      } else {
        Swal.fire({
          icon: 'error',
          title: 'Registration Failed',
          text: data.message || 'Something went wrong. Please try again.'
        });
      }
    } catch (error) {
      console.error('Error during registration:', error);
      Swal.fire({
        icon: 'error',
        title: 'Network Error',
        text: 'Failed to connect to the server.'
      });
    }
  };

  return (
    <div className="w-full">
      <form onSubmit={handleSubmit} className="max-w-5xl mx-auto">
        {/* Header Section */}
        <div className="mb-lg flex items-center justify-between flex-wrap gap-md">
          <div>
            <h1 className="text-headline-lg font-headline-lg text-on-surface mb-xs">New Patient Registration</h1>
            <p className="text-body-md text-on-surface-variant">Enter patient details to generate a unique digital ID and assign clinical resources.</p>
          </div>
          <div className="flex gap-sm">
            <button 
              type="button"
              className="px-lg py-sm rounded-lg border border-outline text-primary font-bold hover:bg-surface-container-high transition-colors cursor-pointer"
            >
              Draft Mode
            </button>
            <button 
              type="submit"
              className="px-lg py-sm rounded-lg bg-primary text-on-primary font-bold shadow-sm hover:opacity-90 transition-opacity cursor-pointer"
            >
              Quick Register
            </button>
          </div>
        </div>

        {/* Bento Grid Layout for Form Sections */}
        <div className="grid grid-cols-12 gap-lg animate-fade-in animation-delay-100">
          {/* Section 1: Personal Information (Large Bento Card) */}
          <section className="col-span-12 lg:col-span-8 bg-surface-container-lowest rounded-xl border border-outline-variant shadow-sm p-lg">
            <div className="flex items-center gap-sm mb-lg border-b border-surface-container-high pb-md">
              <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>badge</span>
              <h3 className="text-headline-md font-headline-md text-on-surface">Personal Info</h3>
            </div>
            <div className="grid grid-cols-2 gap-lg">
              <div className="col-span-2 md:col-span-1">
                <label className="block text-label-md text-on-surface-variant mb-xs">Full Name *</label>
                <input 
                  className="w-full p-sm bg-surface-container-low border border-outline-variant rounded-lg text-body-md focus:ring-2 focus:ring-primary focus:border-primary outline-none" 
                  placeholder="e.g. Johnathan Doe" 
                  type="text" 
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
              </div>
              <div className="col-span-2 md:col-span-1">
                <label className="block text-label-md text-on-surface-variant mb-xs">Date of Birth *</label>
                <input 
                  className="w-full p-sm bg-surface-container-low border border-outline-variant rounded-lg text-body-md focus:ring-2 focus:ring-primary focus:border-primary outline-none" 
                  type="date"
                  value={dob}
                  onChange={(e) => setDob(e.target.value)}
                  required
                />
              </div>
              <div className="col-span-2 md:col-span-1">
                <label className="block text-label-md text-on-surface-variant mb-xs">Gender</label>
                <div className="flex gap-sm">
                  {['Male', 'Female', 'Other'].map((g) => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => setGender(g)}
                      className={`flex-1 py-sm px-md border rounded-lg text-label-md font-bold transition-all cursor-pointer ${
                        gender === g
                          ? 'border-primary bg-primary-container/10 text-primary'
                          : 'border-outline-variant text-on-surface-variant hover:bg-surface-container-high'
                      }`}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>
              <div className="col-span-2 md:col-span-1">
                <label className="block text-label-md text-on-surface-variant mb-xs">Contact Number *</label>
                <input 
                  className="w-full p-sm bg-surface-container-low border border-outline-variant rounded-lg text-body-md focus:ring-2 focus:ring-primary focus:border-primary outline-none" 
                  placeholder="+1 (555) 000-0000" 
                  type="tel"
                  value={contact}
                  onChange={(e) => setContact(e.target.value)}
                  required
                />
              </div>
              <div className="col-span-2">
                <label className="block text-label-md text-on-surface-variant mb-xs">Primary Email (Optional)</label>
                <input 
                  className="w-full p-sm bg-surface-container-low border border-outline-variant rounded-lg text-body-md focus:ring-2 focus:ring-primary focus:border-primary outline-none" 
                  placeholder="john.doe@example.com" 
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>
          </section>

          {/* Section 2: Emergency Contact (Smaller Bento Card) */}
          <section className="col-span-12 lg:col-span-4 bg-surface-container-lowest rounded-xl border border-outline-variant shadow-sm p-lg">
            <div className="flex items-center gap-sm mb-lg border-b border-surface-container-high pb-md">
              <span className="material-symbols-outlined text-error" style={{ fontVariationSettings: "'FILL' 1" }}>e911_emergency</span>
              <h3 className="text-headline-md font-headline-md text-on-surface">Emergency Contact</h3>
            </div>
            <div className="space-y-lg">
              <div>
                <label className="block text-label-md text-on-surface-variant mb-xs">Contact Name</label>
                <input 
                  className="w-full p-sm bg-surface-container-low border border-outline-variant rounded-lg text-body-md focus:ring-2 focus:ring-primary focus:border-primary outline-none" 
                  placeholder="Full Name" 
                  type="text"
                  value={emergencyName}
                  onChange={(e) => setEmergencyName(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-label-md text-on-surface-variant mb-xs">Relationship</label>
                <select 
                  className="w-full p-sm bg-surface-container-low border border-outline-variant rounded-lg text-body-md focus:ring-2 focus:ring-primary focus:border-primary outline-none appearance-none cursor-pointer"
                  value={emergencyRelationship}
                  onChange={(e) => setEmergencyRelationship(e.target.value)}
                >
                  <option>Spouse</option>
                  <option>Parent</option>
                  <option>Sibling</option>
                  <option>Other</option>
                </select>
              </div>
              <div>
                <label className="block text-label-md text-on-surface-variant mb-xs">Emergency Phone</label>
                <input 
                  className="w-full p-sm bg-surface-container-low border border-outline-variant rounded-lg text-body-md focus:ring-2 focus:ring-primary focus:border-primary outline-none" 
                  placeholder="Phone Number" 
                  type="tel"
                  value={emergencyPhone}
                  onChange={(e) => setEmergencyPhone(e.target.value)}
                />
              </div>
            </div>
          </section>

          {/* Section 3: Clinical Info (Full Width / Grid) */}
          <section className="col-span-12 lg:col-span-7 bg-surface-container-lowest rounded-xl border border-outline-variant shadow-sm p-lg">
            <div className="flex items-center gap-sm mb-lg border-b border-surface-container-high pb-md">
              <span className="material-symbols-outlined text-secondary" style={{ fontVariationSettings: "'FILL' 1" }}>clinical_notes</span>
              <h3 className="text-headline-md font-headline-md text-on-surface">Clinical Info</h3>
            </div>
            <div className="grid grid-cols-2 gap-lg">
              <div className="col-span-2">
                <label className="block text-label-md text-on-surface-variant mb-xs">Chief Complaint</label>
                <textarea 
                  className="w-full p-sm bg-surface-container-low border border-outline-variant rounded-lg text-body-md focus:ring-2 focus:ring-primary focus:border-primary outline-none" 
                  placeholder="Describe the primary reason for admission..." 
                  rows="3"
                  value={complaint}
                  onChange={(e) => setComplaint(e.target.value)}
                ></textarea>
              </div>
              <div className="col-span-2 md:col-span-1">
                <label className="block text-label-md text-on-surface-variant mb-xs">Blood Group</label>
                <div className="grid grid-cols-4 gap-xs">
                  {['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'].map((bg) => (
                    <button
                      key={bg}
                      type="button"
                      onClick={() => setBloodGroup(bg)}
                      className={`py-2 border rounded-lg text-label-md transition-all cursor-pointer ${
                        bloodGroup === bg
                          ? 'border-primary bg-primary-container/20 text-primary font-bold'
                          : 'border-outline-variant text-on-surface-variant hover:bg-primary-container/10'
                      }`}
                    >
                      {bg}
                    </button>
                  ))}
                </div>
              </div>
              <div className="col-span-2 md:col-span-1">
                <label className="block text-label-md text-on-surface-variant mb-xs">Allergy History</label>
                <div className="p-sm border border-outline-variant rounded-lg bg-surface-container-low min-h-[80px]">
                  <div className="flex flex-wrap gap-xs mb-sm">
                    {allergies.map((allergy, index) => (
                      <span key={index} className="px-2 py-1 bg-error-container text-on-error-container text-[11px] font-bold rounded flex items-center gap-1">
                        {allergy}
                        <span 
                          onClick={() => handleRemoveAllergy(index)} 
                          className="material-symbols-outlined text-[14px] cursor-pointer hover:opacity-80"
                        >
                          close
                        </span>
                      </span>
                    ))}
                  </div>
                  <input 
                    className="w-full bg-transparent border-none focus:ring-0 text-body-sm p-0 outline-none" 
                    placeholder="Type allergy and press Enter..." 
                    type="text"
                    value={allergyInput}
                    onChange={(e) => setAllergyInput(e.target.value)}
                    onKeyDown={handleAddAllergy}
                  />
                </div>
              </div>
            </div>
          </section>

          {/* Section 4: Admission Setup (Dynamic Options) */}
          <section className="col-span-12 lg:col-span-5 bg-surface-container-lowest rounded-xl border border-outline-variant shadow-sm p-lg">
            <div className="flex items-center gap-sm mb-lg border-b border-surface-container-high pb-md">
              <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>meeting_room</span>
              <h3 className="text-headline-md font-headline-md text-on-surface">Admission Setup</h3>
            </div>
            <div className="space-y-lg">
              <div>
                <label className="block text-label-md text-on-surface-variant mb-sm">Select Ward Type</label>
                <div className="grid grid-cols-2 gap-sm">
                  <label 
                    onClick={() => setWard('General')}
                    className={`relative flex items-center justify-center p-md border rounded-xl cursor-pointer transition-all ${
                      ward === 'General'
                        ? 'border-2 border-primary bg-primary-container/5'
                        : 'border-outline-variant hover:bg-surface-container-high'
                    }`}
                  >
                    <div className="text-center">
                      <span className="material-symbols-outlined text-primary mb-1">home</span>
                      <p className="text-label-md font-bold">General</p>
                      <p className="text-[10px] text-on-surface-variant">12 Available</p>
                    </div>
                  </label>
                  <label 
                    onClick={() => setWard('ICU')}
                    className={`relative flex items-center justify-center p-md border rounded-xl cursor-pointer transition-all ${
                      ward === 'ICU'
                        ? 'border-2 border-primary bg-primary-container/5'
                        : 'border-outline-variant hover:bg-surface-container-high'
                    }`}
                  >
                    <div className="text-center">
                      <span className="material-symbols-outlined text-primary mb-1" style={{ fontVariationSettings: "'FILL' 1" }}>emergency</span>
                      <p className="text-label-md font-bold text-primary">ICU / ER</p>
                      <p className="text-[10px] text-primary/70">4 Available</p>
                    </div>
                  </label>
                </div>
              </div>
              
              <div>
                <label className="block text-label-md text-on-surface-variant mb-xs">Assign Doctor</label>
                <div className="relative">
                  <select 
                    className="w-full p-sm pl-10 bg-surface-container-low border border-outline-variant rounded-lg text-body-md focus:ring-2 focus:ring-primary focus:border-primary outline-none appearance-none cursor-pointer"
                    value={doctor}
                    onChange={(e) => setDoctor(e.target.value)}
                  >
                    <option>Dr. Elena Rodriguez (Cardiology)</option>
                    <option>Dr. Marcus Thorne (Neurology)</option>
                    <option>Dr. Sarah Jenkins (Orthopedics)</option>
                    <option>Dr. Kevin Park (General Surgery)</option>
                  </select>
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-primary">person</span>
                  <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-outline">expand_more</span>
                </div>
              </div>
              
              <div className="p-md bg-tertiary-fixed/20 rounded-lg border border-tertiary-fixed/30">
                <div className="flex items-start gap-sm">
                  <span className="material-symbols-outlined text-tertiary mt-0.5">info</span>
                  <div>
                    <p className="text-label-md font-bold text-tertiary">Billing Notice</p>
                    <p className="text-[11px] text-on-tertiary-fixed-variant leading-relaxed">Admission to ICU triggers an automatic premium insurance verification request.</p>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* Footer Action Bar */}
        <div className="mt-xl p-lg bg-surface-container-lowest rounded-xl border border-outline-variant shadow-md flex items-center justify-between flex-wrap gap-md">
          <div className="flex items-center gap-md">
            <div className="flex -space-x-2">
              <div className="w-8 h-8 rounded-full border-2 border-surface-container-lowest bg-surface-container-high flex items-center justify-center">
                <span className="text-[10px] font-bold">SM</span>
              </div>
              <div className="w-8 h-8 rounded-full border-2 border-surface-container-lowest bg-primary-container text-on-primary-container flex items-center justify-center">
                <span className="material-symbols-outlined text-[14px]">verified</span>
              </div>
            </div>
            <p className="text-label-md text-on-surface-variant">Registration verified by <span className="font-bold">Staff SM-01</span></p>
          </div>
          <div className="flex gap-md">
            <button 
              type="button" 
              onClick={() => navigate('/dashboard')}
              className="px-xl py-sm rounded-lg text-on-surface-variant font-bold hover:bg-surface-container-high transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button 
              type="submit"
              className="px-xl py-sm bg-primary text-on-primary rounded-lg font-bold flex items-center gap-sm shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
            >
              <span>Save & Generate Patient ID</span>
              <span className="material-symbols-outlined">arrow_forward</span>
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
