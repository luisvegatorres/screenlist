import { useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from './auth';
import { Button, colors, ErrorPanel, Eyebrow } from './ui';
export function AccountForm({ register = false }: { register?: boolean }) {
  const { signIn } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const saving = useRef(false);
  async function submit() {
    if (saving.current) return;
    if ((register && !name.trim()) || !/^\S+@\S+\.\S+$/.test(email.trim()) || password.length < 12 || password.length > 128) { setError('Enter a valid email, a 12–128 character password, and your name when registering.'); return; }
    saving.current = true; setBusy(true); setError('');
    try { await signIn({ ...(register ? { name: name.trim() } : {}), email: email.trim(), password }, register); }
    catch (e) { setError(e instanceof Error ? e.message : 'Please try again.'); }
    finally { saving.current = false; setBusy(false); }
  }
  return <KeyboardAvoidingView style={{flex:1}} behavior={Platform.OS === 'ios' ? 'padding' : undefined}><ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled"><Eyebrow>GOOD FILMS. YOUR OWN LIST.</Eyebrow><Text style={styles.title}>{register ? 'Make yourself at home.' : 'Welcome back.'}</Text><Text style={styles.copy}>{register ? 'Create an account for your next movie night.' : 'Sign in to your private watchlist.'}</Text>{register && <View><Text style={styles.label}>Your name</Text><TextInput accessibilityLabel="Your name" autoComplete="name" maxLength={80} value={name} onChangeText={setName} style={styles.input} editable={!busy}/></View>}<View><Text style={styles.label}>Email address</Text><TextInput accessibilityLabel="Email address" autoComplete="email" autoCapitalize="none" autoCorrect={false} keyboardType="email-address" maxLength={254} value={email} onChangeText={setEmail} style={styles.input} editable={!busy}/></View><View><Text style={styles.label}>Password</Text><TextInput accessibilityLabel="Password" autoComplete={register ? 'new-password' : 'current-password'} autoCapitalize="none" autoCorrect={false} secureTextEntry maxLength={128} value={password} onChangeText={setPassword} style={styles.input} editable={!busy} onSubmitEditing={submit}/></View><Text style={styles.copy}>Use 12–128 characters.</Text>{error ? <ErrorPanel message={error}/> : null}<Button title={busy ? 'Please wait…' : register ? 'Create account ↗' : 'Sign in ↗'} onPress={submit} disabled={busy}/><Button title={register ? 'Already registered? Sign in' : 'New here? Create an account'} onPress={() => router.replace(register ? '/sign-in' : '/register')} disabled={busy} secondary/></ScrollView></KeyboardAvoidingView>;
}
const styles = StyleSheet.create({content:{padding:24,gap:20,maxWidth:560,width:'100%',alignSelf:'center'},title:{fontSize:38,fontWeight:'700',color:colors.ink},copy:{fontSize:16,lineHeight:24,color:colors.ink},label:{fontSize:15,fontWeight:'600',color:colors.ink,marginBottom:8},input:{minHeight:52,borderWidth:1,borderColor:'#9baba1',borderRadius:8,paddingHorizontal:14,fontSize:17,backgroundColor:'#fff',color:colors.ink}});
