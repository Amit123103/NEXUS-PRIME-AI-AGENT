// ═══════════════════════════════════════════════
// NEXUS PRIME OMEGA — Agent Page JavaScript
// Streaming chat, history, profile, file upload
// ═══════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', () => {
  const API = 'http://localhost:3005';
  let currentChatId = null;
  let currentUser = null;
  let uploadedFile = null;
  let isStreaming = false;

  // ── Auth Guard ──────────────────────────────
  const token = localStorage.getItem('nexus_token');
  if (!token) {
    window.location.href = 'index.html';
    return;
  }

  // ── API Helper ──────────────────────────────
  const apiFetch = async (url, options = {}) => {
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...options.headers
    };
    if (options.body instanceof FormData) {
      delete headers['Content-Type'];
    }
    const res = await fetch(`${API}${url}`, { ...options, headers });
    if (res.status === 401) {
      localStorage.removeItem('nexus_token');
      localStorage.removeItem('nexus_refresh');
      localStorage.removeItem('nexus_user');
      window.location.href = 'index.html';
      return null;
    }
    return res;
  };

  // ── Elements ────────────────────────────────
  const sidebar = document.getElementById('sidebar');
  const sidebarOpen = document.getElementById('sidebarOpen');
  const sidebarClose = document.getElementById('sidebarClose');
  const newChatBtn = document.getElementById('newChatBtn');
  const profileCard = document.getElementById('profileCard');
  const chatArea = document.getElementById('chatArea');
  const welcomeScreen = document.getElementById('welcomeScreen');
  const messagesContainer = document.getElementById('messagesContainer');
  const messageInput = document.getElementById('messageInput');
  const sendBtn = document.getElementById('sendBtn');
  const fileInput = document.getElementById('fileInput');
  const filePreview = document.getElementById('filePreview');
  const filePreviewName = document.getElementById('filePreviewName');
  const filePreviewRemove = document.getElementById('filePreviewRemove');
  const logoutBtn = document.getElementById('logoutBtn');
  const profileModal = document.getElementById('profileModal');
  const profileModalClose = document.getElementById('profileModalClose');
  const historyToday = document.getElementById('historyToday');
  const historyOlder = document.getElementById('historyOlder');

  // New Profile Elements
  const editProfileBtn = document.getElementById('editProfileBtn');
  const editProfileModal = document.getElementById('editProfileModal');
  const editProfileClose = document.getElementById('editProfileClose');
  const saveProfileBtn = document.getElementById('saveProfileBtn');
  
  const editFullName = document.getElementById('editFullName');
  const editBio = document.getElementById('editBio');
  const editLocation = document.getElementById('editLocation');
  const editGithub = document.getElementById('editGithub');
  const editTwitter = document.getElementById('editTwitter');

  const galleryModal = document.getElementById('galleryModal');
  const galleryModalClose = document.getElementById('galleryModalClose');
  const galleryGrid = document.getElementById('galleryGrid');
  const galleryTitle = document.getElementById('galleryTitle');
  const galleryEmpty = document.getElementById('galleryEmpty');

  // ── Load User ───────────────────────────────
  const loadUser = () => {
    try {
      currentUser = JSON.parse(localStorage.getItem('nexus_user'));
      if (!currentUser) return;

      const initials = currentUser.fullName
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .substring(0, 2);

      document.getElementById('profileAvatar').textContent = initials;
      document.getElementById('profileName').textContent = currentUser.fullName;
      document.getElementById('profileRole').textContent = currentUser.role;
      document.getElementById('welcomeName').textContent = currentUser.fullName.split(' ')[0];

      // Modal Details
      document.getElementById('modalAvatar').textContent = initials;
      document.getElementById('modalName').textContent = currentUser.fullName;
      document.getElementById('modalUsername').textContent = `@${currentUser.username}`;
      document.getElementById('modalRole').textContent = (currentUser.role || 'USER').toUpperCase();
      document.getElementById('modalBio').textContent = currentUser.bio || 'A superintelligent agent user.';
      document.getElementById('modalLocation').textContent = currentUser.location || 'Global';

      // Social Links
      const github = currentUser.socialLinks?.github;
      const twitter = currentUser.socialLinks?.twitter;
      const website = currentUser.socialLinks?.website;

      const linkGithub = document.getElementById('linkGithub');
      const linkTwitter = document.getElementById('linkTwitter');
      const linkWebsite = document.getElementById('linkWebsite');

      if (github) { linkGithub.href = `https://github.com/${github}`; linkGithub.style.display = 'block'; }
      else linkGithub.style.display = 'none';

      if (twitter) { linkTwitter.href = `https://twitter.com/${twitter}`; linkTwitter.style.display = 'block'; }
      else linkTwitter.style.display = 'none';

      if (website) { linkWebsite.href = website; linkWebsite.style.display = 'block'; }
      else linkWebsite.style.display = 'none';

      // Stats
      document.getElementById('statChats').textContent = currentUser.stats?.totalChats || 0;
      document.getElementById('statMessages').textContent = currentUser.stats?.totalMessages || 0;
      document.getElementById('statImages').textContent = currentUser.stats?.imagesCreated || 0;
      document.getElementById('statResearch').textContent = currentUser.stats?.researchPoints || 0;

      if (currentUser.createdAt) {
        const d = new Date(currentUser.createdAt);
        document.getElementById('modalSince').textContent = `Member since ${d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`;
      }
    } catch (e) {
      console.error('Error loading user:', e);
    }
  };
  loadUser();

  // ── Sidebar Toggle ──────────────────────────
  sidebarOpen?.addEventListener('click', () => sidebar.classList.add('open'));
  sidebarClose?.addEventListener('click', () => sidebar.classList.remove('open'));

  // ── Profile Modal ───────────────────────────
  profileCard.addEventListener('click', async () => { 
    // Fetch latest user data for real-time stats
    try {
      const res = await apiFetch('/api/auth/me');
      if (res && res.ok) {
        const data = await res.json();
        localStorage.setItem('nexus_user', JSON.stringify(data.user));
        loadUser();
      }
    } catch (e) { console.error('Error refreshing profile', e); }
    
    profileModal.style.display = 'flex'; 
  });
  
  profileModalClose.addEventListener('click', () => { profileModal.style.display = 'none'; });
  profileModal.addEventListener('click', (e) => { if (e.target === profileModal) profileModal.style.display = 'none'; });

  // ── Stat Box Interactivity ──────────────────
  document.getElementById('statChats').parentElement.addEventListener('click', () => {
    profileModal.style.display = 'none';
    sidebar.classList.add('open');
    showNotification('Viewing Chat History', 'info');
  });

  document.getElementById('statMessages').parentElement.addEventListener('click', () => {
    showNotification(`You have sent ${currentUser.stats?.totalMessages || 0} messages across all sessions.`, 'info');
  });

  document.getElementById('statImages').parentElement.addEventListener('click', () => {
    openGallery();
  });

  document.getElementById('statResearch').parentElement.addEventListener('click', () => {
    showNotification(`Deep Research Level: ${currentUser.stats?.researchDone || 0} reports | ${currentUser.stats?.researchPoints || 0} XP`, 'success');
  });

  // ── Gallery Logic ───────────────────────────
  const openGallery = async () => {
    galleryTitle.textContent = 'Generated Images';
    galleryGrid.innerHTML = '';
    galleryEmpty.style.display = 'none';
    galleryModal.style.display = 'flex';
    
    try {
      const res = await apiFetch('/api/image/gallery');
      const data = await res.json();
      
      if (data.images && data.images.length > 0) {
        data.images.forEach(img => {
          const item = document.createElement('div');
          item.className = 'gallery-item';
          item.innerHTML = `
            <img src="${img.url}" alt="${escapeHtml(img.prompt)}" loading="lazy">
            <div class="gallery-item-info">${escapeHtml(img.prompt)}</div>
          `;
          item.addEventListener('click', () => window.open(img.url, '_blank'));
          galleryGrid.appendChild(item);
        });
      } else {
        galleryEmpty.style.display = 'block';
      }
    } catch (e) {
      console.error('Gallery fetch error', e);
      galleryEmpty.style.display = 'block';
    }
  };

  galleryModalClose?.addEventListener('click', () => { galleryModal.style.display = 'none'; });
  galleryModal.addEventListener('click', (e) => { if (e.target === galleryModal) galleryModal.style.display = 'none'; });

  // ── Edit Profile Logic ──────────────────────
  editProfileBtn?.addEventListener('click', () => {
    editFullName.value = currentUser.fullName;
    editBio.value = currentUser.bio || '';
    editLocation.value = currentUser.location || '';
    editGithub.value = currentUser.socialLinks?.github || '';
    editTwitter.value = currentUser.socialLinks?.twitter || '';
    
    editProfileModal.style.display = 'flex';
  });

  editProfileClose?.addEventListener('click', () => editProfileModal.style.display = 'none');
  
  saveProfileBtn?.addEventListener('click', async () => {
    const updatedData = {
      fullName: editFullName.value.trim(),
      bio: editBio.value.trim(),
      location: editLocation.value.trim(),
      socialLinks: {
        github: editGithub.value.trim(),
        twitter: editTwitter.value.trim()
      }
    };

    try {
      const res = await apiFetch('/api/auth/profile', {
        method: 'PUT',
        body: JSON.stringify(updatedData)
      });

      if (res && res.ok) {
        const data = await res.json();
        localStorage.setItem('nexus_user', JSON.stringify(data.user));
        loadUser();
        editProfileModal.style.display = 'none';
        showNotification('Profile updated successfully!', 'success');
      } else {
        showNotification('Failed to update profile', 'error');
      }
    } catch (e) {
      console.error('Update profile error', e);
      showNotification('Error updating profile', 'error');
    }
  });

  // ── Auto-resize Textarea ────────────────────
  messageInput.addEventListener('input', () => {
    messageInput.style.height = 'auto';
    messageInput.style.height = Math.min(messageInput.scrollHeight, 150) + 'px';
    sendBtn.disabled = !messageInput.value.trim() || isStreaming;
  });

  // ── Enter to Send ────────────────────────────
  messageInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey && !isStreaming) {
      e.preventDefault();
      if (messageInput.value.trim()) sendMessage();
    }
  });

  sendBtn.addEventListener('click', () => {
    if (messageInput.value.trim() && !isStreaming) sendMessage();
  });

  // ── Plus Menu Toggle ──────────────────────────
  const plusBtn = document.getElementById('plusBtn');
  const actionsMenu = document.getElementById('actionsMenu');

  plusBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    const isOpen = actionsMenu.classList.toggle('open');
    plusBtn.classList.toggle('menu-open', isOpen);
  });

  // Close menu when clicking outside
  document.addEventListener('click', (e) => {
    if (actionsMenu && !actionsMenu.contains(e.target) && e.target !== plusBtn) {
      actionsMenu.classList.remove('open');
      plusBtn.classList.remove('menu-open');
    }
  });

  // Helper: close menu after selecting an action (except TTS toggle)
  const closeMenu = () => {
    actionsMenu?.classList.remove('open');
    plusBtn?.classList.remove('menu-open');
  };

  // ── Native Voice Recognition (ASR) ─────────────────────────
  const micBtn = document.getElementById('micBtn');
  let recognition = null;
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

  if (SpeechRecognition) {
    recognition = new SpeechRecognition();
    recognition.continuous = false;
    // Set to true to see words appearing in real-time as you speak
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event) => {
      let interimTranscript = '';
      let finalTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        } else {
          interimTranscript += event.results[i][0].transcript;
        }
      }
      
      // Clean up previous interim tags
      const currentVal = messageInput.value.replace(/ \[[^\]]+\]$/, '');
      if (finalTranscript) {
        messageInput.value = (currentVal + ' ' + finalTranscript).trim();
      } else {
        messageInput.value = currentVal + (interimTranscript ? ` [${interimTranscript}]` : '');
      }
      
      messageInput.style.height = 'auto';
      messageInput.style.height = messageInput.scrollHeight + 'px';
      sendBtn.disabled = !messageInput.value.trim();
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      micBtn.classList.remove('recording');
      micBtn.title = 'Use voice (ASR)';
      messageInput.value = messageInput.value.replace(/ \[[^\]]+\]$/, '');
      if(event.error !== 'aborted' && event.error !== 'no-speech') {
        alert('Voice recognition failed: ' + event.error);
      }
    };

    recognition.onend = () => {
      micBtn.classList.remove('recording');
      micBtn.title = 'Use voice (ASR)';
      messageInput.value = messageInput.value.replace(/ \[[^\]]+\]$/, '');
    };

    micBtn?.addEventListener('click', () => {
      closeMenu();
      if (micBtn.classList.contains('recording')) {
        recognition.stop();
      } else {
        try {
          recognition.start();
          micBtn.classList.add('recording');
          micBtn.title = 'Stop Recording';
          messageInput.focus();
        } catch(e) { console.error('Recognition start error', e); }
      }
    });
  } else {
    micBtn?.addEventListener('click', () => {
      alert('Your browser does not support Native Speech Recognition. Please use Google Chrome, Edge, or Safari.');
    });
  }

  // ── File Upload ──────────────────────────────
  fileInput.addEventListener('change', (e) => {
    closeMenu();
    const file = e.target.files[0];
    if (!file) return;
    uploadedFile = file;
    filePreviewName.textContent = `📎 ${file.name} (${(file.size / 1024).toFixed(1)} KB)`;
    filePreview.style.display = 'block';
  });

  filePreviewRemove.addEventListener('click', () => {
    uploadedFile = null;
    fileInput.value = '';
    filePreview.style.display = 'none';
  });

  // ── Prompt Chips ─────────────────────────────
  document.querySelectorAll('.chip').forEach(chip => {
    chip.addEventListener('click', () => {
      messageInput.value = chip.dataset.prompt;
      messageInput.style.height = 'auto';
      messageInput.style.height = messageInput.scrollHeight + 'px';
      sendBtn.disabled = false;
      messageInput.focus();
    });
  });

  // ── Image Generation ─────────────────────────
  const imageGenBtn = document.getElementById('imageGenBtn');

  imageGenBtn?.addEventListener('click', () => {
    closeMenu();
    const currentText = messageInput.value.trim();
    if (currentText) {
      generateImage(currentText);
    } else {
      messageInput.placeholder = 'Describe the image you want to generate...';
      messageInput.dataset.mode = 'image';
      messageInput.focus();
    }
  });

  const generateImage = async (prompt) => {
    if (isStreaming) return;
    isStreaming = true;
    messageInput.value = '';
    messageInput.style.height = 'auto';
    sendBtn.disabled = true;
    messageInput.placeholder = 'Message NEXUS PRIME OMEGA AI AGENT...';
    messageInput.dataset.mode = '';
    if (imageGenBtn) {
      imageGenBtn.style.borderColor = '';
      imageGenBtn.style.color = '';
    }
    if (videoGenBtn) {
      videoGenBtn.style.borderColor = '';
      videoGenBtn.style.color = '';
    }

    addMessage('user', `🎨 Generate image: ${prompt}`);

    // Show generating indicator
    welcomeScreen.classList.add('hidden');
    messagesContainer.style.display = 'flex';
    const genDiv = document.createElement('div');
    genDiv.className = 'message assistant';
    genDiv.id = 'imageGenerating';
    genDiv.innerHTML = `
      <div class="message-avatar">⚡</div>
      <div class="message-content">
        <div class="message-bubble">
          <div class="image-generating">
            <div class="gen-spinner"></div>
            <span>Generating image...</span>
          </div>
        </div>
      </div>
    `;
    messagesContainer.appendChild(genDiv);
    chatArea.scrollTop = chatArea.scrollHeight;

    try {
      const res = await apiFetch('/api/image/generate', {
        method: 'POST',
        body: JSON.stringify({ prompt })
      });

      // Remove generating indicator
      const genEl = document.getElementById('imageGenerating');
      if (genEl) genEl.remove();

      if (!res) return;
      const data = await res.json();

      if (res.ok && data.imageUrl) {
        // Show generated image
        const imgMsg = document.createElement('div');
        imgMsg.className = 'message assistant';
        imgMsg.innerHTML = `
          <div class="message-avatar">⚡</div>
          <div class="message-content">
            <div class="message-bubble">
              <p><strong>🎨 Image Generated</strong></p>
              <div class="generated-image-container">
                <img src="${data.imageUrl}" alt="${escapeHtml(prompt)}" class="generated-image" onclick="window.open('${data.imageUrl}', '_blank')" />
              </div>
              <p class="image-prompt-caption"><em>"${escapeHtml(prompt)}"</em></p>
              <a href="${data.imageUrl}" download class="image-download-btn">⬇ Download Image</a>
            </div>
            <div class="message-time">${formatTime(new Date())}</div>
          </div>
        `;
        messagesContainer.appendChild(imgMsg);
        chatArea.scrollTop = chatArea.scrollHeight;
      } else {
        addMessage('assistant', `⚠️ Image generation failed: ${data.message || 'Unknown error'}`);
      }
    } catch (error) {
      const genEl = document.getElementById('imageGenerating');
      if (genEl) genEl.remove();
      addMessage('assistant', `⚠️ Image generation error: ${error.message}`);
      console.error('Image gen error:', error);
    } finally {
      isStreaming = false;
      sendBtn.disabled = !messageInput.value.trim();
    }
  };

  // ── Video Generation ─────────────────────────
  const videoGenBtn = document.getElementById('videoGenBtn');

  videoGenBtn?.addEventListener('click', () => {
    closeMenu();
    const currentText = messageInput.value.trim();
    if (currentText) {
      generateVideo(currentText);
    } else {
      messageInput.placeholder = 'Describe the video you want to generate...';
      messageInput.dataset.mode = 'video';
      messageInput.focus();
    }
  });

  const generateVideo = async (prompt) => {
    if (isStreaming) return;
    isStreaming = true;
    messageInput.value = '';
    messageInput.style.height = 'auto';
    sendBtn.disabled = true;
    messageInput.placeholder = 'Message NEXUS PRIME OMEGA AI AGENT...';
    messageInput.dataset.mode = '';
    if (videoGenBtn) {
      videoGenBtn.style.borderColor = '';
      videoGenBtn.style.color = '';
    }

    addMessage('user', `🎬 Generate video: ${prompt}`);

    welcomeScreen.classList.add('hidden');
    messagesContainer.style.display = 'flex';
    const genDiv = document.createElement('div');
    genDiv.className = 'message assistant';
    genDiv.id = 'videoGenerating';
    genDiv.innerHTML = `
      <div class="message-avatar">⚡</div>
      <div class="message-content">
        <div class="message-bubble">
          <div class="image-generating">
            <div class="gen-spinner"></div>
            <span>Synthesizing video via AI...</span>
          </div>
        </div>
      </div>
    `;
    messagesContainer.appendChild(genDiv);
    chatArea.scrollTop = chatArea.scrollHeight;

    try {
      const res = await apiFetch('/api/video/generate', {
        method: 'POST',
        body: JSON.stringify({ prompt })
      });

      const genEl = document.getElementById('videoGenerating');
      if (genEl) genEl.remove();

      if (!res) return;
      const data = await res.json();

      if (res.ok && data.videoUrl) {
        const vidMsg = document.createElement('div');
        vidMsg.className = 'message assistant';
        vidMsg.innerHTML = `
          <div class="message-avatar">⚡</div>
          <div class="message-content">
            <div class="message-bubble">
              <p><strong>🎬 Video Generated</strong></p>
              <div class="generated-image-container">
                <video src="${data.videoUrl}" controls loop autoplay style="max-width: 100%; border-radius: 8px;"></video>
              </div>
              <p class="image-prompt-caption"><em>"${escapeHtml(prompt)}"</em></p>
              <a href="${data.videoUrl}" download class="image-download-btn">⬇ Download Video</a>
            </div>
            <div class="message-time">${formatTime(new Date())}</div>
          </div>
        `;
        messagesContainer.appendChild(vidMsg);
        chatArea.scrollTop = chatArea.scrollHeight;
      } else {
        addMessage('assistant', `⚠️ Video generation failed: ${data.message || 'Unknown error'}`);
      }
    } catch (error) {
      const genEl = document.getElementById('videoGenerating');
      if (genEl) genEl.remove();
      addMessage('assistant', `⚠️ Video error: ${error.message}`);
    } finally {
      isStreaming = false;
      sendBtn.disabled = !messageInput.value.trim();
    }
  };

  // ── Protein Folding ──────────────────────────
  const proteinFoldBtn = document.getElementById('proteinFoldBtn');

  proteinFoldBtn?.addEventListener('click', () => {
    closeMenu();
    const currentText = messageInput.value.trim();
    if (currentText) {
      foldProtein(currentText);
    } else {
      messageInput.placeholder = 'Enter amino acid sequence (e.g. MKWVTFISLL...)';
      messageInput.dataset.mode = 'protein';
      messageInput.focus();
    }
  });

  const foldProtein = async (sequence) => {
    if (isStreaming) return;
    isStreaming = true;
    messageInput.value = '';
    messageInput.style.height = 'auto';
    sendBtn.disabled = true;
    messageInput.placeholder = 'Message NEXUS PRIME OMEGA AI AGENT...';
    messageInput.dataset.mode = '';

    addMessage('user', `🧬 Predict protein structure for: ${sequence.substring(0, 30)}${sequence.length > 30 ? '...' : ''}`);

    welcomeScreen.classList.add('hidden');
    messagesContainer.style.display = 'flex';
    const genDiv = document.createElement('div');
    genDiv.className = 'message assistant';
    genDiv.id = 'proteinFolding';
    genDiv.innerHTML = `
      <div class="message-avatar">⚡</div>
      <div class="message-content">
        <div class="message-bubble">
          <div class="image-generating">
            <div class="gen-spinner"></div>
            <span>Predicting 3D protein structure...</span>
          </div>
        </div>
      </div>
    `;
    messagesContainer.appendChild(genDiv);
    chatArea.scrollTop = chatArea.scrollHeight;

    try {
      const res = await apiFetch('/api/protein/fold', {
        method: 'POST',
        body: JSON.stringify({ sequence })
      });

      const data = await res.json();
      const genEl = document.getElementById('proteinFolding');
      if (genEl) genEl.remove();

      if (res.ok && data.success) {
        const protMsg = document.createElement('div');
        protMsg.className = 'message assistant';
        protMsg.innerHTML = `
          <div class="message-avatar">⚡</div>
          <div class="message-content">
            <div class="message-bubble">
              <p><strong>🧬 Protein Folding Success</strong></p>
              <p>Predicted structure for <strong>${data.residueCount}</strong> residues.</p>
              <div class="pdb-data-container" style="background: var(--bg-secondary); padding: 12px; border-radius: 8px; font-family: var(--font-mono); font-size: 0.75rem; max-height: 200px; overflow-y: auto; margin: 10px 0; border: 1px solid var(--border-glass);">
                <pre>${escapeHtml(data.pdbData.substring(0, 1000))}...</pre>
              </div>
              <p class="image-prompt-caption"><em>PDB Data generated successfully.</em></p>
              <button onclick="downloadPDB(\`${encodeURIComponent(data.pdbData)}\`)" class="image-download-btn" style="border:none; cursor:pointer;">⬇ Download PDB File</button>
            </div>
            <div class="message-time">${formatTime(new Date())}</div>
          </div>
        `;
        messagesContainer.appendChild(protMsg);
        chatArea.scrollTop = chatArea.scrollHeight;
        
        // Speak completion if enabled
        speakText(`I have successfully predicted the 3D structure for your protein sequence of ${data.residueCount} residues.`);
      } else {
        addMessage('assistant', `⚠️ Protein folding failed: ${data.message || 'Unknown error'}`);
      }
    } catch (error) {
      const genEl = document.getElementById('proteinFolding');
      if (genEl) genEl.remove();
      addMessage('assistant', `⚠️ Protein error: ${error.message}`);
    } finally {
      isStreaming = false;
      sendBtn.disabled = !messageInput.value.trim();
    }
  };

  // Global download helper
  window.downloadPDB = (encodedData) => {
    const data = decodeURIComponent(encodedData);
    const blob = new Blob([data], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'protein_structure.pdb';
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  // ── Voice to Voice (TTS) ─────────────────────
  const ttsBtn = document.getElementById('ttsBtn');
  let isAutoSpeak = false;

  ttsBtn?.addEventListener('click', (e) => {
    e.stopPropagation(); // Don't close menu on TTS toggle
    isAutoSpeak = !isAutoSpeak;
    ttsBtn.dataset.active = isAutoSpeak;
    ttsBtn.classList.toggle('active-option', isAutoSpeak);
    const ttsMenuText = document.getElementById('ttsMenuText');
    if (ttsMenuText) ttsMenuText.textContent = isAutoSpeak ? 'Auto-Speak: ON' : 'Auto-Speak: OFF';
    ttsBtn.title = isAutoSpeak ? 'Auto-Speak (TTS) is ON' : 'Auto-Speak (TTS) is OFF';
    if (!isAutoSpeak) window.speechSynthesis.cancel();
  });

  const speakText = (text) => {
    if (!isAutoSpeak || !text.trim()) return;
    
    // Clean markdown and artifacts for smooth verbal output
    const cleanText = text.replace(/```[\s\S]*?```/g, ' [Code Block] ')
                          .replace(/[*#_~]/g, '')
                          .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
                          
    const utterance = new SpeechSynthesisUtterance(cleanText);
    
    // Aggressive heuristic to find the highest-quality Neural/Premium Voice
    let voices = window.speechSynthesis.getVoices();
    const enVoices = voices.filter(v => v.lang.startsWith('en'));
    if (enVoices.length > 0) voices = enVoices;

    const goodVoice = 
      voices.find(v => v.name.includes('Multilingual Neural')) ||
      voices.find(v => v.name.includes('Natural')) ||
      voices.find(v => v.name.includes('Premium')) ||
      voices.find(v => v.name.includes('Siri')) ||
      voices.find(v => v.name.includes('Google')) ||
      voices[0];

    if (goodVoice) utterance.voice = goodVoice;
    
    // Tune kinetics for human breathability and resonance
    utterance.rate = 1.02;
    utterance.pitch = 1.05;

    window.speechSynthesis.speak(utterance);
  };


  // ── Markdown Renderer ────────────────────────
  const renderMarkdown = (text) => {
    let html = text
      .replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, code) => {
        const id = 'code-' + Math.random().toString(36).substring(2, 8);
        return `<pre><code class="language-${lang}" id="${id}">${escapeHtml(code.trim())}</code><button class="copy-code-btn" onclick="copyCode('${id}')">Copy</button></pre>`;
      })
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/^### (.+)$/gm, '<h3>$1</h3>')
      .replace(/^## (.+)$/gm, '<h2>$1</h2>')
      .replace(/^# (.+)$/gm, '<h1>$1</h1>')
      .replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>')
      .replace(/^[-*] (.+)$/gm, '<li>$1</li>')
      .replace(/^\d+\. (.+)$/gm, '<li>$1</li>')
      .replace(/\n\n/g, '</p><p>')
      .replace(/\n/g, '<br>');

    html = html.replace(/(<li>.*<\/li>)/gs, '<ul>$1</ul>');
    html = html.replace(/<\/ul><ul>/g, '');
    return `<p>${html}</p>`;
  };

  const escapeHtml = (str) => {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  };

  window.copyCode = (id) => {
    const el = document.getElementById(id);
    if (el) {
      navigator.clipboard.writeText(el.textContent);
      const btn = el.nextElementSibling;
      if (btn) { btn.textContent = 'Copied!'; setTimeout(() => btn.textContent = 'Copy', 1500); }
    }
  };

  // ── Add Message to Chat ──────────────────────
  const addMessage = (role, content, time = new Date(), isHtml = false) => {
    welcomeScreen.classList.add('hidden');
    messagesContainer.style.display = 'flex';

    const msgDiv = document.createElement('div');
    msgDiv.className = `message ${role}`;

    const userInitials = currentUser
      ? currentUser.fullName.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2)
      : 'U';

    const cleanContent = isHtml ? content : escapeHtml(content);
    const renderedContent = role === 'assistant' ? renderMarkdown(content) : cleanContent;

    msgDiv.innerHTML = `
      <div class="message-avatar">${role === 'assistant' ? '⚡' : userInitials}</div>
      <div class="message-content">
        <div class="message-bubble">${renderedContent}</div>
        <div class="message-actions">
          <button class="msg-action-btn" onclick="copyToClipboard(\`${encodeURIComponent(content)}\`, this)">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
            <span>Copy</span>
          </button>
          ${role === 'user' ? `
          <button class="msg-action-btn" onclick="editMessage(\`${encodeURIComponent(content)}\`)">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
            <span>Edit</span>
          </button>
          ` : ''}
        </div>
        <div class="message-time">${formatTime(time)}</div>
      </div>
    `;

    messagesContainer.appendChild(msgDiv);
    chatArea.scrollTop = chatArea.scrollHeight;
    return msgDiv;
  };

  // Global Helpers for Message Actions
  window.copyToClipboard = (encodedText, btn) => {
    const text = decodeURIComponent(encodedText);
    navigator.clipboard.writeText(text).then(() => {
      const span = btn.querySelector('span');
      const originalText = span.textContent;
      span.textContent = 'Copied!';
      btn.style.color = 'var(--accent-cyan)';
      btn.style.borderColor = 'var(--accent-cyan)';
      setTimeout(() => {
        span.textContent = originalText;
        btn.style.color = '';
        btn.style.borderColor = '';
      }, 2000);
    });
  };

  window.editMessage = (encodedText) => {
    const text = decodeURIComponent(encodedText);
    messageInput.value = text;
    messageInput.style.height = 'auto';
    messageInput.style.height = messageInput.scrollHeight + 'px';
    messageInput.focus();
    // Scroll to bottom to ensure user sees the input
    chatArea.scrollTop = chatArea.scrollHeight;
  };

  // ── Create Streaming Message Bubble ──────────
  const createStreamingBubble = () => {
    welcomeScreen.classList.add('hidden');
    messagesContainer.style.display = 'flex';

    const msgDiv = document.createElement('div');
    msgDiv.className = 'message assistant';
    msgDiv.id = 'streamingMessage';
    msgDiv.innerHTML = `
      <div class="message-avatar">⚡</div>
      <div class="message-content">
        <div class="message-bubble"><p><span id="streamingText"></span><span class="streaming-cursor">▊</span></p></div>
        <div class="message-time">${formatTime(new Date())}</div>
      </div>
    `;
    messagesContainer.appendChild(msgDiv);
    chatArea.scrollTop = chatArea.scrollHeight;
    return document.getElementById('streamingText');
  };

  // ── Vision Analysis ────────────────────
  const visionBtn = document.getElementById('visionBtn');
  const cameraInput = document.getElementById('cameraInput');

  visionBtn?.addEventListener('click', (e) => {
    if (e.target !== cameraInput) {
      cameraInput.click();
    }
  });

  cameraInput?.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    closeMenu();
    uploadedFile = file;
    
    // Show preview
    filePreviewName.textContent = `Vision: ${file.name}`;
    filePreview.style.display = 'flex';

    // Auto-analysis prompt
    messageInput.value = 'Please analyze this image in detail and tell me what you see.';
    sendMessage();
    
    // Reset input
    e.target.value = '';
  });

  // ── Deep Research ──────────────────────────
  const deepResearchBtn = document.getElementById('deepResearchBtn');

  deepResearchBtn?.addEventListener('click', () => {
    closeMenu();
    const currentText = messageInput.value.trim();
    if (currentText) {
      performDeepResearch(currentText);
    } else {
      messageInput.placeholder = 'Enter topic for Global Deep Research...';
      messageInput.dataset.mode = 'research';
      messageInput.focus();
    }
  });

  const performDeepResearch = async (topic) => {
    if (isStreaming) return;
    isStreaming = true;
    messageInput.value = '';
    messageInput.style.height = 'auto';
    sendBtn.disabled = true;
    messageInput.placeholder = 'Message NEXUS PRIME OMEGA AI AGENT...';
    messageInput.dataset.mode = '';

    addMessage('user', `🔍 Deep Research: "${topic}"`);

    welcomeScreen.classList.add('hidden');
    messagesContainer.style.display = 'flex';
    const genDiv = document.createElement('div');
    genDiv.className = 'message assistant';
    genDiv.id = 'researching';
    genDiv.innerHTML = `
      <div class="message-avatar">⚡</div>
      <div class="message-content">
        <div class="message-bubble">
          <div class="research-status">
            <div class="research-spinner"></div>
            <div class="research-phases">
              <span id="researchPhase" style="color: var(--accent-cyan); font-weight: 600;">Searching Global Databases...</span>
              <div class="research-timer" id="researchTimer">Estimated completion: 30s</div>
            </div>
          </div>
        </div>
      </div>
    `;
    messagesContainer.appendChild(genDiv);
    chatArea.scrollTop = chatArea.scrollHeight;

    // Countdown and Phased UI Timer
    let secondsLeft = 30;
    const phases = [
      { sec: 25, text: "🌍 Accessing International Archives..." },
      { sec: 18, text: "🧠 Synthesizing Disparate Knowledge..." },
      { sec: 10, text: "📈 Generating Statistical Models..." },
      { sec: 4, text: "📝 Drafting Final Intelligence Report..." }
    ];

    const timerInterval = setInterval(() => {
      secondsLeft--;
      const timerEl = document.getElementById('researchTimer');
      const phaseEl = document.getElementById('researchPhase');
      if (timerEl) timerEl.textContent = `Estimated completion: ${secondsLeft}s`;
      
      const phaseChange = phases.find(p => p.sec === secondsLeft);
      if (phaseChange && phaseEl) phaseEl.textContent = phaseChange.text;

      if (secondsLeft <= 0) clearInterval(timerInterval);
    }, 1000);

    try {
      const res = await apiFetch('/api/research/deep', {
        method: 'POST',
        body: JSON.stringify({ topic })
      });

      const data = await res.json();
      clearInterval(timerInterval);
      const genEl = document.getElementById('researching');
      if (genEl) genEl.remove();

      if (res.ok && data.success) {
        const reportMsg = document.createElement('div');
        reportMsg.className = 'message assistant';
        reportMsg.innerHTML = `
          <div class="message-avatar">⚡</div>
          <div class="message-content">
            <div class="message-bubble">
              <div class="report-header" style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border-glass); padding-bottom: 8px; margin-bottom: 12px;">
                <span style="color: var(--accent-cyan); font-weight: 700;">🌐 GLOBAL INTEL REPORT</span>
                <span style="font-size: 0.75rem; color: var(--text-secondary);">${new Date().toLocaleDateString()}</span>
              </div>
              <div class="report-body">${renderMarkdown(data.report)}</div>
              <div class="message-actions">
                <button class="msg-action-btn" onclick="copyToClipboard(\`${encodeURIComponent(data.report)}\`, this)">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                  <span>Copy Report</span>
                </button>
              </div>
              <div style="margin-top: 20px; padding-top: 15px; border-top: 1px dashed var(--border-glass);">
                <button onclick="downloadResearch(\`${encodeURIComponent(data.report)}\`, '${topic.replace(/'/g, "\\'")}')" class="image-download-btn" style="border:none; cursor:pointer;">⬇ Download Full Research Report (.md)</button>
              </div>
            </div>
            <div class="message-time">${formatTime(new Date())}</div>
          </div>
        `;
        messagesContainer.appendChild(reportMsg);
        chatArea.scrollTop = chatArea.scrollHeight;
        
        speakText(`Intelligence report for ${topic} is complete. Global search finalized.`);
      } else {
        addMessage('assistant', `⚠️ Research failed: ${data.message || 'Unknown error'}`);
      }
    } catch (error) {
      clearInterval(timerInterval);
      const genEl = document.getElementById('researching');
      if (genEl) genEl.remove();
      addMessage('assistant', `⚠️ Research error: ${error.message}`);
    } finally {
      isStreaming = false;
      sendBtn.disabled = !messageInput.value.trim();
    }
  };

  window.downloadResearch = (encodedData, topic) => {
    const data = decodeURIComponent(encodedData);
    const blob = new Blob([data], { type: 'text/markdown' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Deep_Research_${topic.replace(/\s+/g, '_')}.md`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  // ── Finalize Streaming Message ────────────────
  const finalizeStreamingBubble = (fullText, silent = false) => {
    const streamMsg = document.getElementById('streamingMessage');
    if (streamMsg) {
      const bubble = streamMsg.querySelector('.message-bubble');
      bubble.innerHTML = renderMarkdown(fullText);
      streamMsg.removeAttribute('id');

      // Add Copy Button
      const actionsDiv = document.createElement('div');
      actionsDiv.className = 'message-actions';
      actionsDiv.innerHTML = `
        <button class="msg-action-btn" onclick="copyToClipboard(\`${encodeURIComponent(fullText)}\`, this)">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
          <span>Copy</span>
        </button>
      `;
      streamMsg.querySelector('.message-content').insertBefore(actionsDiv, streamMsg.querySelector('.message-time'));
    }
    // Remove cursor
    const cursor = document.querySelector('.streaming-cursor');
    if (cursor) cursor.remove();

    // Trigger TTS if enabled
    if (!silent) speakText(fullText);
  };

  // ── Incognito Mode ────────────────────────
  const incognitoToggle = document.getElementById('incognitoToggle');
  let isIncognito = false;

  incognitoToggle?.addEventListener('change', (e) => {
    isIncognito = e.target.checked;
    if (isIncognito) {
      console.log('🕵️ Incognito Mode Activated');
      // Potential UI feedback
      document.body.classList.add('incognito-active');
      showNotification('Incognito Mode Active: Chat history will not be saved.', 'info');
    } else {
      console.log('🕵️ Incognito Mode Deactivated');
      document.body.classList.remove('incognito-active');
    }
  });

  // ── Engine / Intelligence Level ───────────
  let currentIntelLevel = 'NORMAL';
  const engineButtons = document.querySelectorAll('.engine-opt');

  engineButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      currentIntelLevel = btn.dataset.level;
      
      // Update UI
      engineButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      // Notification
      const levelNames = {
        'NORMAL': 'Normal Assistance',
        'INTERMEDIATE': 'Intermediate Intelligence',
        'ADVANCED': 'Advanced Technical Engine',
        'GOD LEVEL': 'GOD LEVEL — SUPREME INTELLIGENCE'
      };
      
      const type = currentIntelLevel === 'GOD LEVEL' ? 'success' : 'info';
      showNotification(`${levelNames[currentIntelLevel]} Activated`, type);
      console.log(`🧠 AI Engine scaled to: ${currentIntelLevel}`);
    });
  });

  // ── Share Chat ────────────────────────────
  const shareTopBtn = document.getElementById('shareTopBtn');

  shareTopBtn?.addEventListener('click', () => {
    const allMsgs = Array.from(messagesContainer.querySelectorAll('.message'));
    if (allMsgs.length === 0) return;

    let shareContent = `🌐 NEXUS PRIME OMEGA AI AGENT GLOBAL INTEL SESSION\n`;
    shareContent += `Date: ${new Date().toLocaleString()}\n`;
    shareContent += `-------------------------------------------\n\n`;

    allMsgs.forEach(msg => {
      const role = msg.classList.contains('user') ? 'USER' : 'NEXUS PRIME OMEGA AI AGENT';
      const bubble = msg.querySelector('.message-bubble');
      const text = bubble ? bubble.innerText : '';
      shareContent += `[${role}]:\n${text}\n\n`;
    });

    shareContent += `-------------------------------------------\n`;
    shareContent += `Finalized via NEXUS PRIME OMEGA AI AGENT ⚡`;

    navigator.clipboard.writeText(shareContent).then(() => {
      showNotification('Chat conversation copied to clipboard!', 'success');
    });
  });

  // ── Theme Selection Menu ──────────────────
  const themeMenuBtn = document.getElementById('themeMenuBtn');
  const themeMenu = document.getElementById('themeMenu');
  const themeIcon = document.getElementById('themeIcon');
  const themeText = document.getElementById('themeText');
  
  let currentTheme = localStorage.getItem('nexus_theme') || 'dark';
  
  const themeData = {
    dark: { icon: '🌙', text: 'Dark Mode' },
    light: { icon: '☀️', text: 'Light Mode' },
    cyber: { icon: '⚡', text: 'Cyber Mode' },
    midnight: { icon: '🌑', text: 'Midnight' },
    sunset: { icon: '🌅', text: 'Sunset' },
    matrix: { icon: '📟', text: 'Matrix' }
  };

  const applyTheme = (theme) => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('nexus_theme', theme);
    currentTheme = theme;
    
    if (themeData[theme]) {
      themeIcon.textContent = themeData[theme].icon;
      themeText.textContent = themeData[theme].text;
    }
  };
  
  applyTheme(currentTheme);

  themeMenuBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    themeMenu.classList.toggle('open');
  });

  document.querySelectorAll('.theme-opt-item').forEach(opt => {
    opt.addEventListener('click', () => {
      const theme = opt.dataset.theme;
      applyTheme(theme);
      themeMenu.classList.remove('open');
      showNotification(`${themeData[theme].text} Activated`, 'info');
    });
  });

  // Close theme menu on click outside
  document.addEventListener('click', (e) => {
    if (themeMenu && !themeMenu.contains(e.target) && e.target !== themeMenuBtn) {
      themeMenu.classList.remove('open');
    }
  });

  const showNotification = (msg, type = 'info') => {
    const notify = document.createElement('div');
    notify.className = `notification ${type}`;
    notify.style.cssText = `
      position: fixed;
      bottom: 100px;
      left: 50%;
      transform: translateX(-50%);
      background: ${type === 'success' ? 'rgba(0, 240, 255, 0.9)' : 'rgba(157, 78, 221, 0.9)'};
      color: #fff;
      padding: 10px 20px;
      border-radius: 20px;
      font-size: 0.85rem;
      font-weight: 500;
      z-index: 9999;
      backdrop-filter: blur(10px);
      box-shadow: 0 4px 15px rgba(0,0,0,0.3);
      animation: notifySlideIn 0.3s ease forwards;
    `;
    notify.innerText = msg;
    document.body.appendChild(notify);

    setTimeout(() => {
      notify.style.animation = 'notifySlideOut 0.3s ease forwards';
      setTimeout(() => notify.remove(), 300);
    }, 3000);
  };

  // Add notification animations if not present
  if (!document.getElementById('notifyStyles')) {
    const s = document.createElement('style');
    s.id = 'notifyStyles';
    s.innerHTML = `
      @keyframes notifySlideIn { from { transform: translate(-50%, 20px); opacity: 0; } to { transform: translate(-50%, 0); opacity: 1; } }
      @keyframes notifySlideOut { from { transform: translate(-50%, 0); opacity: 1; } to { transform: translate(-50%, 20px); opacity: 0; } }
    `;
    document.head.appendChild(s);
  }

  // ── Send Message with Streaming ───────────────
  const sendMessage = async () => {
    const content = messageInput.value.trim();
    if (!content && !uploadedFile && !isStreaming) return;
    if (isStreaming) return;

    // Check for explicit commands
    if (content.startsWith('/imagine ') || messageInput.dataset.mode === 'image') {
      const prompt = content.startsWith('/imagine ') ? content.slice(9).trim() : content;
      if (prompt) {
        generateImage(prompt);
        return;
      }
    } else if (content.startsWith('/video ') || messageInput.dataset.mode === 'video') {
      const prompt = content.startsWith('/video ') ? content.slice(7).trim() : content;
      if (prompt) {
        generateVideo(prompt);
        return;
      }
    }

    sendBtn.disabled = true;
    isStreaming = true;

    let imageUrl = null;
    let fileType = null;
    let attachmentHtml = '';

    // Handle file upload
    if (uploadedFile) {
      const formData = new FormData();
      formData.append('file', uploadedFile);
      try {
        const uploadRes = await apiFetch('/api/upload', {
          method: 'POST',
          body: formData
        });
        const uploadData = await uploadRes.json();
        imageUrl = uploadData.file.url;
        
        if (uploadedFile.type.startsWith('video/')) {
          fileType = 'video';
          attachmentHtml = `<div class="chat-video-attachment"><video src="${imageUrl}" controls loop style="max-width: 100%; border-radius: 8px; margin-top: 8px;"></video></div>`;
        } else if (uploadedFile.type.startsWith('image/')) {
          fileType = 'image';
          attachmentHtml = `<div class="chat-image-attachment"><img src="${imageUrl}" alt="Uploaded image" /></div>`;
        } else {
          fileType = 'file';
          attachmentHtml = `<div class="chat-file-attachment"><a href="${imageUrl}" target="_blank">📄 ${escapeHtml(uploadedFile.name)}</a></div>`;
        }
      } catch (e) {
        console.error('File upload failed', e);
        addMessage('assistant', '⚠️ File upload failed.', new Date(), false);
      }
      
      filePreviewRemove.click(); // Clear preview
    }

    messageInput.value = '';
    messageInput.style.height = 'auto';

    addMessage('user', attachmentHtml + escapeHtml(content), new Date(), true);
    const streamEl = createStreamingBubble();
    let fullResponse = '';

    try {
      const streamUrl = currentChatId
        ? `/api/chats/${currentChatId}/messages/stream`
        : (isIncognito ? '/api/chats/incognito/stream' : '/api/chats/quick/stream');

      const selectedMode = document.getElementById('modeSelection')?.value || 'EXPERT';
      const reqBody = { content, intelLevel: currentIntelLevel, mode: selectedMode };
      if (imageUrl) reqBody.imageUrl = imageUrl;
      if (fileType) reqBody.type = fileType;

      const response = await fetch(`${API}${streamUrl}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(reqBody)
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        fullResponse = `⚠️ Error: ${err.message || 'Failed to get response'}`;
        finalizeStreamingBubble(fullResponse);
        isStreaming = false;
        sendBtn.disabled = false;
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith('data: ')) continue;

          try {
            const data = JSON.parse(trimmed.slice(6));

            if (data.chatId && !currentChatId) {
              currentChatId = data.chatId;
            }
            if (data.chatTitle) {
              document.getElementById('topbarTitle').textContent = data.chatTitle;
            }
            if (data.token) {
              fullResponse += data.token;
              streamEl.textContent = fullResponse;
              chatArea.scrollTop = chatArea.scrollHeight;
            }
            if (data.done) {
              finalizeStreamingBubble(fullResponse);
              loadChatHistory();
            }
          } catch (e) { }
        }
      }

      // If no done event received, finalize anyway
      if (fullResponse) {
        finalizeStreamingBubble(fullResponse);
      }

    } catch (error) {
      fullResponse = fullResponse || '⚠️ Network error. Please check your connection.';
      finalizeStreamingBubble(fullResponse);
      console.error('Stream error:', error);
    } finally {
      isStreaming = false;
      sendBtn.disabled = !messageInput.value.trim();
    }
  };

  // ── Load Chat History ─────────────────────────
  const loadChatHistory = async () => {
    try {
      const res = await apiFetch('/api/chats');
      if (!res) return;
      const data = await res.json();

      historyToday.innerHTML = '';
      historyOlder.innerHTML = '';

      if (!data.chats || data.chats.length === 0) return;

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      data.chats.forEach(chat => {
        const chatDate = new Date(chat.updatedAt);
        const isToday = chatDate >= today;

        const item = document.createElement('div');
        item.className = `history-item${chat._id === currentChatId ? ' active' : ''}`;
        item.innerHTML = `
          <span class="history-item-title">${escapeHtml(chat.title)}</span>
          <button class="history-item-delete" title="Delete">🗑️</button>
        `;

        item.querySelector('.history-item-title').addEventListener('click', () => loadChat(chat._id));
        item.querySelector('.history-item-delete').addEventListener('click', (e) => {
          e.stopPropagation();
          deleteChat(chat._id);
        });

        if (isToday) historyToday.appendChild(item);
        else historyOlder.appendChild(item);
      });
    } catch (e) {
      console.error('Error loading history:', e);
    }
  };

  // ── Load Specific Chat ────────────────────────
  const loadChat = async (chatId) => {
    try {
      const res = await apiFetch(`/api/chats/${chatId}`);
      if (!res) return;
      const data = await res.json();
      if (!res.ok) return;

      currentChatId = chatId;
      messagesContainer.innerHTML = '';
      welcomeScreen.classList.add('hidden');
      messagesContainer.style.display = 'flex';
      document.getElementById('topbarTitle').textContent = data.chat.title;

      data.chat.messages.forEach(msg => {
        addMessage(msg.role, msg.content, new Date(msg.timestamp));
      });

      sidebar.classList.remove('open');
      loadChatHistory();
    } catch (e) {
      console.error('Error loading chat:', e);
    }
  };

  // ── Delete Chat ───────────────────────────────
  const deleteChat = async (chatId) => {
    try {
      await apiFetch(`/api/chats/${chatId}`, { method: 'DELETE' });
      if (chatId === currentChatId) startNewChat();
      loadChatHistory();
    } catch (e) {
      console.error('Error deleting chat:', e);
    }
  };

  // ── Sidebar Collapse (Icon Only) ───────────
  const collapseBtn = document.getElementById('collapseSidebarBtn');
  let isCollapsed = localStorage.getItem('nexus_sidebar_collapsed') === 'true';

  const toggleSidebarCollapse = (force) => {
    isCollapsed = force !== undefined ? force : !isCollapsed;
    sidebar.classList.toggle('collapsed', isCollapsed);
    localStorage.setItem('nexus_sidebar_collapsed', isCollapsed);
    
    // Adjust tooltip or icons if needed
    collapseBtn.title = isCollapsed ? 'Expand Sidebar (Ctrl+B)' : 'Collapse Sidebar (Ctrl+B)';
  };

  // Initialize collapse state
  if (isCollapsed) toggleSidebarCollapse(true);

  collapseBtn?.addEventListener('click', () => toggleSidebarCollapse());

  // Shortcut Ctrl+B
  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.key.toLowerCase() === 'b') {
      e.preventDefault();
      toggleSidebarCollapse();
    }
  });

  // ── New Chat ──────────────────────────────────
  const startNewChat = () => {
    currentChatId = null;
    messagesContainer.innerHTML = '';
    messagesContainer.style.display = 'none';
    welcomeScreen.classList.remove('hidden');
    document.getElementById('topbarTitle').textContent = 'NEXUS PRIME OMEGA AI AGENT';
    sidebar.classList.remove('open');
  };

  newChatBtn.addEventListener('click', startNewChat);

  // ── Logout ────────────────────────────────────
  logoutBtn.addEventListener('click', () => {
    localStorage.removeItem('nexus_token');
    localStorage.removeItem('nexus_refresh');
    localStorage.removeItem('nexus_user');
    window.location.href = '/auth';
  });

  // ── Format Time ───────────────────────────────
  const formatTime = (date) => {
    const d = new Date(date);
    return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  };

  // ── Initialize ────────────────────────────────
  loadChatHistory();
  messageInput.focus();
});
