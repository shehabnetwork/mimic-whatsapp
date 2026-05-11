import React, { useState } from 'react';

export default function LocationPicker({ onConfirm, onCancel }) {
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [detecting, setDetecting] = useState(false);
  const [error, setError] = useState('');

  const handleDetect = () => {
    if (!navigator.geolocation) {
      setError('Geolocation not supported by this browser.');
      return;
    }
    setDetecting(true);
    setError('');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude.toFixed(6));
        setLng(pos.coords.longitude.toFixed(6));
        setDetecting(false);
      },
      (err) => {
        setError('Could not detect location: ' + err.message);
        setDetecting(false);
      }
    );
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const parsedLat = parseFloat(lat);
    const parsedLng = parseFloat(lng);
    if (isNaN(parsedLat) || isNaN(parsedLng)) {
      setError('Please enter valid latitude and longitude values.');
      return;
    }
    if (parsedLat < -90 || parsedLat > 90) {
      setError('Latitude must be between -90 and 90.');
      return;
    }
    if (parsedLng < -180 || parsedLng > 180) {
      setError('Longitude must be between -180 and 180.');
      return;
    }
    onConfirm({ latitude: parsedLat, longitude: parsedLng, name, address });
  };

  return (
    <div className="bg-white border border-wa-border rounded-xl shadow-lg p-4 w-80">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-gray-700 flex items-center gap-1">
          <span>📍</span> Share Location
        </h3>
        <button
          onClick={onCancel}
          className="text-gray-400 hover:text-gray-600 text-lg leading-none"
          aria-label="Close"
        >
          ✕
        </button>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <div className="flex gap-2">
          <div className="flex-1">
            <label className="block text-xs text-gray-500 mb-1">Latitude *</label>
            <input
              type="number"
              step="any"
              value={lat}
              onChange={(e) => setLat(e.target.value)}
              placeholder="e.g. 30.0444"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-wa-teal"
              required
            />
          </div>
          <div className="flex-1">
            <label className="block text-xs text-gray-500 mb-1">Longitude *</label>
            <input
              type="number"
              step="any"
              value={lng}
              onChange={(e) => setLng(e.target.value)}
              placeholder="e.g. 31.2357"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-wa-teal"
              required
            />
          </div>
        </div>

        <button
          type="button"
          onClick={handleDetect}
          disabled={detecting}
          className="text-xs text-wa-teal hover:underline text-left disabled:opacity-50"
        >
          {detecting ? 'Detecting…' : '📡 Use my current location'}
        </button>

        <div>
          <label className="block text-xs text-gray-500 mb-1">Name (optional)</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Cairo Tower"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-wa-teal"
          />
        </div>

        <div>
          <label className="block text-xs text-gray-500 mb-1">Address (optional)</label>
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="e.g. El-Gezira Island, Cairo"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-wa-teal"
          />
        </div>

        {error && <p className="text-xs text-red-500">{error}</p>}

        <button
          type="submit"
          className="bg-wa-teal text-white rounded-lg py-2 text-sm font-medium hover:bg-wa-dark transition-colors"
        >
          Send Location
        </button>
      </form>
    </div>
  );
}
