import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import Swal from 'sweetalert2';

export default function DoctorPatientVitals() {
  const navigate = useNavigate();
  const location = useLocation();

  const [vitalsList, setVitalsList] = useState([]);
  const [selectedPatientId, setSelectedPatientId] = useState(null);
  const [patientHistory, setPatientHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Filters
  const [criticalFilter, setCriticalFilter] = useState('all'); // 'all' | 'critical'
  const [wardFilter, setWardFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'trends' | 'table'

  // Record Vitals Modal State
  const [showRecordModal, setShowRecordModal] = useState(false);
  const [assignedPatientsList, setAssignedPatientsList] = useState([]);
  const [recordForm, setRecordForm] = useState({
    patientId: '',
    temperature: '',
    bloodPressureSys: '',
    bloodPressureDia: '',
    pulseRate: '',
    oxygenSaturation: '',
    respiratoryRate: '',
    bloodSugar: '',
    weight: '',
    painScore: '0',
    remarks: '',
    recordedAt: new Date().toISOString().slice(0, 16)
  });
  const [submittingVitals, setSubmittingVitals] = useState(false);

  const userRole = localStorage.getItem('userRole') || 'Doctor';
  const userName = localStorage.getItem('userName') || 'Staff Nurse';
  const isNurse = userRole === 'Nurse';

  const fetchAssignedPatientsForSelect = async () => {
    try {
      const token = localStorage.getItem('userToken') || localStorage.getItem('token');
      const res = await axios.get('/api/patients/assigned', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const list = Array.isArray(res.data) ? res.data : (res.data?.patients || []);
      setAssignedPatientsList(list);
      if (list.length > 0 && !recordForm.patientId) {
        setRecordForm(prev => ({ ...prev, patientId: list[0]._id || list[0].patientId }));
      }
    } catch (err) {
      console.error('Error loading assigned patients for vitals selection:', err);
    }
  };

  const handleOpenRecordModal = (presetPatient = null) => {
    fetchAssignedPatientsForSelect();
    const targetPat = presetPatient || (assignedPatientsList.length > 0 ? assignedPatientsList[0] : null);
    setRecordForm({
      patientId: targetPat?._id || targetPat?.patientId || selectedPatientLog?.patientId || selectedPatientLog?.patientCustomId || '',
      temperature: '98.6',
      bloodPressureSys: '120',
      bloodPressureDia: '80',
      pulseRate: '75',
      oxygenSaturation: '98',
      respiratoryRate: '16',
      bloodSugar: '110',
      weight: '70',
      painScore: '0',
      remarks: '',
      recordedAt: new Date().toISOString().slice(0, 16)
    });
    setShowRecordModal(true);
  };

  const handleSaveVitalRecord = async (e) => {
    e.preventDefault();
    if (!recordForm.patientId) {
      Swal.fire('Patient Required', 'Please select an assigned patient.', 'warning');
      return;
    }
    try {
      setSubmittingVitals(true);
      const token = localStorage.getItem('userToken') || localStorage.getItem('token');
      
      const res = await axios.post('/api/vitals', {
        patientId: recordForm.patientId,
        temperature: Number(recordForm.temperature),
        bloodPressureSys: Number(recordForm.bloodPressureSys),
        bloodPressureDia: Number(recordForm.bloodPressureDia),
        pulseRate: Number(recordForm.pulseRate),
        oxygenSaturation: Number(recordForm.oxygenSaturation),
        respiratoryRate: Number(recordForm.respiratoryRate),
        bloodSugar: recordForm.bloodSugar ? Number(recordForm.bloodSugar) : null,
        weight: recordForm.weight ? Number(recordForm.weight) : null,
        painScore: Number(recordForm.painScore) || 0,
        remarks: recordForm.remarks,
        recordedAt: recordForm.recordedAt
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const savedLog = res.data;

      if (savedLog.isCritical) {
        Swal.fire({
          icon: 'warning',
          title: '🚨 Critical Vitals Saved!',
          text: `Critical threshold alert generated for ${savedLog.patientName}. Attending Doctor notified immediately.`,
          confirmButtonColor: '#e11d48'
        });
      } else {
        Swal.fire({
          icon: 'success',
          title: 'Vitals Charted Successfully',
          text: `Recorded for ${savedLog.patientName} in MongoDB.`,
          timer: 1800,
          showConfirmButton: false
        });
      }

      setShowRecordModal(false);
      await fetchVitals();
      if (savedLog.patientCustomId) {
        setSelectedPatientId(savedLog.patientCustomId);
        loadPatientHistory(savedLog.patientCustomId);
      }
    } catch (err) {
      console.error('Error saving vital record:', err);
      Swal.fire('Error', err.response?.data?.message || 'Failed to record vitals', 'error');
    } finally {
      setSubmittingVitals(false);
    }
  };

  const fetchVitals = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('userToken') || localStorage.getItem('token');
      const res = await axios.get('/api/vitals', {
        headers: { Authorization: `Bearer ${token}` }
      });

      const data = res.data || [];
      setVitalsList(data);

      if (data.length > 0) {
        // If navigated with a target patient
        const navTarget = location.state?.patientId || location.state?.patientCustomId;
        const initialMatch = navTarget
          ? data.find(d => d.patientId === navTarget || d.patientCustomId === navTarget)
          : null;

        const defaultId = initialMatch ? initialMatch.patientCustomId : data[0].patientCustomId;
        setSelectedPatientId(defaultId);
        loadPatientHistory(defaultId);
      }
    } catch (err) {
      console.error('Error fetching vitals:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadPatientHistory = async (patientCustomId) => {
    try {
      setHistoryLoading(true);
      const token = localStorage.getItem('userToken') || localStorage.getItem('token');
      const res = await axios.get(`/api/vitals/patient/${patientCustomId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPatientHistory(res.data || []);
    } catch (err) {
      console.error('Error loading patient history:', err);
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    fetchVitals();
  }, []);

  const handleSelectPatient = (customId) => {
    setSelectedPatientId(customId);
    loadPatientHistory(customId);
  };

  // Group latest vitals per unique patient
  const uniquePatientVitalsMap = new Map();
  vitalsList.forEach(log => {
    if (!uniquePatientVitalsMap.has(log.patientCustomId)) {
      uniquePatientVitalsMap.set(log.patientCustomId, log);
    }
  });
  const latestPatientVitals = Array.from(uniquePatientVitalsMap.values());

  const filteredPatients = latestPatientVitals.filter(item => {
    const term = searchQuery.toLowerCase();
    const matchesSearch = (item.patientName || '').toLowerCase().includes(term) ||
                          (item.patientCustomId || '').toLowerCase().includes(term) ||
                          (item.bedNumber || '').toLowerCase().includes(term);
    const matchesCritical = criticalFilter === 'all' || (criticalFilter === 'critical' && item.isCritical);
    const matchesWard = wardFilter === 'All' || item.wardType === wardFilter;
    return matchesSearch && matchesCritical && matchesWard;
  });

  const selectedPatientLog = latestPatientVitals.find(p => p.patientCustomId === selectedPatientId) || latestPatientVitals[0];

  // Helper status checkers
  const getSpo2Status = (val) => {
    if (!val) return { label: 'Unknown', color: 'slate', isCritical: false };
    if (val < 90) return { label: 'CRITICAL LOW', color: 'rose', isCritical: true };
    if (val < 95) return { label: 'LOW WARNING', color: 'amber', isCritical: false };
    return { label: 'NORMAL', color: 'emerald', isCritical: false };
  };

  const getPulseStatus = (val) => {
    if (!val) return { label: 'Unknown', color: 'slate', isCritical: false };
    if (val > 120 || val < 50) return { label: 'CRITICAL', color: 'rose', isCritical: true };
    if (val > 100 || val < 60) return { label: 'WARNING', color: 'amber', isCritical: false };
    return { label: 'NORMAL', color: 'emerald', isCritical: false };
  };

  const getBpStatus = (sys, dia) => {
    if (!sys || !dia) return { label: 'Unknown', color: 'slate', isCritical: false };
    if (sys >= 160 || sys < 90 || dia >= 100 || dia < 60) return { label: 'CRITICAL', color: 'rose', isCritical: true };
    if (sys >= 140 || dia >= 90) return { label: 'ELEVATED', color: 'amber', isCritical: false };
    return { label: 'OPTIMAL', color: 'emerald', isCritical: false };
  };

  const getTempStatus = (val) => {
    if (!val) return { label: 'Unknown', color: 'slate', isCritical: false };
    if (val >= 102.0 || val <= 95.0) return { label: 'CRITICAL', color: 'rose', isCritical: true };
    if (val > 100.4) return { label: 'FEVER', color: 'amber', isCritical: false };
    return { label: 'NORMAL', color: 'emerald', isCritical: false };
  };

  const getPainScoreDetails = (val) => {
    if (val === null || val === undefined) return { label: 'Not Recorded', bg: 'bg-slate-100 text-slate-600', isCritical: false };
    if (val >= 8) return { label: `${val}/10 (Severe Pain)`, bg: 'bg-rose-100 text-rose-800 border-rose-300', isCritical: true };
    if (val >= 4) return { label: `${val}/10 (Moderate Pain)`, bg: 'bg-amber-100 text-amber-800 border-amber-300', isCritical: false };
    if (val > 0) return { label: `${val}/10 (Mild Pain)`, bg: 'bg-blue-100 text-blue-800 border-blue-200', isCritical: false };
    return { label: '0/10 (No Pain)', bg: 'bg-emerald-100 text-emerald-800 border-emerald-200', isCritical: false };
  };

  // Sparkline/trend calculator
  const buildTrendPoints = (dataArray, key, minVal, maxVal, height = 40, width = 180) => {
    if (!dataArray || dataArray.length < 2) return '';
    const range = maxVal - minVal || 1;
    const step = width / (dataArray.length - 1);

    return dataArray.map((d, i) => {
      const val = d[key] || minVal;
      const normalized = Math.max(0, Math.min(1, (val - minVal) / range));
      const y = height - (normalized * (height - 8)) - 4;
      const x = i * step;
      return `${x},${y}`;
    }).join(' ');
  };

  return (
    <div className="w-full h-full flex flex-col space-y-4">
      {/* Top Banner */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-100 shadow-2xs">
            <span className="material-symbols-outlined text-2xl animate-pulse">ecg_heart</span>
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Patient Vitals & Clinical Monitoring</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Doctor Review Suite • Nursing-Recorded Real-time Vitals, Critical Threshold Alerts & Longitudinal Trends
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 self-start lg:self-center">
          {isNurse ? (
            <button
              onClick={() => handleOpenRecordModal()}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition-all shadow-xs flex items-center gap-1.5 animate-pulse"
            >
              <span className="material-symbols-outlined text-base">favorite</span>
              Record Patient Vitals
            </button>
          ) : (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-50 border border-teal-200 text-teal-800 rounded-xl text-xs font-bold">
              <span className="w-2 h-2 rounded-full bg-teal-500 animate-pulse"></span>
              <span>Nurse Real-time Feed</span>
            </div>
          )}

          <button
            onClick={() => fetchVitals()}
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-base">refresh</span>
            Refresh Feed
          </button>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center">
            <span className="material-symbols-outlined text-xl">monitor_heart</span>
          </div>
          <div>
            <p className="text-[11px] text-slate-500 font-bold uppercase tracking-wider">Patients Monitored</p>
            <p className="text-xl font-black text-slate-900">{latestPatientVitals.length}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-rose-200 shadow-xs flex items-center gap-3 bg-rose-50/20">
          <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center">
            <span className="material-symbols-outlined text-xl">warning</span>
          </div>
          <div>
            <p className="text-[11px] text-rose-700 font-bold uppercase tracking-wider">Critical Alerts</p>
            <p className="text-xl font-black text-rose-700">
              {latestPatientVitals.filter(p => p.isCritical).length}
            </p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
            <span className="material-symbols-outlined text-xl">health_and_safety</span>
          </div>
          <div>
            <p className="text-[11px] text-slate-500 font-bold uppercase tracking-wider">Stable Patients</p>
            <p className="text-xl font-black text-emerald-700">
              {latestPatientVitals.filter(p => !p.isCritical).length}
            </p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-xl">medical_services</span>
          </div>
          <div>
            <p className="text-[11px] text-slate-500 font-bold uppercase tracking-wider">Nursing Rounds</p>
            <p className="text-xl font-black text-indigo-700">{vitalsList.length} Logs</p>
          </div>
        </div>
      </div>

      {/* Main Content Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1">
        {/* Left: Patient Monitor List (4 cols) */}
        <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200 shadow-xs flex flex-col overflow-hidden">
          <div className="p-3.5 border-b border-slate-200 bg-slate-50/70 space-y-2.5">
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-2 text-slate-400 text-lg">search</span>
              <input
                type="text"
                placeholder="Search patient, ID or bed..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:border-teal-600"
              />
            </div>

            <div className="flex items-center justify-between gap-1 text-xs">
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCriticalFilter('all')}
                  className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-colors ${
                    criticalFilter === 'all'
                      ? 'bg-slate-800 text-white'
                      : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  All ({latestPatientVitals.length})
                </button>
                <button
                  onClick={() => setCriticalFilter('critical')}
                  className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-colors flex items-center gap-1 ${
                    criticalFilter === 'critical'
                      ? 'bg-rose-600 text-white shadow-2xs'
                      : 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>
                  Critical ({latestPatientVitals.filter(p => p.isCritical).length})
                </button>
              </div>

              <select
                value={wardFilter}
                onChange={(e) => setWardFilter(e.target.value)}
                className="p-1 text-[11px] font-bold rounded-lg border border-slate-200 bg-white"
              >
                <option value="All">All Wards</option>
                <option value="ICU">ICU</option>
                <option value="CCU">CCU</option>
                <option value="General Ward">General Ward</option>
                <option value="Emergency">Emergency</option>
              </select>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 max-h-[640px]">
            {loading ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                <span className="material-symbols-outlined animate-spin text-2xl text-teal-600 mb-1">progress_activity</span>
                <p>Loading patient vitals...</p>
              </div>
            ) : filteredPatients.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                <span className="material-symbols-outlined text-3xl text-slate-300 mb-1">ecg</span>
                <p>No patients match the filter.</p>
              </div>
            ) : (
              filteredPatients.map(item => {
                const isSelected = selectedPatientLog?.patientCustomId === item.patientCustomId;
                const spo2 = getSpo2Status(item.oxygenSaturation);
                const pulse = getPulseStatus(item.pulseRate);

                return (
                  <div
                    key={item._id || item.patientCustomId}
                    onClick={() => handleSelectPatient(item.patientCustomId)}
                    className={`p-3.5 cursor-pointer transition-colors ${
                      isSelected ? 'bg-teal-50/80 border-l-4 border-teal-600' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <h4 className="text-xs font-bold text-slate-900">{item.patientName}</h4>
                          <span className="text-[10px] font-mono px-1.5 py-0.2 bg-slate-100 text-slate-600 rounded font-bold">
                            {item.patientCustomId}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          {item.wardType} • Bed <strong>{item.bedNumber}</strong>
                        </p>
                      </div>

                      {item.isCritical ? (
                        <span className="px-2 py-0.5 bg-rose-100 text-rose-800 text-[10px] font-black rounded-full flex items-center gap-1 animate-pulse">
                          <span className="material-symbols-outlined text-xs">warning</span>
                          CRITICAL
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 text-[10px] font-bold rounded-full border border-emerald-100">
                          Stable
                        </span>
                      )}
                    </div>

                    {/* Vitals Quick Pill Strip */}
                    <div className="mt-2 grid grid-cols-4 gap-1 text-[10px] text-center">
                      <div className={`p-1 rounded-md ${item.oxygenSaturation < 90 ? 'bg-rose-100 text-rose-900 font-bold' : 'bg-slate-100 text-slate-700'}`}>
                        <span className="block text-[9px] text-slate-400">SpO₂</span>
                        <strong>{item.oxygenSaturation}%</strong>
                      </div>
                      <div className={`p-1 rounded-md ${item.pulseRate > 120 || item.pulseRate < 50 ? 'bg-rose-100 text-rose-900 font-bold' : 'bg-slate-100 text-slate-700'}`}>
                        <span className="block text-[9px] text-slate-400">HR</span>
                        <strong>{item.pulseRate}</strong>
                      </div>
                      <div className="p-1 rounded-md bg-slate-100 text-slate-700">
                        <span className="block text-[9px] text-slate-400">BP</span>
                        <strong className="text-[9px]">{item.bloodPressure || `${item.bloodPressureSys}/${item.bloodPressureDia}`}</strong>
                      </div>
                      <div className={`p-1 rounded-md ${item.temperature >= 102 ? 'bg-rose-100 text-rose-900 font-bold' : 'bg-slate-100 text-slate-700'}`}>
                        <span className="block text-[9px] text-slate-400">Temp</span>
                        <strong>{item.temperature}°</strong>
                      </div>
                    </div>

                    {/* Critical flag snippet if any */}
                    {item.isCritical && item.criticalFlags?.length > 0 && (
                      <div className="mt-2 p-1.5 bg-rose-50 border border-rose-200 rounded-lg text-[10px] text-rose-900 font-semibold flex items-center gap-1">
                        <span className="material-symbols-outlined text-xs text-rose-600">crisis_alert</span>
                        <span className="truncate">{item.criticalFlags.join(' • ')}</span>
                      </div>
                    )}

                    {/* Recorded By Nurse footer */}
                    <div className="mt-2 text-[10px] text-slate-400 flex items-center justify-between border-t border-slate-100 pt-1.5">
                      <span>By: <strong>{item.nurseName || 'Nurse'}</strong></span>
                      <span>{new Date(item.recordedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right: Detailed Vitals, Hospital Thresholds & Longitudinal Trends (8 cols) */}
        <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200 shadow-xs flex flex-col overflow-hidden">
          {!selectedPatientLog ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400">
              <span className="material-symbols-outlined text-4xl text-slate-300 mb-2">vital_signs</span>
              <p className="text-xs font-semibold">Select a patient from the left panel to inspect detailed vital trends.</p>
            </div>
          ) : (
            <div className="flex-1 flex flex-col">
              {/* Header Info */}
              <div className="p-4 border-b border-slate-200 bg-slate-50/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-black text-slate-900">{selectedPatientLog.patientName}</h3>
                    <span className="text-xs font-mono px-2 py-0.5 bg-teal-100 text-teal-800 font-bold rounded-md">
                      {selectedPatientLog.patientCustomId}
                    </span>
                    <span className="text-xs px-2.5 py-0.5 bg-indigo-50 text-indigo-700 font-bold rounded-md border border-indigo-100">
                      {selectedPatientLog.wardType} • Bed {selectedPatientLog.bedNumber}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1 flex items-center gap-2">
                    <span>Last checked: <strong>{new Date(selectedPatientLog.recordedAt).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</strong></span>
                    <span>•</span>
                    <span>Recorded By: <strong className="text-slate-700">{selectedPatientLog.nurseName || 'Staff Nurse'}</strong></span>
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => navigate('/consultations', { state: { patientId: selectedPatientLog.patientId || selectedPatientLog.patientCustomId } })}
                    className="px-3 py-1.5 bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold rounded-xl transition-colors flex items-center gap-1 shadow-xs"
                  >
                    <span className="material-symbols-outlined text-sm">stethoscope</span>
                    Consultation
                  </button>

                  <button
                    onClick={() => navigate('/prescriptions', { state: { patientId: selectedPatientLog.patientId || selectedPatientLog.patientCustomId } })}
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-colors flex items-center gap-1 shadow-xs"
                  >
                    <span className="material-symbols-outlined text-sm">prescriptions</span>
                    Prescribe Rx
                  </button>
                </div>
              </div>

              {/* View Tabs */}
              <div className="px-5 pt-3 border-b border-slate-200 flex items-center gap-4 text-xs font-bold">
                <button
                  onClick={() => setActiveTab('overview')}
                  className={`pb-2.5 transition-colors border-b-2 flex items-center gap-1.5 ${
                    activeTab === 'overview'
                      ? 'border-teal-700 text-teal-800'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <span className="material-symbols-outlined text-base">dashboard</span>
                  Current Clinical Assessment
                </button>

                <button
                  onClick={() => setActiveTab('trends')}
                  className={`pb-2.5 transition-colors border-b-2 flex items-center gap-1.5 ${
                    activeTab === 'trends'
                      ? 'border-teal-700 text-teal-800'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <span className="material-symbols-outlined text-base">show_chart</span>
                  Longitudinal Vitals Trends ({patientHistory.length})
                </button>

                <button
                  onClick={() => setActiveTab('table')}
                  className={`pb-2.5 transition-colors border-b-2 flex items-center gap-1.5 ${
                    activeTab === 'table'
                      ? 'border-teal-700 text-teal-800'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <span className="material-symbols-outlined text-base">table_rows</span>
                  Nursing Logs History
                </button>
              </div>

              {/* Tab 1: Current Clinical Assessment */}
              {activeTab === 'overview' && (
                <div className="p-5 space-y-4 overflow-y-auto flex-1 max-h-[580px]">
                  {/* CRITICAL ALERTS BANNER (If Triggered) */}
                  {selectedPatientLog.isCritical && (
                    <div className="p-4 bg-rose-50 border-2 border-rose-400 rounded-2xl space-y-2 animate-fade-in shadow-xs">
                      <div className="flex items-center gap-2 text-rose-900 font-bold text-sm">
                        <span className="material-symbols-outlined text-xl text-rose-600 animate-bounce">crisis_alert</span>
                        <span>CRITICAL VITAL VALUE ALERT ACCORDING TO HOSPITAL THRESHOLDS</span>
                      </div>
                      <div className="flex flex-wrap gap-2 pt-1">
                        {selectedPatientLog.criticalFlags?.map((flag, idx) => (
                          <span key={idx} className="px-3 py-1 bg-rose-600 text-white font-black text-xs rounded-xl shadow-xs flex items-center gap-1.5">
                            <span className="material-symbols-outlined text-sm">warning</span>
                            {flag}
                          </span>
                        ))}
                      </div>
                      <p className="text-xs text-rose-800 mt-1">
                        Hospital safety protocol requires attending doctor evaluation and therapeutic adjustment.
                      </p>
                    </div>
                  )}

                  {/* Warning Alerts Banner (If any) */}
                  {!selectedPatientLog.isCritical && selectedPatientLog.warningFlags?.length > 0 && (
                    <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl flex items-center gap-2 text-xs text-amber-900">
                      <span className="material-symbols-outlined text-amber-600 text-base">warning</span>
                      <span>
                        <strong>Borderline Warning:</strong> {selectedPatientLog.warningFlags.join(' • ')}
                      </span>
                    </div>
                  )}

                  {/* 8-Card Structured Clinical Vitals Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
                    {/* 1. Oxygen Saturation (SpO2) */}
                    {(() => {
                      const st = getSpo2Status(selectedPatientLog.oxygenSaturation);
                      return (
                        <div className={`p-4 rounded-xl border ${st.isCritical ? 'bg-rose-50/50 border-rose-300' : 'bg-slate-50 border-slate-200'} space-y-1.5`}>
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold text-slate-500 uppercase">SpO₂ Oxygen</span>
                            <span className="material-symbols-outlined text-lg text-teal-700">air</span>
                          </div>
                          <div className="flex items-baseline gap-1">
                            <span className="text-2xl font-black text-slate-900">{selectedPatientLog.oxygenSaturation}</span>
                            <span className="text-xs text-slate-500 font-bold">%</span>
                          </div>
                          <div className="flex items-center justify-between pt-1 border-t border-slate-200 text-[10px]">
                            <span className="text-slate-400">Target ≥ 95%</span>
                            <span className={`font-bold text-${st.color}-700`}>{st.label}</span>
                          </div>
                        </div>
                      );
                    })()}

                    {/* 2. Heart Rate / Pulse */}
                    {(() => {
                      const st = getPulseStatus(selectedPatientLog.pulseRate);
                      return (
                        <div className={`p-4 rounded-xl border ${st.isCritical ? 'bg-rose-50/50 border-rose-300' : 'bg-slate-50 border-slate-200'} space-y-1.5`}>
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold text-slate-500 uppercase">Heart Rate</span>
                            <span className="material-symbols-outlined text-lg text-rose-600">favorite</span>
                          </div>
                          <div className="flex items-baseline gap-1">
                            <span className="text-2xl font-black text-slate-900">{selectedPatientLog.pulseRate}</span>
                            <span className="text-xs text-slate-500 font-bold">bpm</span>
                          </div>
                          <div className="flex items-center justify-between pt-1 border-t border-slate-200 text-[10px]">
                            <span className="text-slate-400">60 - 100 bpm</span>
                            <span className={`font-bold text-${st.color}-700`}>{st.label}</span>
                          </div>
                        </div>
                      );
                    })()}

                    {/* 3. Blood Pressure */}
                    {(() => {
                      const sys = selectedPatientLog.bloodPressureSys || 120;
                      const dia = selectedPatientLog.bloodPressureDia || 80;
                      const st = getBpStatus(sys, dia);
                      return (
                        <div className={`p-4 rounded-xl border ${st.isCritical ? 'bg-rose-50/50 border-rose-300' : 'bg-slate-50 border-slate-200'} space-y-1.5`}>
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold text-slate-500 uppercase">Blood Pressure</span>
                            <span className="material-symbols-outlined text-lg text-indigo-600">speed</span>
                          </div>
                          <div className="flex items-baseline gap-1">
                            <span className="text-xl font-black text-slate-900">
                              {selectedPatientLog.bloodPressure || `${sys}/${dia}`}
                            </span>
                            <span className="text-[10px] text-slate-500 font-bold">mmHg</span>
                          </div>
                          <div className="flex items-center justify-between pt-1 border-t border-slate-200 text-[10px]">
                            <span className="text-slate-400">120/80</span>
                            <span className={`font-bold text-${st.color}-700`}>{st.label}</span>
                          </div>
                        </div>
                      );
                    })()}

                    {/* 4. Body Temperature */}
                    {(() => {
                      const st = getTempStatus(selectedPatientLog.temperature);
                      return (
                        <div className={`p-4 rounded-xl border ${st.isCritical ? 'bg-rose-50/50 border-rose-300' : 'bg-slate-50 border-slate-200'} space-y-1.5`}>
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold text-slate-500 uppercase">Temperature</span>
                            <span className="material-symbols-outlined text-lg text-amber-600">thermostat</span>
                          </div>
                          <div className="flex items-baseline gap-1">
                            <span className="text-2xl font-black text-slate-900">{selectedPatientLog.temperature}</span>
                            <span className="text-xs text-slate-500 font-bold">°F</span>
                          </div>
                          <div className="flex items-center justify-between pt-1 border-t border-slate-200 text-[10px]">
                            <span className="text-slate-400">97.8 - 99.0°F</span>
                            <span className={`font-bold text-${st.color}-700`}>{st.label}</span>
                          </div>
                        </div>
                      );
                    })()}

                    {/* 5. Respiratory Rate */}
                    <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-slate-500 uppercase">Resp. Rate</span>
                        <span className="material-symbols-outlined text-lg text-cyan-600">lungs</span>
                      </div>
                      <div className="flex items-baseline gap-1">
                        <span className="text-2xl font-black text-slate-900">{selectedPatientLog.respiratoryRate || 16}</span>
                        <span className="text-xs text-slate-500 font-bold">/min</span>
                      </div>
                      <div className="flex items-center justify-between pt-1 border-t border-slate-200 text-[10px]">
                        <span className="text-slate-400">12 - 20 /min</span>
                        <span className="font-bold text-emerald-700">NORMAL</span>
                      </div>
                    </div>

                    {/* 6. Blood Sugar */}
                    <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-slate-500 uppercase">Blood Sugar</span>
                        <span className="material-symbols-outlined text-lg text-purple-600">water_drop</span>
                      </div>
                      <div className="flex items-baseline gap-1">
                        <span className="text-2xl font-black text-slate-900">
                          {selectedPatientLog.bloodSugar ? selectedPatientLog.bloodSugar : '--'}
                        </span>
                        <span className="text-xs text-slate-500 font-bold">mg/dL</span>
                      </div>
                      <div className="flex items-center justify-between pt-1 border-t border-slate-200 text-[10px]">
                        <span className="text-slate-400">70 - 140 mg/dL</span>
                        <span className="font-bold text-slate-600">{selectedPatientLog.bloodSugar ? 'RECORDED' : 'NOT RECORDED'}</span>
                      </div>
                    </div>

                    {/* 7. Patient Weight */}
                    <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-slate-500 uppercase">Weight</span>
                        <span className="material-symbols-outlined text-lg text-slate-600">scale</span>
                      </div>
                      <div className="flex items-baseline gap-1">
                        <span className="text-2xl font-black text-slate-900">
                          {selectedPatientLog.weight ? selectedPatientLog.weight : '--'}
                        </span>
                        <span className="text-xs text-slate-500 font-bold">kg</span>
                      </div>
                      <div className="flex items-center justify-between pt-1 border-t border-slate-200 text-[10px]">
                        <span className="text-slate-400">Baseline</span>
                        <span className="font-bold text-slate-700">Inpatient</span>
                      </div>
                    </div>

                    {/* 8. Pain Score (0 - 10) */}
                    {(() => {
                      const pain = getPainScoreDetails(selectedPatientLog.painScore);
                      return (
                        <div className={`p-4 rounded-xl border ${pain.isCritical ? 'bg-rose-50/50 border-rose-300' : 'bg-slate-50 border-slate-200'} space-y-1.5`}>
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold text-slate-500 uppercase">Pain Score</span>
                            <span className="material-symbols-outlined text-lg text-rose-500">mood_bad</span>
                          </div>
                          <div className="flex items-baseline gap-1">
                            <span className="text-2xl font-black text-slate-900">
                              {selectedPatientLog.painScore !== null && selectedPatientLog.painScore !== undefined ? selectedPatientLog.painScore : 0}
                            </span>
                            <span className="text-xs text-slate-500 font-bold">/ 10</span>
                          </div>
                          <div className="pt-1 border-t border-slate-200 text-[10px]">
                            <span className={`px-2 py-0.5 rounded font-bold border block text-center ${pain.bg}`}>
                              {pain.label}
                            </span>
                          </div>
                        </div>
                      );
                    })()}
                  </div>

                  {/* Nursing Observations & Notes Box */}
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-teal-700 text-base">clinical_notes</span>
                        Nursing Clinical Notes & Physical Observations
                      </span>
                      <span className="text-[11px] text-slate-500">
                        Logged by: <strong>{selectedPatientLog.nurseName || 'Nurse'}</strong>
                      </span>
                    </div>
                    <p className="text-xs text-slate-700 bg-white p-3 rounded-lg border border-slate-200/80 leading-relaxed whitespace-pre-line">
                      {selectedPatientLog.notes || 'Routine nursing vital observation completed. No acute discomfort verbalized.'}
                    </p>
                  </div>

                  {/* Configured Hospital Thresholds Reference Footer */}
                  <div className="p-3 bg-teal-50/60 rounded-xl border border-teal-200/70 text-[11px] text-teal-900 space-y-1">
                    <span className="font-bold flex items-center gap-1">
                      <span className="material-symbols-outlined text-sm">tune</span>
                      Hospital Clinical Threshold Parameters Configured:
                    </span>
                    <p className="text-slate-600">
                      • <strong>SpO₂ Critical:</strong> &lt; 90% (Low Warning: &lt; 95%) &nbsp;|&nbsp;
                      • <strong>Heart Rate Critical:</strong> &gt; 120 or &lt; 50 bpm &nbsp;|&nbsp;
                      • <strong>BP Critical:</strong> &gt; 160 or &lt; 90 mmHg &nbsp;|&nbsp;
                      • <strong>Temp Critical:</strong> &ge; 102.0°F or &le; 95.0°F &nbsp;|&nbsp;
                      • <strong>Blood Sugar Critical:</strong> &gt; 250 or &lt; 60 mg/dL
                    </p>
                  </div>
                </div>
              )}

              {/* Tab 2: Longitudinal Vitals Trends Charts */}
              {activeTab === 'trends' && (
                <div className="p-5 space-y-5 overflow-y-auto flex-1 max-h-[580px]">
                  {historyLoading ? (
                    <div className="p-10 text-center text-slate-400 text-xs">
                      <span className="material-symbols-outlined animate-spin text-2xl text-teal-600 mb-1">progress_activity</span>
                      <p>Calculating trend trajectories...</p>
                    </div>
                  ) : patientHistory.length < 2 ? (
                    <div className="p-8 text-center bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-500">
                      <span className="material-symbols-outlined text-3xl text-slate-300 mb-1">timeline</span>
                      <p>At least 2 vital logs are required to generate trend curves. (Current recorded logs: {patientHistory.length})</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* Trend 1: SpO2 Trend */}
                      <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                            <span className="material-symbols-outlined text-teal-700 text-base">air</span>
                            Oxygen Saturation (SpO₂ %) Trend
                          </span>
                          <span className="text-[11px] font-bold text-teal-700">
                            Current: {patientHistory[patientHistory.length - 1]?.oxygenSaturation}%
                          </span>
                        </div>

                        <div className="bg-white p-3 rounded-lg border border-slate-200 h-28 flex items-end">
                          <svg className="w-full h-full overflow-visible">
                            {/* Threshold Reference Line at 90% */}
                            <line x1="0" y1="50" x2="100%" y2="50" stroke="#fda4af" strokeDasharray="4 2" strokeWidth="1" />
                            <polyline
                              fill="none"
                              stroke="#0d9488"
                              strokeWidth="2.5"
                              points={buildTrendPoints(patientHistory, 'oxygenSaturation', 80, 100, 80, 400)}
                            />
                          </svg>
                        </div>
                        <div className="flex justify-between text-[10px] text-slate-400">
                          <span>Oldest Log ({new Date(patientHistory[0]?.recordedAt).toLocaleDateString('en-GB')})</span>
                          <span>Latest Log ({new Date(patientHistory[patientHistory.length - 1]?.recordedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})</span>
                        </div>
                      </div>

                      {/* Trend 2: Heart Rate (Pulse) Trend */}
                      <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                            <span className="material-symbols-outlined text-rose-600 text-base">favorite</span>
                            Heart Rate (Pulse bpm) Trend
                          </span>
                          <span className="text-[11px] font-bold text-rose-700">
                            Current: {patientHistory[patientHistory.length - 1]?.pulseRate} bpm
                          </span>
                        </div>

                        <div className="bg-white p-3 rounded-lg border border-slate-200 h-28 flex items-end">
                          <svg className="w-full h-full overflow-visible">
                            <polyline
                              fill="none"
                              stroke="#e11d48"
                              strokeWidth="2.5"
                              points={buildTrendPoints(patientHistory, 'pulseRate', 40, 140, 80, 400)}
                            />
                          </svg>
                        </div>
                        <div className="flex justify-between text-[10px] text-slate-400">
                          <span>Baseline</span>
                          <span>Latest</span>
                        </div>
                      </div>

                      {/* Trend 3: Blood Pressure Systolic Trend */}
                      <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                            <span className="material-symbols-outlined text-indigo-600 text-base">speed</span>
                            Systolic Blood Pressure (mmHg) Trend
                          </span>
                          <span className="text-[11px] font-bold text-indigo-700">
                            Current: {patientHistory[patientHistory.length - 1]?.bloodPressureSys} mmHg
                          </span>
                        </div>

                        <div className="bg-white p-3 rounded-lg border border-slate-200 h-28 flex items-end">
                          <svg className="w-full h-full overflow-visible">
                            <polyline
                              fill="none"
                              stroke="#4f46e5"
                              strokeWidth="2.5"
                              points={buildTrendPoints(patientHistory, 'bloodPressureSys', 80, 180, 80, 400)}
                            />
                          </svg>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Tab 3: Nursing Logs Table */}
              {activeTab === 'table' && (
                <div className="p-5 overflow-y-auto flex-1 max-h-[580px]">
                  <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                          <th className="p-2.5">Date & Time</th>
                          <th className="p-2.5">Nurse</th>
                          <th className="p-2.5">Temp</th>
                          <th className="p-2.5">BP</th>
                          <th className="p-2.5">Pulse</th>
                          <th className="p-2.5">SpO₂</th>
                          <th className="p-2.5">Resp</th>
                          <th className="p-2.5">Blood Sugar</th>
                          <th className="p-2.5">Pain</th>
                          <th className="p-2.5">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {patientHistory.map((log, idx) => (
                          <tr key={idx} className={`hover:bg-slate-50 ${log.isCritical ? 'bg-rose-50/40' : ''}`}>
                            <td className="p-2.5 font-mono text-[11px] text-slate-700">
                              {new Date(log.recordedAt).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                            </td>
                            <td className="p-2.5 font-semibold text-slate-800">{log.nurseName || 'Nurse'}</td>
                            <td className="p-2.5 font-bold">{log.temperature}°F</td>
                            <td className="p-2.5 font-mono">{log.bloodPressure || `${log.bloodPressureSys}/${log.bloodPressureDia}`}</td>
                            <td className="p-2.5 font-bold">{log.pulseRate} bpm</td>
                            <td className={`p-2.5 font-bold ${log.oxygenSaturation < 90 ? 'text-rose-700' : 'text-teal-800'}`}>
                              {log.oxygenSaturation}%
                            </td>
                            <td className="p-2.5">{log.respiratoryRate || 16}/m</td>
                            <td className="p-2.5">{log.bloodSugar ? `${log.bloodSugar} mg/dL` : '--'}</td>
                            <td className="p-2.5">{log.painScore !== null && log.painScore !== undefined ? `${log.painScore}/10` : '--'}</td>
                            <td className="p-2.5">
                              {log.isCritical ? (
                                <span className="px-2 py-0.5 bg-rose-100 text-rose-800 font-bold rounded-md text-[10px]">
                                  Critical
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 font-semibold rounded-md text-[10px]">
                                  Stable
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Record Patient Vitals Modal Dialog */}
      {showRecordModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-fade-in">
            {/* Modal Header */}
            <div className="p-4.5 bg-gradient-to-r from-teal-800 to-teal-950 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center">
                  <span className="material-symbols-outlined text-rose-300 text-xl animate-pulse">favorite</span>
                </div>
                <div>
                  <h3 className="text-sm font-black tracking-wide">Record Clinical Patient Vitals</h3>
                  <p className="text-[11px] text-teal-200">
                    Logged by {userName} ({userRole}) • Saved to MongoDB with clinical threshold validation
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowRecordModal(false)}
                className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
              >
                <span className="material-symbols-outlined text-base">close</span>
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveVitalRecord} className="p-5 overflow-y-auto space-y-4 text-xs">
              
              {/* 1. Patient Selection */}
              <div>
                <label className="text-[11px] font-bold text-slate-700 uppercase block mb-1">
                  Select Patient <span className="text-rose-500">*</span>
                </label>
                <select
                  required
                  value={recordForm.patientId}
                  onChange={(e) => setRecordForm({ ...recordForm, patientId: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-teal-600 font-bold text-slate-800"
                >
                  <option value="">-- Choose Assigned Inpatient --</option>
                  {assignedPatientsList.map((p) => (
                    <option key={p._id || p.patientId} value={p._id || p.patientId}>
                      {p.fullName || p.name} ({p.patientId}) - {p.admissionSetup?.wardType || p.ward || 'Ward'} (Bed {p.bedId?.bedNumber || p.bedNumber || 'N/A'})
                    </option>
                  ))}
                  {assignedPatientsList.length === 0 && selectedPatientLog && (
                    <option value={selectedPatientLog.patientId || selectedPatientLog.patientCustomId}>
                      {selectedPatientLog.patientName} ({selectedPatientLog.patientCustomId}) - {selectedPatientLog.wardType} (Bed {selectedPatientLog.bedNumber})
                    </option>
                  )}
                </select>
              </div>

              {/* 2. Primary Vital Signs Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                
                {/* Temperature */}
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                  <label className="text-[10px] font-black text-slate-500 uppercase block mb-1">
                    Temp (°F) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    placeholder="98.6"
                    value={recordForm.temperature}
                    onChange={(e) => setRecordForm({ ...recordForm, temperature: e.target.value })}
                    className="w-full p-2 text-xs rounded-lg border border-slate-200 bg-white font-bold text-slate-800"
                  />
                  <span className="text-[9px] text-slate-400 mt-0.5 block">Threshold: &ge; 102.0°F critical</span>
                </div>

                {/* Heart Rate / Pulse */}
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                  <label className="text-[10px] font-black text-slate-500 uppercase block mb-1">
                    Heart Rate (bpm) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    placeholder="75"
                    value={recordForm.pulseRate}
                    onChange={(e) => setRecordForm({ ...recordForm, pulseRate: e.target.value })}
                    className="w-full p-2 text-xs rounded-lg border border-slate-200 bg-white font-bold text-slate-800"
                  />
                  <span className="text-[9px] text-slate-400 mt-0.5 block">Threshold: &gt; 120 or &lt; 50 bpm</span>
                </div>

                {/* SpO2 */}
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                  <label className="text-[10px] font-black text-slate-500 uppercase block mb-1">
                    SpO₂ (%) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    placeholder="98"
                    value={recordForm.oxygenSaturation}
                    onChange={(e) => setRecordForm({ ...recordForm, oxygenSaturation: e.target.value })}
                    className="w-full p-2 text-xs rounded-lg border border-slate-200 bg-white font-bold text-slate-800"
                  />
                  <span className="text-[9px] text-slate-400 mt-0.5 block">Threshold: &lt; 90% critical alert</span>
                </div>

                {/* BP Systolic */}
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                  <label className="text-[10px] font-black text-slate-500 uppercase block mb-1">
                    BP Systolic (mmHg) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    placeholder="120"
                    value={recordForm.bloodPressureSys}
                    onChange={(e) => setRecordForm({ ...recordForm, bloodPressureSys: e.target.value })}
                    className="w-full p-2 text-xs rounded-lg border border-slate-200 bg-white font-bold text-slate-800"
                  />
                  <span className="text-[9px] text-slate-400 mt-0.5 block">Threshold: &ge; 160 or &lt; 90</span>
                </div>

                {/* BP Diastolic */}
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                  <label className="text-[10px] font-black text-slate-500 uppercase block mb-1">
                    BP Diastolic (mmHg) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    placeholder="80"
                    value={recordForm.bloodPressureDia}
                    onChange={(e) => setRecordForm({ ...recordForm, bloodPressureDia: e.target.value })}
                    className="w-full p-2 text-xs rounded-lg border border-slate-200 bg-white font-bold text-slate-800"
                  />
                  <span className="text-[9px] text-slate-400 mt-0.5 block">Threshold: &ge; 100 or &lt; 60</span>
                </div>

                {/* Respiratory Rate */}
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                  <label className="text-[10px] font-black text-slate-500 uppercase block mb-1">
                    Resp Rate (/min)
                  </label>
                  <input
                    type="number"
                    placeholder="16"
                    value={recordForm.respiratoryRate}
                    onChange={(e) => setRecordForm({ ...recordForm, respiratoryRate: e.target.value })}
                    className="w-full p-2 text-xs rounded-lg border border-slate-200 bg-white font-bold text-slate-800"
                  />
                  <span className="text-[9px] text-slate-400 mt-0.5 block">Normal: 12-20 /min</span>
                </div>
              </div>

              {/* 3. Secondary Metrics: Blood Sugar, Weight, Pain Level, Timestamp */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Blood Sugar (mg/dL)</label>
                  <input
                    type="number"
                    placeholder="110"
                    value={recordForm.bloodSugar}
                    onChange={(e) => setRecordForm({ ...recordForm, bloodSugar: e.target.value })}
                    className="w-full p-2 text-xs rounded-lg border border-slate-200 bg-slate-50 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Weight (kg)</label>
                  <input
                    type="number"
                    step="0.5"
                    placeholder="70"
                    value={recordForm.weight}
                    onChange={(e) => setRecordForm({ ...recordForm, weight: e.target.value })}
                    className="w-full p-2 text-xs rounded-lg border border-slate-200 bg-slate-50 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Pain Score (0-10)</label>
                  <select
                    value={recordForm.painScore}
                    onChange={(e) => setRecordForm({ ...recordForm, painScore: e.target.value })}
                    className="w-full p-2 text-xs rounded-lg border border-slate-200 bg-slate-50 focus:bg-white font-semibold text-slate-800"
                  >
                    <option value="0">0 - No Pain</option>
                    <option value="1">1 - Minimal</option>
                    <option value="2">2 - Mild</option>
                    <option value="3">3 - Noticeable</option>
                    <option value="4">4 - Moderate</option>
                    <option value="5">5 - Distracting</option>
                    <option value="6">6 - Severe</option>
                    <option value="7">7 - Very Severe</option>
                    <option value="8">8 - Intense (Critical)</option>
                    <option value="9">9 - Unbearable (Critical)</option>
                    <option value="10">10 - Worst Possible (Critical)</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Date & Time</label>
                  <input
                    type="datetime-local"
                    value={recordForm.recordedAt}
                    onChange={(e) => setRecordForm({ ...recordForm, recordedAt: e.target.value })}
                    className="w-full p-2 text-xs rounded-lg border border-slate-200 bg-slate-50 focus:bg-white font-mono"
                  />
                </div>
              </div>

              {/* 4. Clinical Remarks / Notes */}
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Clinical Remarks & Nursing Observations</label>
                <textarea
                  rows={2}
                  placeholder="Patient comfort, response to oxygen, IV drip rates, physical symptoms, or attending alerts..."
                  value={recordForm.remarks}
                  onChange={(e) => setRecordForm({ ...recordForm, remarks: e.target.value })}
                  className="w-full p-2.5 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-teal-600"
                ></textarea>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowRecordModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingVitals}
                  className="px-5 py-2 bg-teal-700 hover:bg-teal-800 text-white font-bold rounded-xl shadow-xs transition-colors text-xs flex items-center gap-1.5 disabled:opacity-50"
                >
                  <span className="material-symbols-outlined text-sm">save</span>
                  {submittingVitals ? 'Saving to MongoDB...' : 'Save & Check Thresholds'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
