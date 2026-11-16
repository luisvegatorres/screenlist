import { Pressable, StyleSheet, Text, View, Platform } from "react-native";
import type { PropsWithChildren } from "react";
export const colors = {
  paper: "#F6F3EC",
  ink: "#242D27",
  muted: "#686D65",
  line: "#DADDD2",
  accent: "#B54D31",
  soft: "#E9EBDD",
};
export const serif = Platform.OS === "ios" ? "Georgia" : "serif";
export function Button({
  title,
  onPress,
  disabled = false,
  secondary = false,
}: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  secondary?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        s.button,
        secondary && s.secondary,
        (pressed || disabled) && { opacity: 0.5 },
      ]}
    >
      <Text style={[s.buttonText, secondary && { color: colors.ink }]}>
        {title}
      </Text>
    </Pressable>
  );
}
export function Eyebrow({ children }: PropsWithChildren) {
  return <Text style={s.eyebrow}>{children}</Text>;
}
export function ErrorPanel({
  message,
  retry,
}: {
  message: string;
  retry?: () => void;
}) {
  return (
    <View style={s.error}>
      <Text accessibilityRole="alert" style={s.errorText}>
        {message}
      </Text>
      {retry && <Button title="Try again" secondary onPress={retry} />}
    </View>
  );
}
export const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper },
  content: {
    padding: 24,
    gap: 20,
    width: "100%",
    maxWidth: 720,
    alignSelf: "center",
  },
  eyebrow: {
    color: colors.accent,
    fontSize: 11,
    letterSpacing: 2,
    fontWeight: "700",
  },
  title: { fontFamily: serif, fontSize: 38, lineHeight: 44, color: colors.ink },
  heading: { fontFamily: serif, fontSize: 26, color: colors.ink },
  body: { color: colors.muted, fontSize: 16, lineHeight: 25 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  button: {
    backgroundColor: colors.accent,
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderRadius: 12,
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonText: { color: "#FFFFFF", fontSize: 15, fontWeight: "700" },
  secondary: { backgroundColor: colors.soft },
  error: {
    borderWidth: 1,
    borderColor: "#D9A99A",
    borderRadius: 12,
    padding: 16,
    gap: 12,
    backgroundColor: "#FAECE6",
  },
  errorText: { color: "#862D1B", fontSize: 15, lineHeight: 22 },
  input: {
    backgroundColor: "#FFFDF8",
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 12,
    padding: 16,
    fontSize: 17,
    color: colors.ink,
    minHeight: 54,
  },
  label: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.ink,
    marginBottom: 8,
  },
  card: {
    backgroundColor: "#FFFDF8",
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 16,
    padding: 20,
    gap: 12,
  },
});
