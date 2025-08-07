'use client';

import React, { useState } from 'react';
import { useAuth } from '@/src/hooks/useAuth';

interface FormData {
  name: string;
  surname: string;
  company_name: string;
  company_slug: string;
}

interface RegistrationResponse {
  success: boolean;
  message: string;
  data?: {
    user_id: string;
    company_id: string;
    tables_created: string[];
  };
  error?: string;
}

const DemoRegister = () => {
  const [formData, setFormData] = useState<FormData>({
    name: '',
    surname: '',
    company_name: '',
    company_slug: ''
  });

  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<RegistrationResponse | null>(null);
  const [slugPreview, setSlugPreview] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { user } = useAuth();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    // Pulisce errori quando l'utente digita
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
    
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Aggiorna preview slug in tempo reale
    if (name === 'company_name') {
      const preview = value
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .replace(/\s+/g, '_')
        .substring(0, 20);
      setSlugPreview(preview);
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.name.trim()) newErrors.name = 'Nome è richiesto';
    if (!formData.surname.trim()) newErrors.surname = 'Cognome è richiesto';
    if (!formData.company_name.trim()) newErrors.company_name = 'Nome azienda è richiesto';
    
    if (formData.name.length < 2) newErrors.name = 'Nome deve avere almeno 2 caratteri';
    if (formData.surname.length < 2) newErrors.surname = 'Cognome deve avere almeno 2 caratteri';
    if (formData.company_name.length < 3) newErrors.company_name = 'Nome azienda deve avere almeno 3 caratteri';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setLoading(true);
    setResponse(null);

    try {
      // Genera automaticamente lo slug dall'azienda
      const generatedSlug = formData.company_name
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .replace(/\s+/g, '_')
        .substring(0, 20);

      const submitData = {
        ...formData,
        company_slug: generatedSlug
      };

      // Chiamata API (demo senza autenticazione)
      const res = await fetch('/api/demo/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(submitData)
      });

      const data = await res.json();
      setResponse(data);

      // Non più alert - feedback integrato nella UI

    } catch (err) {
      console.error('Errore durante la registrazione:', err);
      setResponse({
        success: false,
        message: 'Errore di rete durante la registrazione',
        error: err instanceof Error ? err.message : 'Errore sconosciuto'
      });
    } finally {
      setLoading(false);
    }
  };



  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md mx-auto">
        <div className="bg-white shadow-lg rounded-lg px-8 py-10">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900">
              Registrazione Demo Azienda
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              Simula la registrazione di una nuova azienda sul sistema
            </p>
          </div>

          <div className="mb-4 p-3 bg-blue-100 border border-blue-400 text-blue-700 rounded">
            🎯 <strong>Demo Registrazione</strong> - Simulazione senza pagamento
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                Nome *
              </label>
              <input
                type="text"
                name="name"
                id="name"
                required
                value={formData.name}
                onChange={handleChange}
                className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                  errors.name ? 'border-red-300 bg-red-50' : 'border-gray-300'
                }`}
                placeholder="Mario"
              />
              {errors.name && (
                <p className="mt-1 text-xs text-red-600">{errors.name}</p>
              )}
            </div>

            <div>
              <label htmlFor="surname" className="block text-sm font-medium text-gray-700">
                Cognome *
              </label>
              <input
                type="text"
                name="surname"
                id="surname"
                required
                value={formData.surname}
                onChange={handleChange}
                className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                  errors.surname ? 'border-red-300 bg-red-50' : 'border-gray-300'
                }`}
                placeholder="Rossi"
              />
              {errors.surname && (
                <p className="mt-1 text-xs text-red-600">{errors.surname}</p>
              )}
            </div>

            <div>
              <label htmlFor="company_name" className="block text-sm font-medium text-gray-700">
                Nome Azienda *
              </label>
              <input
                type="text"
                name="company_name"
                id="company_name"
                required
                value={formData.company_name}
                onChange={handleChange}
                className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                  errors.company_name ? 'border-red-300 bg-red-50' : 'border-gray-300'
                }`}
                placeholder="Azienda di Mario"
              />
              {errors.company_name && (
                <p className="mt-1 text-xs text-red-600">{errors.company_name}</p>
              )}
            </div>

            {/* Preview slug generato automaticamente */}
            {slugPreview && (
              <div className="bg-gray-50 border border-gray-200 rounded-md p-3">
                <p className="text-sm text-gray-600">
                  <strong>Slug azienda:</strong> <code className="bg-gray-200 px-1 rounded">{slugPreview}</code>
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Questo identificativo univoco verrà utilizzato per le tabelle aziendali
                </p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
                loading 
                  ? 'bg-gray-400 cursor-not-allowed' 
                  : 'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
              }`}
            >
              {loading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Registrazione in corso...
                </>
              ) : (
                '🚀 Registra Azienda'
              )}
            </button>
          </form>

          {response && (
            <div className="mt-8">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Risultato Registrazione
              </h3>
              <div className={`p-4 rounded-md ${response.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                <div className={`text-sm ${response.success ? 'text-green-800' : 'text-red-800'}`}>
                  <p className="font-medium">
                    {response.success ? '✅ Successo!' : '❌ Errore!'}
                  </p>
                  <p className="mt-1">{response.message}</p>
                  
                  {response.data && (
                    <div className="mt-3 space-y-1">
                      <p><strong>User ID:</strong> {response.data.user_id}</p>
                      <p><strong>Company ID:</strong> {response.data.company_id}</p>
                      <p><strong>Tabelle create:</strong></p>
                      <ul className="list-disc list-inside ml-4">
                        {response.data.tables_created.map((table, index) => (
                          <li key={index}>{table}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  {response.error && (
                    <pre className="mt-2 text-xs bg-gray-100 p-2 rounded">
                      {response.error}
                    </pre>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DemoRegister;