'use client';

import React, { useState, useEffect } from 'react';

interface Company {
  id: string;
  name: string;
  slug: string;
  email: string;
  created_at: string;
  users_count: number;
}

interface TableStatus {
  tableName: string;
  exists: boolean;
  recordsCount: number;
  error?: string;
}

interface Document {
  id: number;
  name: string;
  description: string;
  category: string;
  status: string;
  created_at: string;
}

interface Rapportino {
  id: number;
  title: string;
  description: string;
  date: string;
  hours_worked: number;
  status: string;
  created_at: string;
}

interface Commessa {
  id: number;
  code: string;
  name: string;
  client_name: string;
  estimated_hours: number;
  status: string;
  priority: string;
  start_date: string;
  created_at: string;
}

export default function TestMultiTenantPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<string>('');
  const [tableStatus, setTableStatus] = useState<TableStatus[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [rapportini, setRapportini] = useState<Rapportino[]>([]);
  const [commesse, setCommesse] = useState<Commessa[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  // Form states
  const [newDocument, setNewDocument] = useState({ name: '', description: '', category: '' });
  const [newRapportino, setNewRapportino] = useState({ title: '', description: '', hours_worked: 8 });
  const [newCommessa, setNewCommessa] = useState({ name: '', code: '', client_name: '', estimated_hours: 40 });

  const API_BASE = process.env.NODE_ENV === 'development' ? 'http://localhost:5001' : '';

  // Carica lista aziende
  useEffect(() => {
    loadCompanies();
  }, []);

  // Carica dati quando cambia azienda selezionata
  useEffect(() => {
    if (selectedCompany) {
      loadTenantData();
    }
  }, [selectedCompany]);

  const loadCompanies = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE}/api/tenants/test/companies`);
      const data = await response.json();
      
      if (data.success) {
        setCompanies(data.companies);
        if (data.companies.length > 0 && !selectedCompany) {
          setSelectedCompany(data.companies[0].id);
        }
      } else {
        setMessage('Errore nel caricamento aziende: ' + data.error);
      }
    } catch (error) {
      setMessage('Errore di rete: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const loadTenantData = async () => {
    if (!selectedCompany) return;
    
    try {
      setLoading(true);
      
      // Carica status tabelle
      const statusResponse = await fetch(`${API_BASE}/api/tenants/test/${selectedCompany}/tables`);
      const statusData = await statusResponse.json();
      if (statusData.success) {
        setTableStatus(statusData.tables);
      }

      // Carica documenti
      const docsResponse = await fetch(`${API_BASE}/api/tenants/test/${selectedCompany}/documents`);
      const docsData = await docsResponse.json();
      if (docsData.success) {
        setDocuments(docsData.documents);
      }

      // Carica rapportini
      const rapportiniResponse = await fetch(`${API_BASE}/api/tenants/test/${selectedCompany}/rapportini`);
      const rapportiniData = await rapportiniResponse.json();
      if (rapportiniData.success) {
        setRapportini(rapportiniData.rapportini);
      }

      // Carica commesse
      const commesseResponse = await fetch(`${API_BASE}/api/tenants/test/${selectedCompany}/commesse`);
      const commesseData = await commesseResponse.json();
      if (commesseData.success) {
        setCommesse(commesseData.commesse);
      }

    } catch (error) {
      setMessage('Errore nel caricamento dati: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const createDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCompany || !newDocument.name) return;

    try {
      const response = await fetch(`${API_BASE}/api/tenants/test/${selectedCompany}/documents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newDocument)
      });
      
      const data = await response.json();
      if (data.success) {
        setMessage('✅ Documento creato con successo!');
        setNewDocument({ name: '', description: '', category: '' });
        loadTenantData(); // Ricarica i dati
      } else {
        setMessage('❌ Errore: ' + data.error);
      }
    } catch (error) {
      setMessage('❌ Errore di rete: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  const createRapportino = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCompany || !newRapportino.title) return;

    try {
      const response = await fetch(`${API_BASE}/api/tenants/test/${selectedCompany}/rapportini`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newRapportino)
      });
      
      const data = await response.json();
      if (data.success) {
        setMessage('✅ Rapportino creato con successo!');
        setNewRapportino({ title: '', description: '', hours_worked: 8 });
        loadTenantData();
      } else {
        setMessage('❌ Errore: ' + data.error);
      }
    } catch (error) {
      setMessage('❌ Errore di rete: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  const createCommessa = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCompany || !newCommessa.name || !newCommessa.code) return;

    try {
      const response = await fetch(`${API_BASE}/api/tenants/test/${selectedCompany}/commesse`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newCommessa)
      });
      
      const data = await response.json();
      if (data.success) {
        setMessage('✅ Commessa creata con successo!');
        setNewCommessa({ name: '', code: '', client_name: '', estimated_hours: 40 });
        loadTenantData();
      } else {
        setMessage('❌ Errore: ' + data.error);
      }
    } catch (error) {
      setMessage('❌ Errore di rete: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  const deleteRecord = async (table: string, id: number) => {
    if (!selectedCompany || !confirm('Sei sicuro di voler eliminare questo record?')) return;

    try {
      const response = await fetch(`${API_BASE}/api/tenants/test/${selectedCompany}/${table}/${id}`, {
        method: 'DELETE'
      });
      
      const data = await response.json();
      if (data.success) {
        setMessage('✅ Record eliminato con successo!');
        loadTenantData();
      } else {
        setMessage('❌ Errore: ' + data.error);
      }
    } catch (error) {
      setMessage('❌ Errore di rete: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  const selectedCompanyName = companies.find(c => c.id === selectedCompany)?.name || 'N/A';

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            🏢 Test Sistema Multi-Tenant
          </h1>
          <p className="text-gray-600">
            Testa le funzionalità del sistema multi-tenant con dati reali
          </p>
        </div>

        {/* Messaggio */}
        {message && (
          <div className={`mb-6 p-4 rounded-lg ${message.includes('✅') ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
            {message}
          </div>
        )}

        {/* Selezione Azienda */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Seleziona Azienda</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Azienda:
              </label>
              <select 
                value={selectedCompany} 
                onChange={(e) => setSelectedCompany(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Seleziona un'azienda...</option>
                {companies.map(company => (
                  <option key={company.id} value={company.id}>
                    {company.name} ({company.users_count} utenti)
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Company ID:
              </label>
              <input 
                type="text" 
                value={selectedCompany} 
                readOnly 
                className="w-full border border-gray-300 rounded-md px-3 py-2 bg-gray-50 text-gray-600"
              />
            </div>
          </div>
        </div>

        {selectedCompany && (
          <>
            {/* Status Tabelle */}
            <div className="bg-white rounded-lg shadow p-6 mb-8">
              <h2 className="text-xl font-semibold mb-4">
                Status Tabelle per: {selectedCompanyName}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {tableStatus.map(table => (
                  <div key={table.tableName} className={`p-4 rounded-lg border-2 ${table.exists ? 'border-green-500 bg-green-50' : 'border-red-500 bg-red-50'}`}>
                    <h3 className="font-medium mb-2">{table.tableName}</h3>
                    <p className={`text-sm ${table.exists ? 'text-green-600' : 'text-red-600'}`}>
                      {table.exists ? '✅ Esistente' : '❌ Non trovata'}
                    </p>
                    {table.exists && (
                      <p className="text-sm text-gray-600">
                        Records: {table.recordsCount}
                      </p>
                    )}
                    {table.error && (
                      <p className="text-xs text-red-500 mt-1">{table.error}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Sezione Documenti */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
              
              {/* Form Creazione Documento */}
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold mb-4">📄 Crea Documento</h3>
                <form onSubmit={createDocument}>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Nome:</label>
                      <input
                        type="text"
                        value={newDocument.name}
                        onChange={(e) => setNewDocument({...newDocument, name: e.target.value})}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Descrizione:</label>
                      <textarea
                        value={newDocument.description}
                        onChange={(e) => setNewDocument({...newDocument, description: e.target.value})}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        rows={3}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Categoria:</label>
                      <input
                        type="text"
                        value={newDocument.category}
                        onChange={(e) => setNewDocument({...newDocument, category: e.target.value})}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <button
                      type="submit"
                      className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      Crea Documento
                    </button>
                  </div>
                </form>
              </div>

              {/* Lista Documenti */}
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold mb-4">📄 Documenti ({documents.length})</h3>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {documents.map(doc => (
                    <div key={doc.id} className="border border-gray-200 rounded p-3">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h4 className="font-medium">{doc.name}</h4>
                          <p className="text-sm text-gray-600">{doc.description}</p>
                          <div className="flex gap-4 text-xs text-gray-500 mt-1">
                            <span>Cat: {doc.category}</span>
                            <span>Status: {doc.status}</span>
                            <span>{new Date(doc.created_at).toLocaleDateString()}</span>
                          </div>
                        </div>
                        <button
                          onClick={() => deleteRecord('documents', doc.id)}
                          className="text-red-600 hover:text-red-800 text-sm"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  ))}
                  {documents.length === 0 && (
                    <p className="text-gray-500 text-center py-4">Nessun documento trovato</p>
                  )}
                </div>
              </div>
            </div>

            {/* Sezione Rapportini */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
              
              {/* Form Creazione Rapportino */}
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold mb-4">📋 Crea Rapportino</h3>
                <form onSubmit={createRapportino}>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Titolo:</label>
                      <input
                        type="text"
                        value={newRapportino.title}
                        onChange={(e) => setNewRapportino({...newRapportino, title: e.target.value})}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Descrizione:</label>
                      <textarea
                        value={newRapportino.description}
                        onChange={(e) => setNewRapportino({...newRapportino, description: e.target.value})}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        rows={3}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Ore Lavorate:</label>
                      <input
                        type="number"
                        step="0.5"
                        value={newRapportino.hours_worked}
                        onChange={(e) => setNewRapportino({...newRapportino, hours_worked: parseFloat(e.target.value)})}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <button
                      type="submit"
                      className="w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
                    >
                      Crea Rapportino
                    </button>
                  </div>
                </form>
              </div>

              {/* Lista Rapportini */}
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold mb-4">📋 Rapportini ({rapportini.length})</h3>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {rapportini.map(rap => (
                    <div key={rap.id} className="border border-gray-200 rounded p-3">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h4 className="font-medium">{rap.title}</h4>
                          <p className="text-sm text-gray-600">{rap.description}</p>
                          <div className="flex gap-4 text-xs text-gray-500 mt-1">
                            <span>Ore: {rap.hours_worked}</span>
                            <span>Status: {rap.status}</span>
                            <span>{new Date(rap.date).toLocaleDateString()}</span>
                          </div>
                        </div>
                        <button
                          onClick={() => deleteRecord('rapportini', rap.id)}
                          className="text-red-600 hover:text-red-800 text-sm"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  ))}
                  {rapportini.length === 0 && (
                    <p className="text-gray-500 text-center py-4">Nessun rapportino trovato</p>
                  )}
                </div>
              </div>
            </div>

            {/* Sezione Commesse */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              
              {/* Form Creazione Commessa */}
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold mb-4">🏗️ Crea Commessa</h3>
                <form onSubmit={createCommessa}>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Nome:</label>
                      <input
                        type="text"
                        value={newCommessa.name}
                        onChange={(e) => setNewCommessa({...newCommessa, name: e.target.value})}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Codice:</label>
                      <input
                        type="text"
                        value={newCommessa.code}
                        onChange={(e) => setNewCommessa({...newCommessa, code: e.target.value})}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Cliente:</label>
                      <input
                        type="text"
                        value={newCommessa.client_name}
                        onChange={(e) => setNewCommessa({...newCommessa, client_name: e.target.value})}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Ore Stimate:</label>
                      <input
                        type="number"
                        value={newCommessa.estimated_hours}
                        onChange={(e) => setNewCommessa({...newCommessa, estimated_hours: parseFloat(e.target.value)})}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <button
                      type="submit"
                      className="w-full bg-purple-600 text-white py-2 px-4 rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    >
                      Crea Commessa
                    </button>
                  </div>
                </form>
              </div>

              {/* Lista Commesse */}
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold mb-4">🏗️ Commesse ({commesse.length})</h3>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {commesse.map(com => (
                    <div key={com.id} className="border border-gray-200 rounded p-3">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h4 className="font-medium">{com.name} ({com.code})</h4>
                          <p className="text-sm text-gray-600">Cliente: {com.client_name}</p>
                          <div className="flex gap-4 text-xs text-gray-500 mt-1">
                            <span>Ore: {com.estimated_hours}</span>
                            <span>Status: {com.status}</span>
                            <span>Priorità: {com.priority}</span>
                          </div>
                        </div>
                        <button
                          onClick={() => deleteRecord('commesse', com.id)}
                          className="text-red-600 hover:text-red-800 text-sm"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  ))}
                  {commesse.length === 0 && (
                    <p className="text-gray-500 text-center py-4">Nessuna commessa trovata</p>
                  )}
                </div>
              </div>
            </div>
          </>
        )}

        {/* Loading Overlay */}
        {loading && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-gray-600">Caricamento...</p>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-12 text-center text-gray-500 text-sm">
          <p>🧪 Pagina di test del sistema multi-tenant - Solo per sviluppo</p>
          <p className="mt-1">Gli endpoint utilizzati non richiedono autenticazione e vanno rimossi in produzione</p>
        </div>
      </div>
    </div>
  );
}