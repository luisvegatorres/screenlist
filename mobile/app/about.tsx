import { ScrollView, Text, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Button, Eyebrow, s } from "../src/ui";
export default function About() {
  return (
    <SafeAreaView edges={["bottom", "left", "right"]} style={s.screen}>
      <ScrollView contentContainerStyle={s.content}>
        <Eyebrow>A LITTLE LESS SCROLLING</Eyebrow>
        <Text style={s.title}>Good recommendations deserve a place.</Text>
        <Text style={s.body}>
          Save a title and genre when someone mentions a film. Keep it Planned,
          move it to Watching, and mark it Watched when the credits roll.
        </Text>
        <Text style={s.heading}>A watchlist of your own.</Text>
        <Text style={s.body}>
          Your account connects your private watchlist across the website and mobile app. Anyone using this
          version can add, edit, or remove movies. Keep personal information out
          of movie fields.
        </Text>
        <Text style={s.heading}>Stay connected.</Text>
        <Text style={s.body}>
          Changes are saved online. If a request fails, check your connection
          and try again. After a timeout, refresh your list before repeating a
          change to check whether it already saved.
        </Text>
        <Text style={s.body}>
          Screenlist ·{" "}
          {Platform.OS === "web"
            ? "Web preview"
            : Platform.OS === "ios"
              ? "iOS"
              : "Android"}
        </Text>
        <Button
          title="Open the watchlist ↗"
          onPress={() => router.replace("/")}
        />
      </ScrollView>
    </SafeAreaView>
  );
}
