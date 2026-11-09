import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { request } from './api.js';
import './styles.css';

const statuses = ['Planned', 'Watching', 'Watched'];
const blank = { title: '', genre: '', status: 'Planned' };

function Header({ about }) {
  return <header className="site-header"><a className="brand" href="/" aria-label="Screenlist home"><span className="brand-mark" aria-hidden="true">S</span>screenlist<span className="brand-dot">.</span></a><nav aria-label="Main navigation"><a href="/" aria-current={!about ? 'page' : undefined}>Watchlist</a><a href="/about" aria-current={about ? 'page' : undefined}>About</a></nav><span className="header-note">GOOD FILMS. KEPT CLOSE.</span></header>;
}

function MovieForm({ movie, onSave, onCancel, busy, error }) {
  const [values, setValues] = useState(movie ? { title: movie.title, genre: movie.genre, status: movie.status } : blank);
  const title = useRef(null);
  useEffect(() => { title.current?.focus(); }, []);
  function change(event) { setValues({ ...values, [event.target.name]: event.target.value }); }
  return <section className="editor" aria-labelledby="editor-title"><div className="editor-heading"><div><span className="eyebrow">{movie ? 'A SMALL UPDATE' : 'MAKE ROOM FOR A GOOD FILM'}</span><h2 id="editor-title">{movie ? 'Edit movie' : 'Add to your list'}</h2></div><button className="text-button" onClick={onCancel} disabled={busy}>Cancel</button></div><form onSubmit={e => { e.preventDefault(); onSave(values); }}><div className="form-grid"><label>Movie title<input ref={title} name="title" value={values.title} onChange={change} required maxLength={120} placeholder="What are we watching?" disabled={busy}/></label><label>Genre<input name="genre" value={values.genre} onChange={change} required maxLength={40} placeholder="e.g. Science fiction" disabled={busy}/></label><label>Status<select name="status" value={values.status} onChange={change} disabled={busy}>{statuses.map(s => <option key={s}>{s}</option>)}</select></label></div>{error && <p className="error" role="alert">{error}</p>}<button className="primary" disabled={busy}>{busy ? 'Saving…' : movie ? 'Save changes' : 'Add movie'} <span aria-hidden="true">↗</span></button></form></section>;
}

