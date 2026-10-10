import React, { useState, useEffect, useRef } from 'react';
import { AudioQuote, SiteConfig } from '../types.ts';

interface AdminDashboardProps {
  token: string;
  onLogout: () => void;
  onViewPublic: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  token,
  onLogout,
  onViewPublic,
}) => {
  const [activeTab, setActiveTab] = useState<'quotes' | 'portrait' | 'security'>('quotes');
  const [clips, setClips] = useState<AudioQuote[]>([]);
  const [siteConfig, setSiteConfig] = useState<SiteConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Quote filter and search
  const [quoteFilter, setQuoteFilter] = useState<'all' | 'draft' | 'verified'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Audio preview player
  const [previewClipId, setPreviewClipId] = useState<number | null>(null);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);

  // Modal editor state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClipId, setEditingClipId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    quote: '',
    audioUrl: '',
    sourceUrl: '',
    date: '',
    verified: false,
    enabled: false,
    audioType: 'direct' as 'direct' | 'upload' | 'embed',
    notes: '',
  });

  // Audio upload state
  const [uploadingAudio, setUploadingAudio] = useState(false);
  const [audioUploadNotice, setAudioUploadNotice] = useState<string | null>(null);

  // Portrait upload state
  const [uploadingPortrait, setUploadingPortrait] = useState(false);
  const portraitInputRef = useRef<HTMLInputElement | null>(null);

  // Theme Song state
  const [themeSongInput, setThemeSongInput] = useState('');
  const [savingThemeSong, setSavingThemeSong] = useState(false);

  // Password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);

  const showNotice = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => {
      setNotification((prev) => (prev?.message === message ? null : prev));
    }, 4500);
  };

  const fetchConfig = async () => {
    try {
      const res = await fetch('/api/site-config');
      if (res.ok) {
        const data = await res.json();
        setSiteConfig(data);
        if (data.themeSongUrl) {
          setThemeSongInput(data.themeSongUrl);
        }
      }
    } catch (err) {
      console.error('Failed to fetch site config:', err);
    }
  };

  const handleSaveThemeSong = async () => {
    setSavingThemeSong(true);
    try {
      const res = await fetch('/api/admin/update-theme-song', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ themeSongUrl: themeSongInput }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update theme song');

      showNotice('success', 'Theme song URL updated successfully');
      fetchConfig();
    } catch (err: any) {
      showNotice('error', err.message || 'Failed to update theme song');
    } finally {
      setSavingThemeSong(false);
    }
  };

  const fetchClips = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/clips', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401) {
        onLogout();
        return;
      }
      if (res.ok) {
        const data = await res.json();
        setClips(data);
      }
    } catch (err) {
      showNotice('error', 'Failed to load quotes archive');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfig();
    fetchClips();
  }, [token]);

  // Clean up audio preview when component unmounts
  useEffect(() => {
    return () => {
      if (previewAudioRef.current) {
        previewAudioRef.current.pause();
        previewAudioRef.current = null;
      }
    };
  }, []);

  const togglePreview = (clip: AudioQuote) => {
    if (!clip.audioUrl || !clip.audioUrl.trim()) {
      showNotice('error', 'Please attach an MP3 audio URL first to preview');
      return;
    }

    if (previewClipId === clip.id) {
      if (previewAudioRef.current) {
        previewAudioRef.current.pause();
      }
      setPreviewClipId(null);
    } else {
      if (previewAudioRef.current) {
        previewAudioRef.current.pause();
      }
      const audio = new Audio(clip.audioUrl);
      previewAudioRef.current = audio;
      setPreviewClipId(clip.id);
      audio.play().catch((err) => {
        console.warn('Preview error:', err);
        showNotice('error', 'Unable to play this audio link. Verify the URL is directly accessible.');
        setPreviewClipId(null);
      });
      audio.onended = () => setPreviewClipId(null);
      audio.onerror = () => {
        showNotice('error', 'Audio playback error. Check audio URL.');
        setPreviewClipId(null);
      };
    }
  };

  const openAddModal = () => {
    setEditingClipId(null);
    setFormData({
      quote: '',
      audioUrl: '',
      sourceUrl: '',
      date: '',
      verified: false,
      enabled: false,
      audioType: 'direct',
      notes: '',
    });
    setAudioUploadNotice(null);
    setIsModalOpen(true);
  };

  const openEditModal = (clip: AudioQuote) => {
    setEditingClipId(clip.id);
    setFormData({
      quote: clip.quote,
      audioUrl: clip.audioUrl || '',
      sourceUrl: clip.sourceUrl || '',
      date: clip.date || '',
      verified: Boolean(clip.verified),
      enabled: Boolean(clip.enabled),
      audioType: clip.audioType || 'direct',
      notes: clip.notes || '',
    });
    setAudioUploadNotice(null);
    setIsModalOpen(true);
  };

  const handleAudioFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const data = new FormData();
    data.append('audio', file);
    setUploadingAudio(true);
    setAudioUploadNotice(`Uploading ${file.name}...`);

    try {
      const res = await fetch('/api/admin/upload-audio', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: data,
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Audio upload failed');

      setFormData((prev) => ({
        ...prev,
        audioUrl: result.audioUrl,
        audioType: 'upload',
      }));
      setAudioUploadNotice(`Uploaded: ${result.filename} (${(result.size / 1024 / 1024).toFixed(2)} MB)`);
      showNotice('success', 'MP3 file uploaded to server successfully');
    } catch (err: any) {
      showNotice('error', err.message || 'Audio upload failed');
      setAudioUploadNotice(null);
    } finally {
      setUploadingAudio(false);
    }
  };

  const handleSaveQuote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.quote.trim()) {
      showNotice('error', 'Bangla quote text is required');
      return;
    }

    // Important rule: if verifying and publishing, must have matching audio URL
    if (formData.verified && (!formData.audioUrl || !formData.audioUrl.trim())) {
      showNotice('error', 'Each quote requires an authentic matching audio URL before verifying and publishing.');
      return;
    }

    try {
      const method = editingClipId ? 'PUT' : 'POST';
      const endpoint = editingClipId ? `/api/admin/clips/${editingClipId}` : '/api/admin/clips';

      const res = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save quote');

      showNotice('success', editingClipId ? 'Quote updated' : 'New quote added to archive');
      setIsModalOpen(false);
      fetchClips();
      fetchConfig();
    } catch (err: any) {
      showNotice('error', err.message || 'Save failed');
    }
  };

  // Quick verify and publish action
  const handleTogglePublish = async (clip: AudioQuote) => {
    if (!clip.verified || !clip.enabled) {
      // Trying to verify & publish: check if matching audio URL exists
      if (!clip.audioUrl || !clip.audioUrl.trim()) {
        showNotice('error', 'Cannot publish: Attach an authentic MP3 audio URL before verifying this quote.');
        openEditModal(clip);
        return;
      }

      try {
        const res = await fetch(`/api/admin/clips/${clip.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ verified: true, enabled: true }),
        });
        if (!res.ok) throw new Error('Failed to publish quote');
        showNotice('success', 'Quote verified and published to public playlist');
        fetchClips();
        fetchConfig();
      } catch (err: any) {
        showNotice('error', err.message || 'Verification update failed');
      }
    } else {
      // Revert to draft
      try {
        const res = await fetch(`/api/admin/clips/${clip.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ verified: false, enabled: false }),
        });
        if (!res.ok) throw new Error('Failed to revert quote');
        showNotice('success', 'Quote reverted to unverified draft');
        fetchClips();
        fetchConfig();
      } catch (err: any) {
        showNotice('error', err.message || 'Update failed');
      }
    }
  };

  const handleDeleteClip = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this quote from the archive?')) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/clips/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to delete quote');

      showNotice('success', 'Quote removed from archive');
      fetchClips();
      fetchConfig();
    } catch (err: any) {
      showNotice('error', err.message || 'Delete failed');
    }
  };

  const handleMoveOrder = async (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= clips.length) return;

    const newClips = [...clips];
    const temp = newClips[index];
    newClips[index] = newClips[targetIndex];
    newClips[targetIndex] = temp;

    setClips(newClips);

    try {
      const orderedIds = newClips.map((c) => c.id);
      await fetch('/api/admin/clips/reorder', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ orderedIds }),
      });
    } catch (err) {
      fetchClips();
    }
  };

  // Portrait upload
  const handlePortraitUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const data = new FormData();
    data.append('portrait', file);
    setUploadingPortrait(true);

    try {
      const res = await fetch('/api/admin/upload-portrait', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: data,
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Upload failed');

      showNotice('success', "Shaheed Osman Hadi's authentic portrait updated!");
      fetchConfig();
    } catch (err: any) {
      showNotice('error', err.message || 'Portrait upload failed');
    } finally {
      setUploadingPortrait(false);
      if (portraitInputRef.current) portraitInputRef.current.value = '';
    }
  };

  const handleResetPortrait = async () => {
    if (!window.confirm('Reset portrait to the archival placeholder frame?')) return;

    try {
      const res = await fetch('/api/admin/reset-portrait', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Reset failed');

      showNotice('success', 'Portrait reset to archival placeholder frame');
      fetchConfig();
    } catch (err: any) {
      showNotice('error', err.message || 'Reset failed');
    }
  };

  // Change password
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword || !newPassword) {
      showNotice('error', 'All password fields are required');
      return;
    }
    if (newPassword !== confirmPassword) {
      showNotice('error', 'New passwords do not match');
      return;
    }
    if (newPassword.length < 6) {
      showNotice('error', 'Password must be at least 6 characters');
      return;
    }

    setPasswordLoading(true);
    try {
      const res = await fetch('/api/admin/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Password update failed');

      showNotice('success', 'Admin password changed successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      showNotice('error', err.message || 'Password update failed');
    } finally {
      setPasswordLoading(false);
    }
  };

  // Filtered quotes
  const draftCount = clips.filter((c) => !c.verified || !c.audioUrl || !c.audioUrl.trim()).length;
  const verifiedCount = clips.filter((c) => c.verified && c.enabled && Boolean(c.audioUrl && c.audioUrl.trim())).length;

  const filteredClips = clips.filter((clip) => {
    const isLive = clip.verified && clip.enabled && Boolean(clip.audioUrl && clip.audioUrl.trim());
    if (quoteFilter === 'draft' && isLive) return false;
    if (quoteFilter === 'verified' && !isLive) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchQuote = clip.quote.toLowerCase().includes(q);
      const matchSource = (clip.sourceUrl || '').toLowerCase().includes(q);
      const matchAudio = (clip.audioUrl || '').toLowerCase().includes(q);
      const matchId = String(clip.id).includes(q);
      return matchQuote || matchSource || matchAudio || matchId;
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-[#080808] text-white flex flex-col font-sans">
      {/* Admin Top Navigation */}
      <header className="border-b border-neutral-800 bg-neutral-950/90 backdrop-blur sticky top-0 z-30 px-4 sm:px-8 py-3.5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="font-cinzel text-sm sm:text-base font-bold tracking-[0.2em] text-[#D71920]">
            WHO IS HADI?
          </span>
          <span className="text-xs text-neutral-400 uppercase tracking-wider border-l border-neutral-700 pl-3">
            Digital Voice Archive Admin
          </span>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onViewPublic}
            className="px-3 py-1.5 text-xs text-neutral-300 hover:text-white border border-neutral-700 hover:border-neutral-500 rounded transition-colors whitespace-nowrap"
          >
            ← View Public Memorial
          </button>
          <button
            onClick={onLogout}
            className="px-3 py-1.5 text-xs text-red-400 hover:text-red-300 transition-colors whitespace-nowrap"
          >
            Sign Out
          </button>
        </div>
      </header>

      {/* Floating Notification */}
      {notification && (
        <div
          role="alert"
          className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-lg text-xs tracking-wide shadow-xl border backdrop-blur-md transition-all ${
            notification.type === 'success'
              ? 'bg-neutral-900/95 border-emerald-500/60 text-emerald-300'
              : 'bg-neutral-900/95 border-red-500/60 text-red-300'
          }`}
        >
          {notification.message}
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-8">
        {/* Statistics Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="bg-neutral-950/70 border border-neutral-800 rounded-xl p-4">
            <span className="text-xs text-neutral-500 uppercase tracking-wider block">Total Candidate Quotes</span>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-white font-mono">{clips.length}</span>
              <span className="text-xs text-neutral-400">collected drafts</span>
            </div>
          </div>

          <div className="bg-neutral-950/70 border border-neutral-800 rounded-xl p-4">
            <span className="text-xs text-amber-500/90 uppercase tracking-wider block">Drafts Awaiting Audio</span>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-amber-400 font-mono">{draftCount}</span>
              <span className="text-xs text-neutral-400">pending verification</span>
            </div>
          </div>

          <div className="bg-neutral-950/70 border border-neutral-800 rounded-xl p-4">
            <span className="text-xs text-emerald-500/90 uppercase tracking-wider block">Verified & Live Playlist</span>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-emerald-400 font-mono">{verifiedCount}</span>
              <span className="text-xs text-neutral-400">in public rotation</span>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 border-b border-neutral-800 pb-3 mb-8 overflow-x-auto">
          <button
            onClick={() => setActiveTab('quotes')}
            className={`px-4 py-2 text-xs font-medium rounded transition-colors uppercase tracking-wider ${
              activeTab === 'quotes'
                ? 'bg-[#D71920] text-white'
                : 'text-neutral-400 hover:text-white bg-neutral-900'
            }`}
          >
            Quotes & Voice Archive ({clips.length})
          </button>
          <button
            onClick={() => setActiveTab('portrait')}
            className={`px-4 py-2 text-xs font-medium rounded transition-colors uppercase tracking-wider ${
              activeTab === 'portrait'
                ? 'bg-[#D71920] text-white'
                : 'text-neutral-400 hover:text-white bg-neutral-900'
            }`}
          >
            Portrait Management {siteConfig?.placeholderUsed ? '(Placeholder)' : '(Authentic Active)'}
          </button>
          <button
            onClick={() => setActiveTab('security')}
            className={`px-4 py-2 text-xs font-medium rounded transition-colors uppercase tracking-wider ${
              activeTab === 'security'
                ? 'bg-[#D71920] text-white'
                : 'text-neutral-400 hover:text-white bg-neutral-900'
            }`}
          >
            Security & Password
          </button>
        </div>

        {/* TAB 1: Quotes & Voice Archive */}
        {activeTab === 'quotes' && (
          <div className="space-y-6">
            {/* Header with Search and Add Action */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-cinzel font-bold text-white tracking-wide">
                  Candidate Quotes & Audio Verification
                </h2>
                <p className="text-xs text-neutral-400 mt-1">
                  Each quote must have verified authentic audio before it is included in the public "WHO IS HADI?" button playlist.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={openAddModal}
                  className="px-4 py-2.5 bg-[#D71920] hover:bg-[#b8141a] text-white text-xs font-cinzel font-bold tracking-widest uppercase rounded shadow transition-colors shrink-0"
                >
                  + Add New Quote
                </button>
              </div>
            </div>

            {/* Filter and Search Bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-neutral-950/60 border border-neutral-800 p-3 rounded-lg">
              {/* Segmented Filter Buttons */}
              <div className="flex items-center gap-1.5 p-1 bg-neutral-900 rounded-md">
                <button
                  onClick={() => setQuoteFilter('all')}
                  className={`px-3 py-1.5 text-xs rounded transition-colors ${
                    quoteFilter === 'all'
                      ? 'bg-neutral-800 text-white font-medium'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  All ({clips.length})
                </button>
                <button
                  onClick={() => setQuoteFilter('draft')}
                  className={`px-3 py-1.5 text-xs rounded transition-colors ${
                    quoteFilter === 'draft'
                      ? 'bg-amber-950/80 text-amber-300 font-medium'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  Drafts ({draftCount})
                </button>
                <button
                  onClick={() => setQuoteFilter('verified')}
                  className={`px-3 py-1.5 text-xs rounded transition-colors ${
                    quoteFilter === 'verified'
                      ? 'bg-emerald-950/80 text-emerald-300 font-medium'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  Verified Live ({verifiedCount})
                </button>
              </div>

              {/* Search Field */}
              <div className="relative w-full sm:w-72">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search quote text or source..."
                  className="w-full px-3 py-1.5 bg-black/60 border border-neutral-800 rounded text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-[#D71920]"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-neutral-400 hover:text-white"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>

            {/* Quotes List */}
            {loading ? (
              <div className="p-12 text-center text-neutral-500 text-sm">
                Loading candidate quotes archive...
              </div>
            ) : filteredClips.length === 0 ? (
              <div className="border border-neutral-800 rounded-xl p-12 text-center bg-neutral-950/40">
                <p className="text-neutral-300 text-sm mb-2">No quotes found matching current filter.</p>
                <p className="text-xs text-neutral-500">
                  Try switching filters or search terms, or add a new candidate quote.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredClips.map((clip, index) => {
                  const hasAudio = Boolean(clip.audioUrl && clip.audioUrl.trim());
                  const isLive = clip.verified && clip.enabled && hasAudio;

                  return (
                    <div
                      key={clip.id}
                      className={`border rounded-xl p-4 sm:p-5 transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-4 ${
                        isLive
                          ? 'border-neutral-800 bg-neutral-950/70 hover:border-neutral-700'
                          : 'border-neutral-900 bg-black/60 hover:border-neutral-800'
                      }`}
                    >
                      {/* Left: Number, Status & Quote */}
                      <div className="flex-1 space-y-2.5">
                        {/* Status row: zero-pill typography */}
                        <div className="flex flex-wrap items-center gap-2 text-xs">
                          <span className="font-mono text-neutral-500 font-semibold">#{clip.id}</span>
                          <span aria-hidden="true" className="text-neutral-700">·</span>

                          {isLive ? (
                            <span className="text-emerald-400 font-medium">Verified & Live</span>
                          ) : (
                            <span className="text-amber-400">
                              Draft · {hasAudio ? 'Audio Attached (Awaiting Publish)' : 'Awaiting MP3 Audio'}
                            </span>
                          )}

                          {clip.date && (
                            <>
                              <span aria-hidden="true" className="text-neutral-700">·</span>
                              <span className="text-neutral-400">{clip.date}</span>
                            </>
                          )}
                        </div>

                        {/* Prominent White Bangla Quote Text */}
                        <p className="font-bangla text-lg sm:text-xl text-white font-medium leading-relaxed">
                          “{clip.quote}”
                        </p>

                        {/* Audio & Source details */}
                        <div className="flex flex-wrap items-center gap-3 text-xs text-neutral-400">
                          {hasAudio ? (
                            <span className="font-mono text-neutral-300 truncate max-w-sm">
                              Audio: {clip.audioUrl}
                            </span>
                          ) : (
                            <span className="text-neutral-500 italic">
                              No MP3 audio attached yet
                            </span>
                          )}

                          {clip.sourceUrl && (
                            <>
                              <span aria-hidden="true" className="text-neutral-700">·</span>
                              <a
                                href={clip.sourceUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-neutral-400 hover:text-white underline underline-offset-2"
                              >
                                Source Provenance Link
                              </a>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Right: Actions */}
                      <div className="flex flex-wrap items-center gap-2 shrink-0 border-t lg:border-t-0 pt-3 lg:pt-0 border-neutral-850">
                        {/* Audio Preview button */}
                        {hasAudio ? (
                          <button
                            onClick={() => togglePreview(clip)}
                            className={`px-3 py-1.5 text-xs rounded transition-colors font-medium ${
                              previewClipId === clip.id
                                ? 'bg-[#D71920] text-white'
                                : 'bg-neutral-900 hover:bg-neutral-800 text-neutral-200'
                            }`}
                            title="Preview audio in browser"
                          >
                            {previewClipId === clip.id ? '■ Stop Audio' : '▶ Preview MP3'}
                          </button>
                        ) : (
                          <button
                            onClick={() => openEditModal(clip)}
                            className="px-3 py-1.5 text-xs bg-neutral-900/60 hover:bg-neutral-800 text-neutral-400 hover:text-neutral-200 rounded transition-colors"
                            title="Add matching MP3 audio URL"
                          >
                            + Attach MP3
                          </button>
                        )}

                        {/* Verify & Publish / Revert Button */}
                        <button
                          onClick={() => handleTogglePublish(clip)}
                          className={`px-3 py-1.5 text-xs rounded transition-colors font-medium ${
                            isLive
                              ? 'bg-neutral-900 hover:bg-neutral-800 text-amber-300'
                              : 'bg-emerald-950/70 hover:bg-emerald-900 text-emerald-200 border border-emerald-800/60'
                          }`}
                          title={isLive ? 'Revert to unverified draft' : 'Verify wording and publish to public playlist'}
                        >
                          {isLive ? 'Revert to Draft' : 'Verify & Publish'}
                        </button>

                        {/* Reorder Buttons */}
                        <button
                          onClick={() => handleMoveOrder(index, 'up')}
                          disabled={index === 0}
                          className="px-2 py-1.5 text-xs bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-white rounded disabled:opacity-30 disabled:pointer-events-none"
                          title="Move Up in Sequence"
                        >
                          ▲
                        </button>
                        <button
                          onClick={() => handleMoveOrder(index, 'down')}
                          disabled={index === filteredClips.length - 1}
                          className="px-2 py-1.5 text-xs bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-white rounded disabled:opacity-30 disabled:pointer-events-none"
                          title="Move Down in Sequence"
                        >
                          ▼
                        </button>

                        {/* Edit Button */}
                        <button
                          onClick={() => openEditModal(clip)}
                          className="px-3 py-1.5 text-xs bg-neutral-900 hover:bg-neutral-800 text-neutral-300 rounded transition-colors"
                        >
                          Edit
                        </button>

                        {/* Delete Button */}
                        <button
                          onClick={() => handleDeleteClip(clip.id)}
                          className="px-2.5 py-1.5 text-xs text-red-400 hover:text-red-300 hover:bg-red-950/40 rounded transition-colors"
                          title="Delete quote"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: Portrait Management */}
        {activeTab === 'portrait' && (
          <div className="max-w-2xl mx-auto space-y-8 bg-neutral-950/60 border border-neutral-800 rounded-xl p-6 sm:p-8">
            <div>
              <h2 className="text-xl font-cinzel font-bold text-white tracking-wide">
                Authentic Portrait Management
              </h2>
              <p className="text-xs text-neutral-400 mt-1">
                Upload or replace the portrait of Shaheed Osman Hadi. The website renders the image using{' '}
                <code className="text-neutral-300 font-mono">object-fit: contain</code> to preserve full facial features without cropping.
              </p>
            </div>

            {/* Current Portrait Status */}
            <div className="border border-neutral-800 rounded-lg p-6 bg-black/40 flex flex-col sm:flex-row items-center gap-6">
              <div className="w-36 h-44 rounded border border-neutral-700 bg-neutral-900 overflow-hidden flex items-center justify-center relative shrink-0">
                {siteConfig?.portraitUrl && !siteConfig.placeholderUsed ? (
                  <img
                    src={siteConfig.portraitUrl}
                    alt="Current portrait"
                    className="w-full h-full object-contain filter grayscale contrast-110"
                  />
                ) : (
                  <div className="text-center p-3 text-neutral-500 text-xs">
                    Archival Silhouette Active
                  </div>
                )}
              </div>

              <div className="space-y-2 text-center sm:text-left">
                <span className="text-xs uppercase tracking-wider text-neutral-400 block">
                  Current Status
                </span>
                <p className="text-sm font-semibold text-white">
                  {siteConfig?.portraitUrl && !siteConfig.placeholderUsed
                    ? 'Authentic Portrait is Live'
                    : 'Archival Placeholder Frame Active (Upload authentic photo below)'}
                </p>
                {siteConfig?.updatedAt && (
                  <p className="text-xs text-neutral-500">
                    Last updated: {new Date(siteConfig.updatedAt).toLocaleString()}
                  </p>
                )}
              </div>
            </div>

            {/* Upload controls */}
            <div className="space-y-4">
              <label className="block text-xs uppercase tracking-wider text-neutral-300">
                Upload New Authentic Portrait (JPG, PNG, WebP)
              </label>

              <div className="flex flex-col sm:flex-row items-center gap-3">
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  ref={portraitInputRef}
                  onChange={handlePortraitUpload}
                  disabled={uploadingPortrait}
                  className="w-full text-xs text-neutral-400 file:mr-4 file:py-2.5 file:px-4 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-neutral-800 file:text-neutral-200 hover:file:bg-neutral-700 cursor-pointer"
                />

                {siteConfig?.portraitUrl && !siteConfig.placeholderUsed && (
                  <button
                    onClick={handleResetPortrait}
                    className="px-4 py-2 text-xs text-red-400 hover:text-red-300 border border-neutral-800 hover:border-red-900 rounded transition-colors whitespace-nowrap"
                  >
                    Reset to Placeholder
                  </button>
                )}
              </div>

              {uploadingPortrait && (
                <p className="text-xs text-neutral-400 animate-pulse">
                  Uploading and processing authentic portrait...
                </p>
              )}
            </div>

            {/* Guidelines */}
            <div className="border-t border-neutral-800 pt-6 text-xs text-neutral-400 space-y-2">
              <p className="font-semibold text-neutral-300">Design Specifications:</p>
              <ul className="list-disc list-inside space-y-1 text-neutral-500">
                <li>High-resolution authentic photo of Shaheed Osman Hadi.</li>
                <li>The website automatically applies subtle grayscale and cinematic lighting tone.</li>
                <li>Face is never cropped; fully contained with graceful soft radial background blend.</li>
              </ul>
            </div>

            {/* Theme Song Configuration */}
            <div className="border-t border-neutral-800 pt-6 space-y-4">
              <div>
                <h3 className="text-sm font-cinzel font-bold text-white uppercase tracking-wider">
                  Site Theme Song (Autoplay on Entry)
                </h3>
                <p className="text-xs text-neutral-400 mt-1">
                  Audio that automatically plays in the background when visitors enter the site. Pauses when voice quotes are played.
                </p>
              </div>

              <div className="space-y-3">
                <input
                  type="text"
                  value={themeSongInput}
                  onChange={(e) => setThemeSongInput(e.target.value)}
                  placeholder="https://.../theme_song.mp3"
                  className="w-full px-3.5 py-2.5 bg-black/60 border border-neutral-800 rounded text-xs text-white font-mono focus:outline-none focus:border-[#D71920]"
                />

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handleSaveThemeSong}
                    disabled={savingThemeSong}
                    className="px-4 py-2 bg-[#D71920] hover:bg-[#b8141a] text-white text-xs font-cinzel font-semibold rounded transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    {savingThemeSong ? 'Saving...' : 'Save Theme Song URL'}
                  </button>

                  {themeSongInput && (
                    <button
                      type="button"
                      onClick={() => togglePreview({ id: -1, audioUrl: themeSongInput, quote: 'Theme Song', verified: true, enabled: true, order: 0, createdAt: '' })}
                      className="px-3 py-2 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 text-xs rounded transition-colors cursor-pointer"
                    >
                      {previewClipId === -1 ? '■ Stop Test' : '▶ Test Play Theme'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: Security & Password */}
        {activeTab === 'security' && (
          <div className="max-w-md mx-auto bg-neutral-950/60 border border-neutral-800 rounded-xl p-6 sm:p-8 space-y-6">
            <div>
              <h2 className="text-xl font-cinzel font-bold text-white tracking-wide">
                Security Settings
              </h2>
              <p className="text-xs text-neutral-400 mt-1">
                Update the administrator password to protect the digital archive.
              </p>
            </div>

            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="block text-xs uppercase tracking-wider text-neutral-300 mb-1.5">
                  Current Password
                </label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter current password..."
                  className="w-full px-3.5 py-2.5 bg-black/60 border border-neutral-800 rounded text-sm text-white focus:outline-none focus:border-[#D71920]"
                />
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wider text-neutral-300 mb-1.5">
                  New Password (min 6 characters)
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password..."
                  className="w-full px-3.5 py-2.5 bg-black/60 border border-neutral-800 rounded text-sm text-white focus:outline-none focus:border-[#D71920]"
                />
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wider text-neutral-300 mb-1.5">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat new password..."
                  className="w-full px-3.5 py-2.5 bg-black/60 border border-neutral-800 rounded text-sm text-white focus:outline-none focus:border-[#D71920]"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={passwordLoading}
                  className="w-full py-2.5 bg-[#D71920] hover:bg-[#b8141a] text-white text-xs font-cinzel font-semibold tracking-wider rounded transition-colors disabled:opacity-50"
                >
                  {passwordLoading ? 'SAVING...' : 'UPDATE PASSWORD'}
                </button>
              </div>
            </form>
          </div>
        )}
      </main>

      {/* Modal: Add / Edit Quote */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl max-w-xl w-full p-6 sm:p-8 space-y-6 my-8">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-4">
              <h3 className="font-cinzel text-lg font-bold text-white tracking-wide">
                {editingClipId ? 'Edit Quote & Audio' : 'Add Candidate Quote'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-neutral-400 hover:text-white text-lg leading-none"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveQuote} className="space-y-4">
              {/* Bangla Quote Input */}
              <div>
                <label className="block text-xs uppercase tracking-wider text-neutral-300 mb-1.5">
                  উক্তি (বাংলায়) / Bangla Quote Text <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={3}
                  value={formData.quote}
                  onChange={(e) => setFormData({ ...formData, quote: e.target.value })}
                  placeholder="শহীদ ওসমান হাদীর বক্তব্য বা উক্তি লিখুন..."
                  required
                  className="w-full px-3.5 py-2.5 bg-black/60 border border-neutral-800 rounded text-base text-white font-bangla focus:outline-none focus:border-[#D71920]"
                />
              </div>

              {/* Matching Audio Section */}
              <div className="space-y-3 p-4 bg-black/40 border border-neutral-800 rounded-lg">
                <div className="flex items-center justify-between">
                  <label className="block text-xs uppercase tracking-wider text-neutral-300">
                    Matching MP3 Audio URL / File
                  </label>
                  <span className="text-[11px] text-neutral-400">
                    Required for public verification
                  </span>
                </div>

                {/* Upload File Button */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <label className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-xs text-neutral-200 rounded cursor-pointer transition-colors">
                      Upload MP3 / Audio File
                      <input
                        type="file"
                        accept="audio/*,.mp3,.wav,.ogg,.m4a"
                        onChange={handleAudioFileUpload}
                        disabled={uploadingAudio}
                        className="hidden"
                      />
                    </label>
                    <span className="text-xs text-neutral-500">or paste direct URL below</span>
                  </div>

                  {audioUploadNotice && (
                    <p className="text-xs text-emerald-400">
                      {audioUploadNotice}
                    </p>
                  )}
                </div>

                {/* Direct audio URL */}
                <div>
                  <input
                    type="text"
                    value={formData.audioUrl}
                    onChange={(e) => setFormData({ ...formData, audioUrl: e.target.value })}
                    placeholder="https://example.com/recording.mp3 or /uploads/..."
                    className="w-full px-3.5 py-2.5 bg-black/80 border border-neutral-800 rounded text-xs text-white font-mono focus:outline-none focus:border-[#D71920]"
                  />
                </div>
              </div>

              {/* Date & Source URL */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs uppercase tracking-wider text-neutral-300 mb-1.5">
                    Recording Date / Context
                  </label>
                  <input
                    type="text"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    placeholder="e.g. ২০২৪ or জুলাই ২০২৪"
                    className="w-full px-3.5 py-2.5 bg-black/60 border border-neutral-800 rounded text-xs text-white focus:outline-none focus:border-[#D71920]"
                  />
                </div>

                <div>
                  <label className="block text-xs uppercase tracking-wider text-neutral-300 mb-1.5">
                    Original Source URL
                  </label>
                  <input
                    type="url"
                    value={formData.sourceUrl}
                    onChange={(e) => setFormData({ ...formData, sourceUrl: e.target.value })}
                    placeholder="https://original-source-link.com"
                    className="w-full px-3.5 py-2.5 bg-black/60 border border-neutral-800 rounded text-xs text-white focus:outline-none focus:border-[#D71920]"
                  />
                </div>
              </div>

              {/* Verification & Publication Checkboxes */}
              <div className="space-y-2 p-3 bg-black/30 border border-neutral-800 rounded-lg">
                <label className="flex items-center gap-2 text-xs text-neutral-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.verified}
                    onChange={(e) => {
                      const next = e.target.checked;
                      setFormData({
                        ...formData,
                        verified: next,
                        enabled: next ? true : formData.enabled,
                      });
                    }}
                    className="accent-[#D71920] w-4 h-4 rounded"
                  />
                  <span>Mark wording as verified and authentic</span>
                </label>

                <label className="flex items-center gap-2 text-xs text-neutral-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.enabled}
                    onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
                    className="accent-[#D71920] w-4 h-4 rounded"
                  />
                  <span>Include in active public memorial playlist</span>
                </label>

                <p className="text-[11px] text-neutral-500 pt-1">
                  Note: A quote will only be played to visitors if both verified and active, with matching MP3 audio attached.
                </p>
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-neutral-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs text-neutral-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-[#D71920] hover:bg-[#b8141a] text-white text-xs font-cinzel font-semibold tracking-wider rounded transition-colors"
                >
                  {editingClipId ? 'Save Quote' : 'Add to Archive'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
