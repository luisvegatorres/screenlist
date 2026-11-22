import { useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { AuthProvider, useAuth } from "../src/auth";
import { ErrorPanel } from "../src/ui";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { colors } from "../src/ui";
export default function Layout() { return <AuthProvider><Navigation/></AuthProvider>; }
function Navigation() {
  const { user, loading, error, retry, signOut } = useAuth();
  const [busy, setBusy] = useState(false);
  const [logoutError, setLogoutError] = useState('');
  if (loading) return <SafeAreaProvider><View style={{flex:1, justifyContent:'center', backgroundColor:colors.paper}}><ActivityIndicator accessibilityLabel="Checking your session"/></View></SafeAreaProvider>;
  if (error) return <SafeAreaProvider><View style={{padding:24, paddingTop:80}}><ErrorPanel message={error} retry={retry}/></View></SafeAreaProvider>;

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      {logoutError ? <ErrorPanel message={logoutError}/> : null}
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.paper },
          headerTintColor: colors.ink,
          headerShadowVisible: false,
          contentStyle: { backgroundColor: colors.paper },
          headerBackTitle: "Back",
          headerRight: () => user ? <Pressable accessibilityRole="button" disabled={busy} onPress={async () => { setBusy(true); setLogoutError(''); try { await signOut(); } catch(e) { setLogoutError(e instanceof Error ? e.message : 'Please try again.'); } finally { setBusy(false); } }} style={{padding:12}}><Text style={{color:colors.ink}}>{busy ? 'Signing out…' : 'Sign out'}</Text></Pressable> : null,
        }}
      >
        <Stack.Protected guard={Boolean(user)}>
        <Stack.Screen name="index" options={{ title: "screenlist." }} />
        <Stack.Screen name="movie/[id]" options={{ title: "Movie details" }} />
        <Stack.Screen
          name="editor"
          options={{ title: "Your movie", presentation: "modal" }}
        />
        </Stack.Protected>
        <Stack.Protected guard={!user}>
          <Stack.Screen name="sign-in" options={{ title: 'Sign in' }}/>
          <Stack.Screen name="register" options={{ title: 'Create account' }}/>
        </Stack.Protected>
        <Stack.Screen name="about" options={{ title: "About Screenlist" }} />
      </Stack>
    </SafeAreaProvider>
  );
}
