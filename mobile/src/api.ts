export type Status = "Planned" | "Watching" | "Watched";
export type MovieInput = { title: string; genre: string; status: Status };
export type Movie = MovieInput & {
  _id: string;
  created_at: string;
  updated_at: string;
};
export type MoviePage = {
  items: Movie[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
};
export const statuses: Status[] = ["Planned", "Watching", "Watched"];
export const DEFAULT_API_URL = "https://screenlist-three.vercel.app/api";

export function validateInput(values: MovieInput): string | null {
  if (!values.title.trim() || values.title.trim().length > 120)
    return "Enter a movie title (1–120 characters).";
  if (!values.genre.trim() || values.genre.trim().length > 40)
    return "Enter a genre (1–40 characters).";
  if (!statuses.includes(values.status)) return "Choose a valid movie status.";
  return null;
}

// Inject fetch and the URL so request behavior can be verified without a database.
export function createApi(
  baseUrl: string,
  fetcher: typeof fetch = fetch,
  timeoutMs = 15000,
) {
  async function request<T>(
    path: string,
    options: RequestInit = {},
  ): Promise<T> {
    const controller = new AbortController();
    const external = options.signal;
    const cancel = () => controller.abort();
    if (external?.aborted) cancel();
    external?.addEventListener("abort", cancel, { once: true });
    const timer = setTimeout(cancel, timeoutMs);
    try {
      const response = await fetcher(baseUrl.replace(/\/$/, "") + path, {
        ...options,
        signal: controller.signal,
        headers: {
          Accept: "application/json",
          ...(options.body ? { "Content-Type": "application/json" } : {}),
          ...options.headers,
        },
      });
      if (response.status === 204) return null as T;
      const data = await response.json().catch(() => {
        throw new Error(
          "The server returned an unexpected response. Please try again.",
        );
      });
      if (!response.ok)
        throw new Error(
          data.error || "The request could not be completed. Please try again.",
        );
      return data as T;
    } catch (error) {
      if (external?.aborted) throw error;
      if (controller.signal.aborted)
        throw new Error(
          "The request timed out. Check your connection and refresh the list before retrying a change.",
        );
      if (error instanceof TypeError)
        throw new Error(
          "Cannot reach the watchlist. Check your connection and try again.",
        );
      throw error;
    } finally {
      clearTimeout(timer);
      external?.removeEventListener("abort", cancel);
    }
  }
  return {
    list: (page = 1, signal?: AbortSignal) =>
      request<MoviePage>("/movies?page=" + page, { signal }),
    get: (id: string, signal?: AbortSignal) =>
      request<Movie>("/movies/" + encodeURIComponent(id), { signal }),
    save: (values: MovieInput, id?: string) =>
      request<Movie>(id ? "/movies/" + encodeURIComponent(id) : "/movies", {
        method: id ? "PATCH" : "POST",
        body: JSON.stringify({
          ...values,
          title: values.title.trim(),
          genre: values.genre.trim(),
        }),
      }),
    remove: (id: string) =>
      request<null>("/movies/" + encodeURIComponent(id), { method: "DELETE" }),
  };
}
