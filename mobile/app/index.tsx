import { memo, useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  Text,
  View,
} from "react-native";
import { router, useFocusEffect } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { api } from "../src/client";
import type { Movie, MoviePage } from "../src/api";
import { Button, colors, ErrorPanel, Eyebrow, s } from "../src/ui";
const MovieRow = memo(function MovieRow({ movie }: { movie: Movie }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={"View " + movie.title}
      onPress={() =>
        router.push({ pathname: "/movie/[id]", params: { id: movie._id } })
      }
      style={({ pressed }) => [
        s.card,
        { marginBottom: 14, opacity: pressed ? 0.65 : 1 },
      ]}
    >
      <View style={s.row}>
        <Eyebrow>{movie.genre.toUpperCase()}</Eyebrow>
        <Text style={{ color: colors.muted, fontSize: 12 }}>
          {movie.status}
        </Text>
      </View>
      <Text style={s.heading}>{movie.title}</Text>
      <Text style={s.body}>View movie ↗</Text>
    </Pressable>
  );
});
const renderMovie = ({ item }: { item: Movie }) => <MovieRow movie={item} />;
const movieKey = (item: Movie) => item._id;
export default function Watchlist() {
  const [data, setData] = useState<MoviePage | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  const refresh = useCallback(() => setRevision((v) => v + 1), []);
  const list = useRef<FlatList<Movie>>(null);
  useFocusEffect(
    useCallback(() => {
      const controller = new AbortController();
      setLoading(true);
      setError("");
      api
        .list(page, controller.signal)
        .then((result) => {
          if (controller.signal.aborted) return;
          if (!result.items.length && page > 1) {
            setPage(page - 1);
            return;
          }
          setData(result);
        })
        .catch((e) => {
          if (!controller.signal.aborted) setError(e.message);
        })
        .finally(() => {
          if (!controller.signal.aborted) setLoading(false);
        });
      return () => controller.abort();
    }, [page, revision]),
  );
  const changePage = (next: number) => {
    setData(null);
    setPage(next);
    list.current?.scrollToOffset({ offset: 0, animated: false });
  };
  return (
    <SafeAreaView edges={["bottom", "left", "right"]} style={s.screen}>
      <FlatList
        ref={list}
        data={error ? [] : (data?.items ?? [])}
        renderItem={renderMovie}
        keyExtractor={movieKey}
        contentContainerStyle={s.content}
        refreshing={loading}
        onRefresh={refresh}
        ListHeaderComponent={
          <View style={{ gap: 20, marginBottom: 8 }}>
            <View style={s.row}>
              <Eyebrow>GOOD FILMS. KEPT CLOSE.</Eyebrow>
              <Pressable
                accessibilityRole="button"
                onPress={() => router.push("/about")}
                hitSlop={10}
                style={{ minHeight: 44, justifyContent: "center" }}
              >
                <Text style={{ color: colors.ink }}>About ↗</Text>
              </Pressable>
            </View>
            <Text style={s.title}>Save a film.{"\n"}Make a night of it.</Text>
            <Text style={s.body}>A little list for your next great watch.</Text>
            <Button
              title="＋ Add a movie"
              onPress={() => router.push("/editor")}
            />
            <View style={[s.row, { marginTop: 20 }]}>
              <Text style={s.heading}>Your watchlist</Text>
              <Text style={s.body}>{data ? data.total + (data.total === 1 ? " film" : " films") : "—"}</Text>
            </View>
            {error ? <ErrorPanel message={error} retry={refresh} /> : null}
          </View>
        }
        ListEmptyComponent={
          !loading && !error ? (
            <View style={s.card}>
              <Text style={s.heading}>Your next favorite starts here.</Text>
              <Text style={s.body}>
                Keep a recommendation. Add your first movie above.
              </Text>
            </View>
          ) : loading ? (
            <ActivityIndicator
              accessibilityLabel="Loading watchlist"
              color={colors.accent}
            />
          ) : undefined
        }
        ListFooterComponent={
          data && data.total > data.pageSize && !error ? (
            <View style={[s.row, { flexWrap: "wrap" }]}>
              <Button
                title="← Previous"
                secondary
                disabled={loading || page === 1}
                onPress={() => changePage(page - 1)}
              />
              <Text style={s.body}>Page {data.page}</Text>
              <Button
                title="Next →"
                secondary
                disabled={loading || !data.hasMore}
                onPress={() => changePage(page + 1)}
              />
            </View>
          ) : undefined
        }
      />
    </SafeAreaView>
  );
}
