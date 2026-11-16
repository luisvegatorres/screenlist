import { Text, View } from "react-native";
import { router } from "expo-router";
import { Button, s } from "../src/ui";
export default function NotFound() {
  return (
    <View style={[s.screen, s.content]}>
      <Text style={s.title}>This screen isn’t here.</Text>
      <Button title="Open watchlist" onPress={() => router.replace("/")} />
    </View>
  );
}
