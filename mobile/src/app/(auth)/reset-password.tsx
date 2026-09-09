import { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import * as Linking from 'expo-linking';
import { Link, router, useLocalSearchParams } from 'expo-router';

import { Screen } from '@/components/Screen';
import { supabase } from '@/lib/supabase';
import { colors, radius } from '@/theme';

function getLinkParams(url: string) {
  const [beforeHash, hash = ''] = url.split('#');
  const query = beforeHash.includes('?') ? beforeHash.split('?').slice(1).join('?') : '';
  const queryParams = new URLSearchParams(query);
  const hashParams = new URLSearchParams(hash);
  const get = (name: string) => hashParams.get(name) ?? queryParams.get(name);

  return {
    accessToken: get('access_token'),
    refreshToken: get('refresh_token'),
    code: get('code'),
    errorDescription: get('error_description'),
  };
}

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default function ResetPassword() {
  const url = Linking.useURL();
  const routeParams = useLocalSearchParams<{
    access_token?: string | string[];
    refresh_token?: string | string[];
    code?: string | string[];
    error_description?: string | string[];
  }>();
  const routeAccessToken = firstValue(routeParams.access_token);
  const routeRefreshToken = firstValue(routeParams.refresh_token);
  const routeCode = firstValue(routeParams.code);
  const routeErrorDescription = firstValue(routeParams.error_description);
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [ready, setReady] = useState(false);
  const [message, setMessage] = useState('Checking your reset link…');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!url && !routeAccessToken && !routeRefreshToken && !routeCode) {
      setMessage('Open this screen using the reset link in your email.');
      return;
    }

    let active = true;

    async function prepareRecovery() {
      const linkParams = url ? getLinkParams(url) : {
        accessToken: null,
        refreshToken: null,
        code: null,
        errorDescription: null,
      };
      const accessToken = routeAccessToken ?? linkParams.accessToken;
      const refreshToken = routeRefreshToken ?? linkParams.refreshToken;
      const code = routeCode ?? linkParams.code;
      const errorDescription = routeErrorDescription ?? linkParams.errorDescription;

      if (errorDescription) {
        if (active) setMessage(errorDescription);
        return;
      }

      const result = code
        ? await supabase.auth.exchangeCodeForSession(code)
        : accessToken && refreshToken
          ? await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            })
          : null;

      if (!result) {
        if (active) setMessage('This reset link is invalid or has expired. Request a new one.');
        return;
      }

      if (result.error) {
        if (active) setMessage(result.error.message);
        return;
      }

      if (active) {
        setReady(true);
        setMessage('Choose a new password for your PawPass account.');
      }
    }

    prepareRecovery();

    return () => {
      active = false;
    };
  }, [routeAccessToken, routeCode, routeErrorDescription, routeRefreshToken, url]);

  async function updatePassword() {
    if (password.length < 8) {
      Alert.alert('Password too short', 'Use at least 8 characters.');
      return;
    }

    if (password !== confirmation) {
      Alert.alert('Passwords do not match', 'Enter the same password in both fields.');
      return;
    }

    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    if (!error) await supabase.auth.signOut();
    setBusy(false);

    if (error) {
      Alert.alert('Could not update password', error.message);
      return;
    }

    Alert.alert('Password updated', 'You can now sign in with your new password.', [
      { text: 'Continue', onPress: () => router.replace('/(auth)/sign-in') },
    ]);
  }

  return (
    <Screen contentStyle={styles.screen}>
      <View style={styles.brand}>
        <View style={styles.mark}>
          <Text style={styles.markText}>P</Text>
        </View>
        <Text style={styles.brandText}>PawPass</Text>
      </View>

      <Text style={styles.title}>Create new password</Text>
      <Text style={styles.sub}>{message}</Text>

      {ready && (
        <>
          <TextInput
            style={styles.input}
            secureTextEntry
            autoCapitalize="none"
            placeholder="New password"
            value={password}
            onChangeText={setPassword}
          />
          <TextInput
            style={styles.input}
            secureTextEntry
            autoCapitalize="none"
            placeholder="Confirm new password"
            value={confirmation}
            onChangeText={setConfirmation}
          />
          <Pressable style={styles.button} disabled={busy} onPress={updatePassword}>
            <Text style={styles.buttonText}>{busy ? 'Updating…' : 'Update password'}</Text>
          </Pressable>
        </>
      )}

      <Link href="/(auth)/sign-in" style={styles.link}>
        Back to sign in
      </Link>
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
  button: {
    backgroundColor: colors.coral,
    borderRadius: radius.md,
    alignItems: 'center',
    padding: 16,
  },
  buttonText: { fontWeight: '900', color: colors.ink, fontSize: 16 },
  link: { color: colors.ink, fontWeight: '800', textAlign: 'center' },
});
