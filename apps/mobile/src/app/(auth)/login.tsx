import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { supabase } from '../../lib/supabase';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [mode, setMode] = useState<'email' | 'phone'>('phone');
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleEmailLogin = async () => {
    setLoading(true);
    setError('');
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (authError) {
      setError(authError.message);
    } else {
      router.replace('/(tabs)/home');
    }
  };

  const handleSendOtp = async () => {
    setLoading(true);
    setError('');
    const { error: otpError } = await supabase.auth.signInWithOtp({ phone });
    setLoading(false);
    if (otpError) {
      setError(otpError.message);
    } else {
      setOtpSent(true);
    }
  };

  const handleVerifyOtp = async () => {
    setLoading(true);
    setError('');
    const { error: verifyError } = await supabase.auth.verifyOtp({
      phone,
      token: otp,
      type: 'sms',
    });
    setLoading(false);
    if (verifyError) {
      setError(verifyError.message);
    } else {
      router.replace('/(tabs)/home');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Aqari</Text>
      <Text style={styles.subtitle}>عقاري</Text>

      {/* Mode toggle */}
      <View style={styles.toggleRow}>
        <TouchableOpacity
          style={[styles.toggleBtn, mode === 'email' && styles.toggleActive]}
          onPress={() => { setMode('email'); setError(''); }}
        >
          <Text style={[styles.toggleText, mode === 'email' && styles.toggleTextActive]}>
            Email
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toggleBtn, mode === 'phone' && styles.toggleActive]}
          onPress={() => { setMode('phone'); setError(''); setOtpSent(false); }}
        >
          <Text style={[styles.toggleText, mode === 'phone' && styles.toggleTextActive]}>
            Phone
          </Text>
        </TouchableOpacity>
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {mode === 'email' ? (
        <>
          <TextInput
            style={styles.input}
            placeholder="Email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <TextInput
            style={styles.input}
            placeholder="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
          <TouchableOpacity style={styles.button} onPress={handleEmailLogin} disabled={loading}>
            <Text style={styles.buttonText}>{loading ? '...' : 'Login'}</Text>
          </TouchableOpacity>
        </>
      ) : (
        <>
          <TextInput
            style={styles.input}
            placeholder="+971501234567"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            editable={!otpSent}
          />
          {!otpSent ? (
            <TouchableOpacity style={styles.button} onPress={handleSendOtp} disabled={loading}>
              <Text style={styles.buttonText}>{loading ? '...' : 'Send OTP'}</Text>
            </TouchableOpacity>
          ) : (
            <>
              <TextInput
                style={[styles.input, styles.otpInput]}
                placeholder="Enter OTP"
                value={otp}
                onChangeText={setOtp}
                keyboardType="number-pad"
                maxLength={6}
              />
              <TouchableOpacity style={styles.button} onPress={handleVerifyOtp} disabled={loading}>
                <Text style={styles.buttonText}>{loading ? '...' : 'Verify'}</Text>
              </TouchableOpacity>
            </>
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 24, backgroundColor: '#f5f5f5' },
  title: { fontSize: 36, fontWeight: 'bold', textAlign: 'center', color: '#2563EB' },
  subtitle: { fontSize: 18, textAlign: 'center', color: '#6b7280', marginBottom: 32 },
  toggleRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  toggleBtn: { flex: 1, paddingVertical: 10, borderRadius: 8, backgroundColor: '#e5e7eb', alignItems: 'center' },
  toggleActive: { backgroundColor: '#2563EB' },
  toggleText: { fontSize: 14, fontWeight: '500', color: '#374151' },
  toggleTextActive: { color: '#fff' },
  error: { color: '#dc2626', fontSize: 13, marginBottom: 12, textAlign: 'center' },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, marginBottom: 12 },
  otpInput: { textAlign: 'center', fontSize: 20, letterSpacing: 8 },
  button: { backgroundColor: '#2563EB', borderRadius: 8, paddingVertical: 14, alignItems: 'center', marginTop: 4 },
  buttonText: { color: '#fff', fontSize: 15, fontWeight: '600' },
});
