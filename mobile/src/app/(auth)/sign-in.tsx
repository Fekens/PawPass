import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import * as Linking from 'expo-linking';
import { Link, router } from 'expo-router';

import { Screen } from '@/components/Screen';
import { supabase } from '@/lib/supabase';
import { colors, radius } from '@/theme';

export default function SignIn() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [resetBusy, setResetBusy] = useState(false);

  async function submit() {
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    setBusy(false);

    if (error) Alert.alert('Could not sign in', error.message);
    else router.replace('/(tabs)');
  }

  async function sendPasswordReset() {
    const normalizedEmail = email.trim();

    if (!normalizedEmail) {
      Alert.alert('Enter your email', 'Type your email address above, then tap Forgot password.');
      return;
    }

    setResetBusy(true);
    const redirectTo = Linking.createURL('/reset-password');
    const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
      redirectTo,
    });
    setResetBusy(false);

    if (error) {
      Alert.alert('Could not send reset email', error.message);
      return;
    }

    Alert.alert(
      'Check your email',
      'Open the PawPass reset link on this phone to choose a new password.',
    );
  }

  return (
    <Screen contentStyle={styles.screen}>
      <View style={styles.brand}>
        <View style={styles.mark}>
          <Text style={styles.markText}>P</Text>
        </View>
        <Text style={styles.brandText}>PawPass</Text>
      </View>

      <Text style={styles.title}>Welcome back</Text>
      <Text style={styles.sub}>Your pet’s care plan is waiting.</Text>

      <TextInput
        style={styles.input}
        autoCapitalize="none"
        keyboardType="email-address"
        placeholder="Email address"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        style={styles.input}
        secureTextEntry
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
      />

      <Pressable
        disabled={resetBusy}
        onPress={sendPasswordReset}
        style={styles.forgotButton}
      >
        <Text style={styles.forgotText}>
          {resetBusy ? 'Sending reset email…' : 'Forgot password?'}
        </Text>
      </Pressable>

      <Pressable style={styles.button} disabled={busy} onPress={submit}>
        <Text style={styles.buttonText}>{busy ? 'Signing in…' : 'Sign in'}</Text>
      </Pressable>

      <Text style={styles.footer}>
        New to PawPass?{' '}
        <Link href="/(auth)/sign-up" style={styles.link}>
          Create account
        </Link>
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { flexGrow: 1, justifyContent: 'center' },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  mark: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  markText: { color: colors.white, fontSize: 23, fontWeight: '900' },
  brandText: { fontSize: 24, fontWeight: '900', color: colors.ink },
  title: { fontSize: 36, fontWeight: '900', color: colors.ink, marginTop: 14 },
  sub: { color: colors.muted, fontSize: 16, marginBottom: 8 },
  input: {
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.md,
    padding: 15,
  },
  forgotButton: { alignSelf: 'flex-end', paddingVertical: 2 },
  forgotText: { color: colors.ink, fontWeight: '800' },
  button: {
    backgroundColor: colors.coral,
    borderRadius: radius.md,
    alignItems: 'center',
    padding: 16,
  },
  buttonText: { fontWeight: '900', color: colors.ink, fontSize: 16 },
  footer: { textAlign: 'center', color: colors.muted },
  link: { color: colors.ink, fontWeight: '800' },
});
