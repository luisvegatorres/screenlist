import { useCallback, useRef, useState } from "react";
import { ActivityIndicator, ScrollView, Text, View } from "react-native";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import type { Movie } from "../../src/api";
import { api } from "../../src/client";
import { Button, colors, ErrorPanel, Eyebrow, s } from "../../src/ui";
export default function MovieDetails() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [movie, setMovie] = useState<Movie | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const [revision, setRevision] = useState(0);
  useFocusEffect(
    useCallback(() => {
      const controller = new AbortController();
      setLoading(true);
      setError("");
      setConfirm(false);
      api
        .get(id, controller.signal)
        .then((value) => {
          if (!controller.signal.aborted) setMovie(value);
        })
        .catch((e) => {
          if (!controller.signal.aborted) {
            setMovie(null);
            setError(e.message);
          }
        })
        .finally(() => {
          if (!controller.signal.aborted) setLoading(false);
        });
      return () => controller.abort();
    }, [id, revision]),
  );
  async function remove() {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      await api.remove(id);
      router.replace("/");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not remove the movie.");
    } finally {
      setBusy(false);
      lock.current = false;
    }
  }
  return (
    <SafeAreaView edges={["bottom", "left", "right"]} style={s.screen}>
      <ScrollView contentContainerStyle={s.content}>
        {loading ? (
          <ActivityIndicator
            accessibilityLabel="Loading movie"
            color={colors.accent}
          />
        ) : null}
        {error ? (
          <ErrorPanel
            message={error}
            retry={!busy ? () => setRevision((v) => v + 1) : undefined}
          />
        ) : null}
        {movie && !loading ? (
          <>
            <Eyebrow>{movie.genre.toUpperCase()}</Eyebrow>
            <Text style={s.title}>{movie.title}</Text>
            <View style={[s.card, { backgroundColor: colors.soft }]}>
              <Eyebrow>ON YOUR SHELF</Eyebrow>
              <Text style={s.heading}>{movie.status}</Text>
              <Text style={s.body}>
                Added {new Date(movie.created_at).toLocaleDateString()}
              </Text>
            </View>
            <Button
              title="Edit movie ↗"
              disabled={busy}
              onPress={() =>
                router.push({ pathname: "/editor", params: { id: movie._id } })
              }
            />
            {confirm ? (
              <View style={s.card}>
                <Text style={s.heading}>Remove this movie?</Text>
                <Text style={s.body}>
                  “{movie.title}” will be removed from the shared watchlist.
                </Text>
                <Button
                  title={busy ? "Removing…" : "Remove movie"}
                  disabled={busy}
                  onPress={remove}
                />
                <Button
                  title="Keep movie"
                  secondary
                  disabled={busy}
                  onPress={() => setConfirm(false)}
                />
              </View>
            ) : (
              <Button
                title="Remove from watchlist"
                secondary
                onPress={() => {
                  setError("");
                  setConfirm(true);
                }}
              />
            )}
          </>
        ) : null}
        <Button
          title="Back to watchlist"
          secondary
          disabled={busy}
          onPress={() => router.replace("/")}
        />
      </ScrollView>
    </SafeAreaView>
  );
}
