import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { statuses, validateInput, type MovieInput } from "../src/api";
import { api } from "../src/client";
import { Button, colors, ErrorPanel, Eyebrow, s } from "../src/ui";
export default function Editor() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const [values, setValues] = useState<MovieInput>({
    title: "",
    genre: "",
    status: "Planned",
  });
  const [loading, setLoading] = useState(Boolean(id));
  const [loaded, setLoaded] = useState(!id);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [revision, setRevision] = useState(0);
  const lock = useRef(false);
  useEffect(() => {
    if (!id) return;
    const controller = new AbortController();
    setLoading(true);
    setError("");
    api
      .get(id, controller.signal)
      .then((movie) => {
        if (!controller.signal.aborted) {
          setValues({
            title: movie.title,
            genre: movie.genre,
            status: movie.status,
          });
          setLoaded(true);
        }
      })
      .catch((e) => {
        if (!controller.signal.aborted) setError(e.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [id, revision]);
  async function save() {
    if (lock.current) return;
    const invalid = validateInput(values);
    if (invalid) {
      setError(invalid);
      return;
    }
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      const movie = await api.save(values, id);
      router.dismissTo({ pathname: "/movie/[id]", params: { id: movie._id } });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save your movie.");
    } finally {
      setBusy(false);
      lock.current = false;
    }
  }
  return (
    <SafeAreaView edges={["bottom", "left", "right"]} style={s.screen}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={100}
      >
        <ScrollView
          contentContainerStyle={s.content}
          keyboardShouldPersistTaps="handled"
        >
          <Eyebrow>
            {id ? "A SMALL UPDATE" : "MAKE ROOM FOR A GOOD FILM"}
          </Eyebrow>
          <Text style={s.title}>
            {id ? "Edit your movie." : "What are we watching?"}
          </Text>
          {loading ? (
            <ActivityIndicator
              accessibilityLabel="Loading movie"
              color={colors.accent}
            />
          ) : null}
          {error ? (
            <ErrorPanel
              message={error}
              retry={
                !loaded && !loading
                  ? () => setRevision((v) => v + 1)
                  : undefined
              }
            />
          ) : null}
          {loaded && !loading ? (
            <>
              <View>
                <Text style={s.label}>Movie title</Text>
                <TextInput
                  accessibilityLabel="Movie title"
                  style={s.input}
                  value={values.title}
                  editable={!busy}
                  maxLength={120}
                  autoCapitalize="words"
                  placeholder="e.g. Arrival"
                  placeholderTextColor={colors.muted}
                  onChangeText={(title) => setValues((v) => ({ ...v, title }))}
                />
              </View>
              <View>
                <Text style={s.label}>Genre</Text>
                <TextInput
                  accessibilityLabel="Genre"
                  style={s.input}
                  value={values.genre}
                  editable={!busy}
                  maxLength={40}
                  autoCapitalize="words"
                  placeholder="e.g. Science fiction"
                  placeholderTextColor={colors.muted}
                  onChangeText={(genre) => setValues((v) => ({ ...v, genre }))}
                />
              </View>
              <View>
                <Text style={s.label}>Status</Text>
                <View style={{ gap: 10 }}>
                  {statuses.map((status) => (
                    <Pressable
                      key={status}
                      accessibilityRole="radio"
                      accessibilityState={{
                        checked: values.status === status,
                        disabled: busy,
                      }}
                      disabled={busy}
                      onPress={() => setValues((v) => ({ ...v, status }))}
                      style={[
                        s.input,
                        s.row,
                        values.status === status && {
                          borderColor: colors.accent,
                          backgroundColor: "#F6E8DD",
                        },
                      ]}
                    >
                      <Text style={{ color: colors.ink, fontSize: 16 }}>
                        {status}
                      </Text>
                      <Text style={{ color: colors.accent }}>
                        {values.status === status ? "●" : "○"}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
              <Button
                title={busy ? "Saving…" : id ? "Save changes" : "Add movie"}
                disabled={busy}
                onPress={save}
              />
            </>
          ) : null}
          <Button
            title="Cancel"
            secondary
            disabled={busy}
            onPress={() =>
              router.canGoBack() ? router.back() : router.replace("/")
            }
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
