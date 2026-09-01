import React, { useState } from 'react';
import { getGraphApiBaseUrl, loadSettings, saveSettings } from '../session';

function Field({ label, id, value, onChange, placeholder, type = 'text', hint }) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-xs font-medium text-gray-600">{label}</label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-wa-teal"
      />
      {hint && <p className="text-xs text-gray-400">{hint}</p>}
    </div>
  );
}

export default function SettingsPanel({ sessionId, onSave }) {
  const [settings, setSettings] = useState(loadSettings);
  const [saved, setSaved] = useState(false);
  const [verifyResult, setVerifyResult] = useState(null);
  const [verifying, setVerifying] = useState(false);

  const handleChange = (key) => (e) => {
    const value = e.target.value;
    setSettings((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  };

  const handleSave = () => {
    saveSettings(settings);
    onSave(settings);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleVerify = async () => {
    setVerifying(true);
    setVerifyResult(null);
    try {
      const res = await fetch('/api/verify-webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          webhookUrl: settings.webhookUrl,
          verifyToken: settings.verifyToken,
        }),
      });
      const data = await res.json();
      setVerifyResult(data);
    } catch (err) {
      setVerifyResult({ success: false, error: err.message });
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="bg-wa-dark text-white px-4 py-4">
        <h2 className="font-semibold text-base">Configuration</h2>
        <p className="text-xs text-green-200 mt-0.5 opacity-80">Webhook & identity settings</p>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-4">
        {/* WhatsApp provider account fields */}
        <section>
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">WhatsApp Provider Account</h3>
          <div className="flex flex-col gap-3">
            <Field
              label="App ID"
              id="appId"
              value={settings.appId}
              onChange={handleChange('appId')}
              placeholder="102290129340398"
            />
            <Field
              label="App Secret"
              id="appSecret"
              value={settings.appSecret}
              onChange={handleChange('appSecret')}
              placeholder="my_verify_token"
            />
            <Field
              label="Phone Number ID"
              id="phoneNumberId"
              value={settings.phoneNumberId}
              onChange={handleChange('phoneNumberId')}
              placeholder="106540352242922"
            />
            <Field
              label="WhatsApp Business Account ID"
              id="wabaId"
              value={settings.wabaId}
              onChange={handleChange('wabaId')}
              placeholder="102290129340398"
            />
            <Field
              label="Access Token"
              id="accessToken"
              value={settings.accessToken}
              onChange={handleChange('accessToken')}
              placeholder="my_verify_token"
            />
          </div>
        </section>

        {/* Target portal webhook URL + verify token */}
        <section>
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Target Portal Webhook</h3>
          <div className="flex flex-col gap-3">
            <Field
              label="Webhook URL"
              id="webhookUrl"
              value={settings.webhookUrl}
              onChange={handleChange('webhookUrl')}
              placeholder="http://localhost:8069/whatsapp/webhook"
              hint="Where this window forwards simulated inbound messages"
            />
            <Field
              label="Verify Token"
              id="verifyToken"
              value={settings.verifyToken}
              onChange={handleChange('verifyToken')}
              placeholder="my_verify_token"
              hint="Used for the hub.challenge handshake"
            />
          </div>
        </section>

        {/* Simulated user section */}
        <section>
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Simulated User</h3>
          <div className="flex flex-col gap-3">
            <Field
              label="From Phone Number"
              id="from"
              value={settings.from}
              onChange={handleChange('from')}
              placeholder="16505551234"
              hint="Phone number of the simulated WhatsApp user"
            />
            <Field
              label="Contact Name"
              id="contactName"
              value={settings.contactName}
              onChange={handleChange('contactName')}
              placeholder="Test User"
              hint="Display name shown to Odoo"
            />
          </div>
        </section>

        {/* Session-scoped mock Meta API notice */}
        <section className="bg-amber-50 border border-amber-200 rounded-lg p-3">
          <h3 className="text-xs font-bold text-amber-700 mb-1">⚙️ Portal API URL Setup</h3>
          <p className="text-xs text-amber-700 leading-relaxed">
            Configure this portal's Graph API base URL as:
          </p>
          <code className="block mt-1 text-xs bg-amber-100 text-amber-900 px-2 py-1 rounded font-mono break-all">
            {getGraphApiBaseUrl(sessionId)}
          </code>
          <p className="text-xs text-amber-600 mt-1">
            This URL is unique to this window, so replies do not appear in other sessions.
          </p>
        </section>

        {/* Webhook verification */}
        <section>
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Webhook Verification</h3>
          <button
            onClick={handleVerify}
            disabled={verifying}
            className="w-full bg-gray-100 text-gray-700 rounded-lg py-2 text-sm hover:bg-gray-200 transition-colors disabled:opacity-50"
          >
            {verifying ? 'Verifying…' : '🔗 Test hub.challenge Handshake'}
          </button>
          {verifyResult && (
            <div className={`mt-2 p-3 rounded-lg text-xs ${verifyResult.success ? 'bg-green-50 border border-green-200 text-green-700' : 'bg-red-50 border border-red-200 text-red-700'}`}>
              {verifyResult.success ? (
                <p>✅ Webhook verified! Odoo echoed the challenge correctly.</p>
              ) : (
                <p>❌ Verification failed: {verifyResult.error || 'Challenge mismatch'}</p>
              )}
              {verifyResult.sentChallenge && (
                <p className="mt-1 font-mono">Sent: {verifyResult.sentChallenge}</p>
              )}
              {verifyResult.receivedResponse !== undefined && (
                <p className="font-mono">Got: {verifyResult.receivedResponse}</p>
              )}
            </div>
          )}
        </section>
      </div>

      {/* Save button */}
      <div className="px-4 py-3 border-t border-wa-border">
        <button
          onClick={handleSave}
          className={`w-full rounded-lg py-2.5 text-sm font-semibold transition-colors ${
            saved
              ? 'bg-green-500 text-white'
              : 'bg-wa-teal text-white hover:bg-wa-dark'
          }`}
        >
          {saved ? '✓ Saved!' : 'Save Settings'}
        </button>
      </div>
    </div>
  );
}
