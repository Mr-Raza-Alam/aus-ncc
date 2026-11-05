import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../shared/auth/AuthContext';
import api from '../../shared/api/axios';
import FormInput from '../../components/FormInput/FormInput';
import './OnboardingPage.css';

const BLOOD_GROUPS = [
  { value: '', label: 'Select Blood Group' },
  { value: 'A+', label: 'A+' },
  { value: 'A-', label: 'A-' },
  { value: 'B+', label: 'B+' },
  { value: 'B-', label: 'B-' },
  { value: 'AB+', label: 'AB+' },
  { value: 'AB-', label: 'AB-' },
  { value: 'O+', label: 'O+' },
  { value: 'O-', label: 'O-' },
];

const GENDER_OPTIONS = [
  { value: 'SD', label: 'Senior Division (SD) — Male' },
  { value: 'SW', label: 'Senior Wing (SW) — Female' },
];

export default function OnboardingPage() {
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();

  const [phone, setPhone] = useState(user?.phone || '');
  const [email, setEmail] = useState(user?.email || '');
  const [gender, setGender] = useState(user?.gender || 'SD');
  const [bloodGroup, setBloodGroup] = useState(user?.bloodGroup || '');
  const [department, setDepartment] = useState(user?.department || '');
  const [admissionNo, setAdmissionNo] = useState(user?.admissionNo || '');

  const [emergencyName, setEmergencyName] = useState(user?.emergencyContact?.name || '');
  const [emergencyRelation, setEmergencyRelation] = useState(user?.emergencyContact?.relation || '');
  const [emergencyPhone, setEmergencyPhone] = useState(user?.emergencyContact?.phone || '');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!phone.trim() || !department.trim() || !admissionNo.trim() || !bloodGroup) {
      setError('Please fill in all required fields (Phone, Department, University Roll No, Blood Group).');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        phone: phone.trim(),
        email: email.trim(),
        gender,
        bloodGroup,
        department: department.trim(),
        admissionNo: admissionNo.trim(),
        emergencyContact: {
          name: emergencyName.trim(),
          relation: emergencyRelation.trim(),
          phone: emergencyPhone.trim(),
        },
      };

      const response = await api.put('/users/me/profile', payload);

      if (response.data.success) {
        updateUser(response.data.data);
        navigate('/dashboard', { replace: true });
      } else {
        setError(response.data.message || 'Failed to update profile.');
      }
    } catch (err) {
      setError(
        err.response?.data?.message || err.message || 'An error occurred while saving your onboarding details.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="onboarding-page">
      <div className="onboarding-card">
        <div className="onboarding-header">
          <h1>Cadet Profile Onboarding</h1>
          <p>
            Welcome to the <strong>3 Assam Bn NCC</strong> digital roster. Please complete your cadet training profile to proceed to your personal dashboard.
          </p>
        </div>

        {/* Read-only verification box */}
        <div className="onboarding-meta-box">
          <div className="meta-field">
            <span>Cadet Name</span>
            <span>{user?.name || 'Cadet'}</span>
          </div>
          <div className="meta-field">
            <span>Regimental No.</span>
            <span>{user?.regimentalNo || 'Pending'}</span>
          </div>
          <div className="meta-field">
            <span>Unit</span>
            <span>{user?.unit || '3AB'}</span>
          </div>
          <div className="meta-field">
            <span>Course Year</span>
            <span>{user?.year ? `${user.year} Year` : '1st Year'}</span>
          </div>
        </div>

        {error && <div className="login-alert">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="onboarding-section-title">Academic & Contact Information</div>

          <div className="form-grid-2">
            <FormInput
              label="Contact Mobile Number"
              name="phone"
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g. 9876543210"
              required
              disabled={loading}
            />

            <FormInput
              label="Email Address"
              name="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. cadet@aus.ac.in"
              disabled={loading}
            />
          </div>

          <div className="form-grid-2">
            <FormInput
              label="Academic Department (Assam University)"
              name="department"
              type="text"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              placeholder="e.g. Computer Science / Commerce / Physics"
              required
              disabled={loading}
            />

            <FormInput
              label="University Roll / Admission No."
              name="admissionNo"
              type="text"
              value={admissionNo}
              onChange={(e) => setAdmissionNo(e.target.value)}
              placeholder="e.g. 2024-AUS-CS-042"
              required
              disabled={loading}
            />
          </div>

          <div className="onboarding-section-title">Physical & Medical Record</div>

          <div className="form-grid-2">
            <FormInput
              label="NCC Wing / Division"
              name="gender"
              type="select"
              value={gender}
              onChange={(e) => setGender(e.target.value)}
              options={GENDER_OPTIONS}
              required
              disabled={loading}
            />

            <FormInput
              label="Blood Group"
              name="bloodGroup"
              type="select"
              value={bloodGroup}
              onChange={(e) => setBloodGroup(e.target.value)}
              options={BLOOD_GROUPS}
              required
              disabled={loading}
            />
          </div>

          <div className="onboarding-section-title">Emergency Contact (Parent / Guardian)</div>

          <div className="emergency-contact-box">
            <div className="form-grid-2">
              <FormInput
                label="Contact Name"
                name="emergencyName"
                type="text"
                value={emergencyName}
                onChange={(e) => setEmergencyName(e.target.value)}
                placeholder="Parent or Guardian's Name"
                disabled={loading}
              />

              <FormInput
                label="Relationship"
                name="emergencyRelation"
                type="text"
                value={emergencyRelation}
                onChange={(e) => setEmergencyRelation(e.target.value)}
                placeholder="e.g. Father / Mother"
                disabled={loading}
              />
            </div>

            <FormInput
              label="Emergency Phone Number"
              name="emergencyPhone"
              type="text"
              value={emergencyPhone}
              onChange={(e) => setEmergencyPhone(e.target.value)}
              placeholder="Emergency Contact Phone"
              disabled={loading}
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary onboarding-submit-btn"
            disabled={loading}
          >
            {loading ? 'Saving Profile Details…' : 'Complete Registration & Enter Dashboard'}
          </button>
        </form>
      </div>
    </div>
  );
}

