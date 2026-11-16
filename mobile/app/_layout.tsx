import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { colors } from "../src/ui";
export default function Layout() {
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.paper },
          headerTintColor: colors.ink,
          headerShadowVisible: false,
          contentStyle: { backgroundColor: colors.paper },
          headerBackTitle: "Back",
        }}
      >
        <Stack.Screen name="index" options={{ title: "screenlist." }} />
        <Stack.Screen name="movie/[id]" options={{ title: "Movie details" }} />
        <Stack.Screen
          name="editor"
          options={{ title: "Your movie", presentation: "modal" }}
        />
        <Stack.Screen name="about" options={{ title: "About Screenlist" }} />
      </Stack>
    </SafeAreaProvider>
  );
}
