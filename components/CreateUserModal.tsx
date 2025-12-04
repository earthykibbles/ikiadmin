'use client';

import { useState } from 'react';
import { X, Upload, UserPlus, Download, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';

interface CreateUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

interface BulkUploadResult {
  created: number;
  failed: number;
  results: {
    successful: Array<{ email: string; userId: string; password: string }>;
    errors: Array<{ email: string; error: string }>;
  };
}

export default function CreateUserModal({ isOpen, onClose, onSuccess }: CreateUserModalProps) {
  const [mode, setMode] = useState<'single' | 'bulk'>('single');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Single user form state
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    firstname: '',
    lastname: '',
    username: '',
    phone: '',
    country: '',
    gender: '',
    birthday: '',
    age: '',
    activityLevel: '',
    bodyWeightKg: '',
  });

  // Bulk upload state
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [bulkResult, setBulkResult] = useState<BulkUploadResult | null>(null);
  const [showBulkResults, setShowBulkResults] = useState(false);

  if (!isOpen) return null;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSingleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch('/api/users/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          age: formData.age ? parseInt(formData.age) : undefined,
          bodyWeightKg: formData.bodyWeightKg ? parseFloat(formData.bodyWeightKg) : undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create user');
      }

      setSuccess(`User created successfully! Email: ${data.email}, User ID: ${data.userId}`);
      
      // Reset form
      setFormData({
        email: '',
        password: '',
        firstname: '',
        lastname: '',
        username: '',
        phone: '',
        country: '',
        gender: '',
        birthday: '',
        age: '',
        activityLevel: '',
        bodyWeightKg: '',
      });

      if (onSuccess) {
        setTimeout(() => {
          onSuccess();
          onClose();
        }, 1500);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create user');
    } finally {
      setLoading(false);
    }
  };

  const handleBulkUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!csvFile) {
      setError('Please select a CSV file');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);
    setBulkResult(null);
    setShowBulkResults(false);

    try {
      const formData = new FormData();
      formData.append('file', csvFile);

      const response = await fetch('/api/users/bulk-upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to process bulk upload');
      }

      setBulkResult(data);
      setShowBulkResults(true);
      setSuccess(`Successfully created ${data.created} users. ${data.failed} failed.`);
      
      // Reset file
      setCsvFile(null);
      
      if (onSuccess && data.created > 0) {
        setTimeout(() => {
          onSuccess();
        }, 2000);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to process bulk upload');
    } finally {
      setLoading(false);
    }
  };

  const downloadCSVTemplate = () => {
    const headers = [
      'email',
      'password',
      'firstname',
      'lastname',
      'username',
      'phone',
      'country',
      'gender',
      'birthday',
      'age',
      'activityLevel',
      'bodyWeightKg',
    ];
    
    const csvContent = headers.join(',') + '\n' +
      'user1@example.com,SecurePass123,John,Doe,johndoe,+1234567890,USA,Male,1990-01-01,34,moderate,75.5';
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'user_upload_template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const downloadBulkResults = () => {
    if (!bulkResult) return;

    const csvContent = [
      'Email,User ID,Password,Status',
      ...bulkResult.results.successful.map(r => `${r.email},${r.userId},${r.password},Success`),
      ...bulkResult.results.errors.map(r => `${r.email},,Error: ${r.error},Failed`),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bulk_upload_results_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="glass border border-light-green/20 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto m-4">
        <div className="sticky top-0 glass border-b border-light-green/10 p-6 flex items-center justify-between">
          <h2 className="heading-lg font-goldplay text-iki-white">
            Create Users
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-iki-grey/50 transition-colors"
          >
            <X className="w-5 h-5 text-iki-white/60" />
          </button>
        </div>

        <div className="p-6">
          {/* Mode Toggle */}
          <div className="flex gap-2 mb-6">
            <button
              onClick={() => {
                setMode('single');
                setError(null);
                setSuccess(null);
                setBulkResult(null);
                setShowBulkResults(false);
              }}
              className={`flex-1 px-4 py-2 rounded-lg transition-colors ${
                mode === 'single'
                  ? 'bg-light-green/20 border border-light-green/40 text-light-green'
                  : 'bg-iki-grey/30 border border-iki-grey/50 text-iki-white/60 hover:bg-iki-grey/50'
              }`}
            >
              <UserPlus className="w-4 h-4 inline mr-2" />
              Single User
            </button>
            <button
              onClick={() => {
                setMode('bulk');
                setError(null);
                setSuccess(null);
                setBulkResult(null);
                setShowBulkResults(false);
              }}
              className={`flex-1 px-4 py-2 rounded-lg transition-colors ${
                mode === 'bulk'
                  ? 'bg-light-green/20 border border-light-green/40 text-light-green'
                  : 'bg-iki-grey/30 border border-iki-grey/50 text-iki-white/60 hover:bg-iki-grey/50'
              }`}
            >
              <Upload className="w-4 h-4 inline mr-2" />
              Bulk Upload (CSV)
            </button>
          </div>

          {/* Error/Success Messages */}
          {error && (
            <div className="mb-4 p-4 rounded-lg bg-red-500/10 border border-red-500/20 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-red-400 body-sm">{error}</p>
            </div>
          )}

          {success && (
            <div className="mb-4 p-4 rounded-lg bg-light-green/10 border border-light-green/20 flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-light-green flex-shrink-0 mt-0.5" />
              <p className="text-light-green body-sm">{success}</p>
            </div>
          )}

          {/* Single User Form */}
          {mode === 'single' && (
            <form onSubmit={handleSingleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block body-sm text-iki-white/80 mb-2">Email *</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-2 rounded-lg bg-iki-grey/30 border border-iki-grey/50 text-iki-white placeholder-iki-white/40 focus:outline-none focus:border-light-green/40"
                  />
                </div>
                <div>
                  <label className="block body-sm text-iki-white/80 mb-2">Password *</label>
                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    required
                    minLength={8}
                    className="w-full px-4 py-2 rounded-lg bg-iki-grey/30 border border-iki-grey/50 text-iki-white placeholder-iki-white/40 focus:outline-none focus:border-light-green/40"
                  />
                </div>
                <div>
                  <label className="block body-sm text-iki-white/80 mb-2">First Name</label>
                  <input
                    type="text"
                    name="firstname"
                    value={formData.firstname}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 rounded-lg bg-iki-grey/30 border border-iki-grey/50 text-iki-white placeholder-iki-white/40 focus:outline-none focus:border-light-green/40"
                  />
                </div>
                <div>
                  <label className="block body-sm text-iki-white/80 mb-2">Last Name</label>
                  <input
                    type="text"
                    name="lastname"
                    value={formData.lastname}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 rounded-lg bg-iki-grey/30 border border-iki-grey/50 text-iki-white placeholder-iki-white/40 focus:outline-none focus:border-light-green/40"
                  />
                </div>
                <div>
                  <label className="block body-sm text-iki-white/80 mb-2">Username</label>
                  <input
                    type="text"
                    name="username"
                    value={formData.username}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 rounded-lg bg-iki-grey/30 border border-iki-grey/50 text-iki-white placeholder-iki-white/40 focus:outline-none focus:border-light-green/40"
                  />
                </div>
                <div>
                  <label className="block body-sm text-iki-white/80 mb-2">Phone</label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 rounded-lg bg-iki-grey/30 border border-iki-grey/50 text-iki-white placeholder-iki-white/40 focus:outline-none focus:border-light-green/40"
                  />
                </div>
                <div>
                  <label className="block body-sm text-iki-white/80 mb-2">Country</label>
                  <input
                    type="text"
                    name="country"
                    value={formData.country}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 rounded-lg bg-iki-grey/30 border border-iki-grey/50 text-iki-white placeholder-iki-white/40 focus:outline-none focus:border-light-green/40"
                  />
                </div>
                <div>
                  <label className="block body-sm text-iki-white/80 mb-2">Gender</label>
                  <select
                    name="gender"
                    value={formData.gender}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 rounded-lg bg-iki-grey/30 border border-iki-grey/50 text-iki-white focus:outline-none focus:border-light-green/40"
                  >
                    <option value="">Select...</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                    <option value="Prefer not to say">Prefer not to say</option>
                  </select>
                </div>
                <div>
                  <label className="block body-sm text-iki-white/80 mb-2">Birthday</label>
                  <input
                    type="date"
                    name="birthday"
                    value={formData.birthday}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 rounded-lg bg-iki-grey/30 border border-iki-grey/50 text-iki-white placeholder-iki-white/40 focus:outline-none focus:border-light-green/40"
                  />
                </div>
                <div>
                  <label className="block body-sm text-iki-white/80 mb-2">Age</label>
                  <input
                    type="number"
                    name="age"
                    value={formData.age}
                    onChange={handleInputChange}
                    min="0"
                    max="150"
                    className="w-full px-4 py-2 rounded-lg bg-iki-grey/30 border border-iki-grey/50 text-iki-white placeholder-iki-white/40 focus:outline-none focus:border-light-green/40"
                  />
                </div>
                <div>
                  <label className="block body-sm text-iki-white/80 mb-2">Activity Level</label>
                  <select
                    name="activityLevel"
                    value={formData.activityLevel}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 rounded-lg bg-iki-grey/30 border border-iki-grey/50 text-iki-white focus:outline-none focus:border-light-green/40"
                  >
                    <option value="">Select...</option>
                    <option value="sedentary">Sedentary</option>
                    <option value="light">Light</option>
                    <option value="moderate">Moderate</option>
                    <option value="active">Active</option>
                    <option value="very_active">Very Active</option>
                  </select>
                </div>
                <div>
                  <label className="block body-sm text-iki-white/80 mb-2">Body Weight (kg)</label>
                  <input
                    type="number"
                    name="bodyWeightKg"
                    value={formData.bodyWeightKg}
                    onChange={handleInputChange}
                    min="0"
                    step="0.1"
                    className="w-full px-4 py-2 rounded-lg bg-iki-grey/30 border border-iki-grey/50 text-iki-white placeholder-iki-white/40 focus:outline-none focus:border-light-green/40"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-6 py-3 rounded-lg bg-light-green/20 border border-light-green/40 text-light-green hover:bg-light-green/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4" />
                      Create User
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-6 py-3 rounded-lg bg-iki-grey/30 border border-iki-grey/50 text-iki-white/80 hover:bg-iki-grey/50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          {/* Bulk Upload Form */}
          {mode === 'bulk' && (
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-iki-grey/20 border border-iki-grey/30">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="body-md text-iki-white font-goldplay mb-2">CSV Format</h3>
                    <p className="body-sm text-iki-white/60 mb-3">
                      Your CSV file should have the following columns (email and password are required):
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {['email', 'password', 'firstname', 'lastname', 'username', 'phone', 'country', 'gender', 'birthday', 'age', 'activityLevel', 'bodyWeightKg'].map(col => (
                        <span key={col} className="px-2 py-1 rounded bg-iki-grey/40 text-iki-white/80 body-xs">
                          {col}
                        </span>
                      ))}
                    </div>
                  </div>
                  <button
                    onClick={downloadCSVTemplate}
                    className="px-3 py-2 rounded-lg bg-light-green/20 border border-light-green/40 text-light-green hover:bg-light-green/30 transition-colors flex items-center gap-2 body-sm"
                  >
                    <Download className="w-4 h-4" />
                    Template
                  </button>
                </div>
              </div>

              <form onSubmit={handleBulkUpload} className="space-y-4">
                <div>
                  <label className="block body-sm text-iki-white/80 mb-2">CSV File *</label>
                  <input
                    type="file"
                    accept=".csv"
                    onChange={(e) => setCsvFile(e.target.files?.[0] || null)}
                    required
                    className="w-full px-4 py-2 rounded-lg bg-iki-grey/30 border border-iki-grey/50 text-iki-white file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-light-green/20 file:text-light-green hover:file:bg-light-green/30"
                  />
                  {csvFile && (
                    <p className="mt-2 body-xs text-iki-white/60">
                      Selected: {csvFile.name} ({(csvFile.size / 1024).toFixed(2)} KB)
                    </p>
                  )}
                </div>

                {showBulkResults && bulkResult && (
                  <div className="p-4 rounded-lg bg-iki-grey/20 border border-iki-grey/30 space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="body-md text-iki-white font-goldplay">Upload Results</h3>
                      <button
                        onClick={downloadBulkResults}
                        className="px-3 py-1.5 rounded-lg bg-light-green/20 border border-light-green/40 text-light-green hover:bg-light-green/30 transition-colors flex items-center gap-2 body-xs"
                      >
                        <Download className="w-3 h-3" />
                        Download Results
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 rounded-lg bg-light-green/10 border border-light-green/20">
                        <p className="body-xs text-iki-white/60 mb-1">Created</p>
                        <p className="heading-md text-light-green">{bulkResult.created}</p>
                      </div>
                      <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                        <p className="body-xs text-iki-white/60 mb-1">Failed</p>
                        <p className="heading-md text-red-400">{bulkResult.failed}</p>
                      </div>
                    </div>
                    {bulkResult.results.errors.length > 0 && (
                      <div className="mt-3">
                        <p className="body-xs text-iki-white/60 mb-2">Errors:</p>
                        <div className="max-h-32 overflow-y-auto space-y-1">
                          {bulkResult.results.errors.slice(0, 5).map((err, idx) => (
                            <p key={idx} className="body-xs text-red-400">
                              {err.email}: {err.error}
                            </p>
                          ))}
                          {bulkResult.results.errors.length > 5 && (
                            <p className="body-xs text-iki-white/40">
                              ... and {bulkResult.results.errors.length - 5} more errors
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex gap-3 pt-4">
                  <button
                    type="submit"
                    disabled={loading || !csvFile}
                    className="flex-1 px-6 py-3 rounded-lg bg-light-green/20 border border-light-green/40 text-light-green hover:bg-light-green/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4" />
                        Upload & Create Users
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-6 py-3 rounded-lg bg-iki-grey/30 border border-iki-grey/50 text-iki-white/80 hover:bg-iki-grey/50 transition-colors"
                  >
                    Close
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