function Watchlist() {
  const [data, setData] = useState(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [editor, setEditor] = useState(null);
  const [saveError, setSaveError] = useState('');
  const [busy, setBusy] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [revision, setRevision] = useState(0);
  const addButton = useRef(null);
  const deleteDialog = useRef(null);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError('');
    request('/movies?page=' + page, { signal: controller.signal }).then(result => { setData(result); }).catch(e => { if (e.name !== 'AbortError') setError(e.message); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [page, revision]);
  useEffect(() => { if (deleting) deleteDialog.current?.showModal(); }, [deleting]);
  function closeEditor() { setEditor(null); setSaveError(''); addButton.current?.focus(); }
  async function save(values) {
    setBusy(true); setSaveError('');
    try {
      const editing = Boolean(editor?._id);
      await request(editing ? '/movies/' + editor._id : '/movies', { method: editing ? 'PATCH' : 'POST', body: JSON.stringify(values) });
      closeEditor(); setNotice(editing ? 'Movie updated.' : 'Movie added.'); setPage(1); setRevision(r => r + 1);
    } catch (e) { setSaveError(e.message); } finally { setBusy(false); }
  }
  async function remove() {
    setBusy(true); setSaveError('');
    try {
      await request('/movies/' + deleting._id, { method: 'DELETE' });
      setDeleting(null); setNotice('Movie removed.');
      if (data?.items.length === 1 && page > 1) setPage(p => p - 1); else setRevision(r => r + 1);
      addButton.current?.focus();
    } catch (e) { setSaveError(e.message); } finally { setBusy(false); }
  }
  return <><section className="hero"><div><span className="eyebrow">YOUR PERSONAL MOVIE SHELF</span><h1>Save a film.<br/><em>Make a night of it.</em></h1><p>For the recommendations you mean to remember.<br/>Keep a list, pick a mood, and press play.</p><button ref={addButton} className="primary" disabled={busy} onClick={() => { setEditor({}); setSaveError(''); }}>Add a movie <span aria-hidden="true">＋</span></button></div><div className="ticket" aria-hidden="true"><div className="ticket-top">SCREENLIST CINEMA <span>ADMIT ONE</span></div><div className="ticket-middle"><span className="ticket-star">✳</span><p>THE NEXT<br/>GREAT WATCH.</p></div><div className="ticket-bottom"><span>ANY NIGHT<br/><b>YOUR CHOICE</b></span><span className="barcode">|||| ||| || |||| |||</span></div></div></section>
    <div className="notice" role="status">{notice}</div>
    {editor && <MovieForm key={editor._id || 'new'} movie={editor._id ? editor : null} onSave={save} onCancel={closeEditor} busy={busy} error={saveError}/>}
    <section className="collection" aria-labelledby="collection-title" aria-busy={loading}><div className="collection-heading"><div><span className="eyebrow">THE COLLECTION</span><h2 id="collection-title">Your watchlist</h2></div><span className="count">{data ? data.total + (data.total === 1 ? ' FILM' : ' FILMS') : '—'}</span></div>
    {error && <div className="error-panel" role="alert"><h3>We couldn’t load your list.</h3><p>{error}</p><button className="secondary" onClick={() => setRevision(r => r + 1)}>Try again</button></div>}
    {loading && <p role="status" className="loading">{data ? 'Refreshing your list…' : 'Loading your watchlist…'}</p>}
    {!loading && !error && data?.total === 0 && <div className="empty"><span aria-hidden="true">◎</span><h3>Your next favorite starts here.</h3><p>Add your first movie and keep those recommendations in one place.</p><button className="secondary" onClick={() => { setEditor({}); setSaveError(''); }}>Add your first movie</button></div>}
    <div className="movie-grid">{data?.items.map((movie, index) => <article className="movie" key={movie._id}><div className={'movie-art tone-' + index % 3} aria-hidden="true"><span className="film-number">{String((data.page - 1) * data.pageSize + index + 1).padStart(2, '0')}</span><span className="film-letter">{movie.title.slice(0, 1).toUpperCase()}</span><span className="film-caption">A NIGHT WORTH KEEPING</span></div><div className="movie-content"><div className="movie-meta"><span>{movie.genre}</span><span className={'status status-' + movie.status.toLowerCase()}>{movie.status}</span></div><h3>{movie.title}</h3><p className="date">Added {new Date(movie.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</p><div className="movie-actions"><button onClick={() => { setEditor(movie); setSaveError(''); }} disabled={busy || loading} aria-label={'Edit ' + movie.title}>Edit movie ↗</button><button className="remove" disabled={busy || loading} onClick={() => { setDeleting(movie); setSaveError(''); }} aria-label={'Remove ' + movie.title}>Remove</button></div></div></article>)}</div>
    {data && data.total > 12 && <nav className="pagination" aria-label="Watchlist pages"><button className="secondary" disabled={page === 1 || loading} onClick={() => setPage(p => p - 1)}>← Previous</button><span>Page {data.page}</span><button className="secondary" disabled={!data.hasMore || loading} onClick={() => setPage(p => p + 1)}>Next →</button></nav>}</section>
    {deleting && <dialog ref={deleteDialog} onCancel={e => { if (busy) e.preventDefault(); else setDeleting(null); }}><h2>Remove this movie?</h2><p>“{deleting.title}” will be removed from the watchlist.</p>{saveError && <p className="error" role="alert">{saveError}</p>}<div className="dialog-actions"><button className="secondary" autoFocus disabled={busy} onClick={() => setDeleting(null)}>Keep movie</button><button className="danger" disabled={busy} onClick={remove}>{busy ? 'Removing…' : 'Remove movie'}</button></div></dialog>}
  </>;
}

function About() {
  return <article className="about"><span className="eyebrow">A LITTLE LESS SCROLLING</span><h1>Good recommendations<br/><em>deserve a place.</em></h1><p className="intro">Screenlist is a small home for the films you want to watch—and the ones you finally made time for.</p><div className="about-grid"><section><span className="step">01</span><h2>Keep the recommendation.</h2><p>Add a title and genre when someone mentions a film. Choose Planned to save it for another night.</p></section><section><span className="step">02</span><h2>Make it your next watch.</h2><p>Edit a movie to change its details or move it to Watching. Mark it Watched when the credits roll.</p></section><section><span className="step">03</span><h2>Leave room for something new.</h2><p>Remove films you no longer want to keep. You’ll get a chance to confirm before a movie is deleted.</p></section></div><aside className="about-note"><h2>A shared collection for now.</h2><p>This version has one shared watchlist. Anyone using the site can add, edit, or remove entries, so keep personal information out of movie fields.</p></aside><a className="primary" href="/">Open the watchlist ↗</a></article>;
}
const about = window.location.pathname.replace(/\/$/, '') === '/about';
createRoot(document.getElementById('root')).render(<><a className="skip" href="#main">Skip to content</a><Header about={about}/><main id="main">{about ? <About/> : <Watchlist/>}</main><footer><a className="brand" href="/">screenlist.</a><span>A LITTLE LIST. A GOOD MOVIE NIGHT.</span><a href="/about">About this project ↗</a></footer></>);
