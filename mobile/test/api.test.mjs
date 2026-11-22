import test from "node:test";
import assert from "node:assert/strict";
import { createApi, validateInput } from "../src/api.ts";
const movie = { title: "Arrival", genre: "Science fiction", status: "Planned" };
test("create and edit use the API contract and trim input", async () => {
  const calls = [];
  const api = createApi("https://example.test/api/", async (url, options) => {
    calls.push({ url, ...options });
    return Response.json({ ...movie, _id: "abc" });
  });
  await api.save({ ...movie, title: " Arrival " });
  await api.save(movie, "abc");
  assert.equal(calls[0].url, "https://example.test/api/movies");
  assert.equal(calls[0].method, "POST");
  assert.equal(JSON.parse(calls[0].body).title, "Arrival");
  assert.equal(calls[1].method, "PATCH");
  assert.equal(calls[1].url, "https://example.test/api/movies/abc");
});
test("list passes page and get addresses one record", async () => {
  const calls = [];
  const api = createApi("/api", async (url) => {
    calls.push(url);
    return Response.json({});
  });
  await api.list(2);
  await api.get("abc");
  assert.deepEqual(calls, ["/api/movies?page=2", "/api/movies/abc"]);
});
test("delete accepts empty 204 response", async () => {
  const api = createApi("/api", async (url, options) => {
    assert.equal(options.method, "DELETE");
    return new Response(null, { status: 204 });
  });
  assert.equal(await api.remove("abc"), null);
});
test("server validation errors are surfaced", async () => {
  const api = createApi("/api", async () =>
    Response.json({ error: "Movie not found." }, { status: 404 }),
  );
  await assert.rejects(api.get("abc"), /Movie not found/);
});
test("malformed and offline responses produce actionable errors", async () => {
  await assert.rejects(
    createApi("/api", async () => new Response("<html>")).list(),
    /unexpected response/,
  );
  await assert.rejects(
    createApi("/api", async () => {
      throw new TypeError("Failed to fetch");
    }).list(),
    /Check your connection/,
  );
});
const waitingFetch = (_, { signal }) =>
  new Promise((resolve, reject) => {
    if (signal.aborted) reject(new DOMException("Aborted", "AbortError"));
    else
      signal.addEventListener(
        "abort",
        () => reject(new DOMException("Aborted", "AbortError")),
        { once: true },
      );
  });
test("timeout ends hanging requests without automatically retrying a write", async () => {
  await assert.rejects(
    createApi("/api", waitingFetch, 10).save(movie),
    /timed out/,
  );
});
test("screen cleanup preserves cancellation instead of a connection error", async () => {
  const controller = new AbortController();
  const pending = createApi("/api", waitingFetch).list(1, controller.signal);
  controller.abort();
  await assert.rejects(pending, { name: "AbortError" });
});
test("input validation mirrors required fields and limits", () => {
  assert.equal(validateInput(movie), null);
  assert.match(validateInput({ ...movie, title: " " }), /title/);
  assert.match(validateInput({ ...movie, genre: "a".repeat(41) }), /genre/);
  assert.match(validateInput({ ...movie, status: "Unknown" }), /status/);
});

test('native credentials are attached and protected 401 responses expire the session', async () => {
  let called = 0;
  const client = createApi('https://example.invalid/api', async (url, options) => {
    assert.equal(options.headers.Authorization, 'Bearer session-token');
    assert.equal(options.headers['X-Screenlist-Client'], 'native');
    return new Response(JSON.stringify({error:'Please sign in'}), {status:401});
  }, 1000, {getToken:()=> 'session-token', onUnauthorized:()=>called++});
  await assert.rejects(client.list(), /Please sign in/); assert.equal(called, 1);
  await assert.rejects(client.authenticate({email:'x@example.invalid',password:'incorrect-password'},false), /Please sign in/); assert.equal(called, 1);
});
test('browser auth requests use cookie transport without a bearer token', async () => {
  const client = createApi('/api', async (url, options) => {
    assert.equal(url, '/api/auth/register'); assert.equal(options.headers['X-Screenlist-Client'],'web'); assert.equal(options.headers.Authorization, undefined);
    const body = JSON.parse(options.body); assert.equal(body.name,'Reader');
    return new Response(JSON.stringify({user:{_id:'1',name:'Reader',email:'r@example.invalid'},expiresAt:'2027-01-01T00:00:00Z'}),{status:201});
  },1000,{client:'web'});
  assert.equal((await client.authenticate({name:'Reader',email:'r@example.invalid',password:'example-password'},true)).user.name,'Reader');
});
