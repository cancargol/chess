'use client';

import { useState, useRef, useEffect } from 'react';
import { verifyPin } from '@/lib/api';

export default function LoginForm({ onSuccess }) {
  const [pin, setPin] = useState(['', '', '', '']);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const inputRefs = useRef([]);

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  function handleChange(index, value) {
    if (!/^\d*$/.test(value)) return;

    const newPin = [...pin];
    newPin[index] = value.slice(-1);
    setPin(newPin);
    setError('');

    if (value && index < 3) {
      inputRefs.current[index + 1]?.focus();
    }

    if (index === 3 && value) {
      const fullPin = [...newPin.slice(0, 3), value.slice(-1)].join('');
      if (fullPin.length === 4) {
        handleSubmit(fullPin);
      }
    }
  }

  function handleKeyDown(index, e) {
    if (e.key === 'Backspace' && !pin[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  }

  function handlePaste(e) {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 4);
    if (pasted.length === 4) {
      const newPin = pasted.split('');
      setPin(newPin);
      inputRefs.current[3]?.focus();
      handleSubmit(pasted);
    }
  }

  async function handleSubmit(pinValue) {
    const fullPin = pinValue || pin.join('');
    if (fullPin.length !== 4) return;

    setLoading(true);
    setError('');

    try {
      const data = await verifyPin(fullPin);

      if (data.success) {
        onSuccess?.();
      } else {
        setError('PIN incorrecto. Pide tu PIN a Alexa diciendo tu nombre.');
        setPin(['', '', '', '']);
        inputRefs.current[0]?.focus();
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('Error de conexión o de CORS. Verifica que la API esté activa.');
      setPin(['', '', '', '']);
      inputRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-container">
      <div className="login-card animate-slide-up">
        <div className="login-icon">♚</div>
        <h1 className="login-title">CanCargolChess</h1>
        <p className="login-subtitle">
          Introduce tu PIN de 4 dígitos para acceder al dashboard.
        </p>

        <div className="pin-input-group" onPaste={handlePaste}>
          {pin.map((digit, index) => (
            <input
              key={index}
              ref={(el) => (inputRefs.current[index] = el)}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleChange(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              className="pin-digit"
              disabled={loading}
              aria-label={`Dígito ${index + 1} del PIN`}
            />
          ))}
        </div>

        <button
          className="login-btn"
          onClick={() => handleSubmit()}
          disabled={loading || pin.join('').length !== 4}
        >
          {loading ? 'Verificando...' : 'Entrar'}
        </button>

        {error && <p className="login-error">{error}</p>}

        <p className="login-hint">
          💡 Tu PIN se genera al crear tu perfil en Alexa. Di
          &quot;Alexa, abre CanCargolChess&quot; y después tu nombre para obtenerlo.
        </p>
      </div>
    </div>
  );
}
