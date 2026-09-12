/**
 * LinkedIn Viral Dashboard Controller
 * Implementa todas as interações do dashboard fiel ao design fornecido pelo usuário.
 */

const dashboardState = {
  postsCount: 78,
  conversasCount: 33,
  agendadosCount: 4,
  publicadosCount: 0,
  currentGeneratedData: null,
  activePerspective: 'critica'
};

document.addEventListener('DOMContentLoaded', () => {
  initDashboard();
});

let linkedInConnected = false;
let selectedImageFile = null;

function initDashboard() {
  bindButtons();
  bindCopyButtons();
  bindImageUpload();
  checkLinkedInStatus();
  checkUrlParams();
}

function bindImageUpload() {
  const dropZone = document.getElementById('imageDropZone');
  const fileInput = document.getElementById('publishImageInput');
  const emptyView = document.getElementById('dropZoneEmpty');
  const previewView = document.getElementById('dropZonePreview');
  const thumb = document.getElementById('imgPreviewThumb');
  const btnRemove = document.getElementById('btnRemoveImage');

  if (!dropZone || !fileInput) return;

  dropZone.addEventListener('click', (e) => {
    if (e.target === btnRemove || btnRemove.contains(e.target)) return;
    fileInput.click();
  });

  fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
    }
  });

  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.style.borderColor = '#0a66c2';
  });

  dropZone.addEventListener('dragleave', () => {
    dropZone.style.borderColor = 'rgba(255,255,255,0.15)';
  });

  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.style.borderColor = 'rgba(255,255,255,0.15)';
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      setImageFile(file);
    }
  });

  btnRemove?.addEventListener('click', (e) => {
    e.stopPropagation();
    selectedImageFile = null;
    fileInput.value = '';
    thumb.src = '';
    emptyView.classList.remove('hidden');
    previewView.classList.add('hidden');
  });

  function setImageFile(file) {
    selectedImageFile = file;
    const reader = new FileReader();
    reader.onload = (ev) => {
      thumb.src = ev.target.result;
      emptyView.classList.add('hidden');
      previewView.classList.remove('hidden');
    };
    reader.readAsDataURL(file);
  }
}

async function checkLinkedInStatus() {
  try {
    const res = await fetch('/api/status');
    const data = await res.json();
    if (data.linkedin_api && data.linkedin_api.has_token) {
      linkedInConnected = true;
      const notice = document.getElementById('linkedinTokenNotice');
      if (notice) {
        notice.style.background = 'rgba(16, 185, 129, 0.15)';
        notice.style.borderColor = 'rgba(16, 185, 129, 0.4)';
        notice.style.color = '#6ee7b7';
        notice.innerHTML = `<span>✅ <strong>Conectado ao LinkedIn:</strong> <code>${data.linkedin_api.author_urn || 'Perfil Ativo'}</code></span>`;
      }
      const radioLive = document.getElementById('radioLive');
      const radioSim = document.getElementById('radioSim');
      const labelLive = document.getElementById('labelModeLive');
      const labelSim = document.getElementById('labelModeSim');
      if (radioLive && radioSim) {
        radioLive.checked = true;
        labelLive?.classList.add('active');
        labelSim?.classList.remove('active');
      }
    }
  } catch (err) {
    console.warn('Erro ao checar status do LinkedIn:', err);
  }
}

function checkUrlParams() {
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('auth_success') === '1') {
    showToast('🎉 Conta do LinkedIn conectada com sucesso! Publicação Live habilitada.');
    window.history.replaceState({}, document.title, window.location.pathname);
  }
}

function showToast(message) {
  const wrapper = document.getElementById('toastWrapper');
  const msg = document.createElement('div');
  msg.className = 'toast-msg';
  msg.innerText = message;
  wrapper.appendChild(msg);
  setTimeout(() => {
    msg.style.opacity = '0';
    setTimeout(() => msg.remove(), 300);
  }, 3000);
}

function bindButtons() {
  // Ações Rápidas
  const btnCriar = document.getElementById('btnActionCriarPost');
  const modalCriar = document.getElementById('modalCriarPost');
  const btnCloseCriar = document.getElementById('btnCloseCriarPost');

  if (btnCriar && modalCriar) {
    btnCriar.addEventListener('click', () => modalCriar.classList.remove('hidden'));
    btnCloseCriar.addEventListener('click', () => modalCriar.classList.add('hidden'));
  }

  // Sidebar Links
  document.getElementById('navChat')?.addEventListener('click', (e) => {
    e.preventDefault();
    modalCriar.classList.remove('hidden');
  });

  document.getElementById('navTemplates')?.addEventListener('click', (e) => {
    e.preventDefault();
    showToast('Templates de alto impacto carregados no editor.');
    modalCriar.classList.remove('hidden');
    document.getElementById('modalTopic').value = 'Gere um post usando o template: "Gancho Provocativo + 3 Lições Duras + Pergunta Aberta"';
  });

  document.getElementById('navAnalisar')?.addEventListener('click', (e) => {
    e.preventDefault();
    showToast('Auditor de Post: Cole seu texto no editor para receber o score viral.');
    modalCriar.classList.remove('hidden');
  });

  document.getElementById('navCarrossel')?.addEventListener('click', (e) => {
    e.preventDefault();
    showToast('Modo Carrossel Ativado: Estruture 5 slides dinâmicos.');
    modalCriar.classList.remove('hidden');
    document.getElementById('modalTopic').value = 'Roteiro de Carrossel: 5 Erros que impedem sua IA de ir para produção';
  });

  document.getElementById('navPublicar')?.addEventListener('click', (e) => {
    e.preventDefault();
    openPublishModal();
  });

  // Action Cards rápidos
  document.getElementById('btnActionTemplates')?.addEventListener('click', () => {
    modalCriar.classList.remove('hidden');
    document.getElementById('modalTopic').value = 'Template: O que aprendi demitindo o que não agregava na arquitetura em 2026';
  });

  document.getElementById('btnActionAnalisar')?.addEventListener('click', () => {
    modalCriar.classList.remove('hidden');
    document.getElementById('modalTopic').value = 'Auditoria de Viralidade: Analise e aprimore este rascunho com técnicas de retenção';
  });

  document.getElementById('btnActionCarrossel')?.addEventListener('click', () => {
    modalCriar.classList.remove('hidden');
    document.getElementById('modalTopic').value = 'Carrossel: Guia visual definitivo de Agentes Autônomos';
  });

  document.getElementById('btnActionCalendario')?.addEventListener('click', () => {
    showToast('Calendário: 4 posts já agendados para a próxima semana!');
  });

  document.getElementById('btnActionGaleria')?.addEventListener('click', () => {
    showToast('Galeria: 12 prompts e imagens salvas prontas para uso.');
  });

  document.getElementById('btnAgendarPost')?.addEventListener('click', () => {
    showToast('Agendamento: selecione a data e o melhor horário (Terça 08:30 recomendado).');
  });

  document.getElementById('btnCriarRascunho')?.addEventListener('click', () => {
    modalCriar.classList.remove('hidden');
  });

  // Profile / Settings
  const userProfile = document.getElementById('userProfileBtn');
  const modalSettings = document.getElementById('modalSettings');
  const btnCloseSettings = document.getElementById('btnCloseSettings');
  const btnCancelSettings = document.getElementById('btnCancelSettings');
  const btnSaveSettings = document.getElementById('btnSaveAllSettings');

  if (userProfile && modalSettings) {
    userProfile.addEventListener('click', () => modalSettings.classList.remove('hidden'));
    btnCloseSettings.addEventListener('click', () => modalSettings.classList.add('hidden'));
    btnCancelSettings.addEventListener('click', () => modalSettings.classList.add('hidden'));
    btnSaveSettings.addEventListener('click', async () => {
      const payload = {
        groq_api_key: document.getElementById('setGroqKey').value.trim(),
        openrouter_api_key: document.getElementById('setOpenRouterKey').value.trim(),
        linkedin_access_token: document.getElementById('setLinkedInToken').value.trim()
      };
      await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      showToast('Configurações salvas!');
      modalSettings.classList.add('hidden');
    });
  }

  // Publicar Modal
  const modalPub = document.getElementById('modalPublicar');
  const btnClosePub = document.getElementById('btnClosePublicar');
  const btnCancelPub = document.getElementById('btnCancelPub');
  const btnExecPub = document.getElementById('btnExecutePublish');

  if (modalPub) {
    btnClosePub.addEventListener('click', () => modalPub.classList.add('hidden'));
    btnCancelPub.addEventListener('click', () => modalPub.classList.add('hidden'));
    btnExecPub.addEventListener('click', handleExecutePublish);
  }

  document.getElementById('btnEnviarAoLinkedIn')?.addEventListener('click', () => {
    modalCriar.classList.add('hidden');
    openPublishModal(getCurrentPostFromModal());
  });

  // Geração com IA no Modal Criar Post
  document.getElementById('btnModalGenerate')?.addEventListener('click', handleModalGenerate);

  // Tabs de Perspectiva no Modal
  const pTabs = document.querySelectorAll('.p-tab');
  pTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      pTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      dashboardState.activePerspective = tab.dataset.p;
      renderActiveModalPerspective();
    });
  });

  // Copiar Prompt
  document.getElementById('btnCopyModalPrompt')?.addEventListener('click', () => {
    const promptTxt = document.getElementById('modalPromptView').innerText;
    navigator.clipboard.writeText(promptTxt);
    showToast('Prompt em inglês copiado!');
  });

  // Salvar Rascunho
  document.getElementById('btnSalvarRascunho')?.addEventListener('click', () => {
    const postTxt = getCurrentPostFromModal();
    if (!postTxt) return;
    addNewPostToDashboardFeed(document.getElementById('modalTopic').value.trim() || 'Novo Post', postTxt);
    modalCriar.classList.add('hidden');
    showToast('Post salvo nos rascunhos e no feed!');
  });
}

function bindCopyButtons() {
  document.querySelectorAll('.copy-icon-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.dataset.target;
      const el = document.getElementById(targetId);
      if (el) {
        navigator.clipboard.writeText(el.innerText.trim());
        showToast('Conteúdo copiado com sucesso!');
      }
    });
  });
}

async function handleModalGenerate() {
  const topic = document.getElementById('modalTopic').value.trim();
  if (!topic) {
    showToast('Por favor, informe o tema.');
    return;
  }

  const btn = document.getElementById('btnModalGenerate');
  const spinner = document.getElementById('modalSpinner');
  btn.disabled = true;
  spinner.classList.remove('hidden');

  try {
    const res = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        topic: topic,
        objective: document.getElementById('modalObjective').value,
        engine: document.getElementById('modalEngine').value,
        audience: document.getElementById('modalAudience').value
      })
    });

    const data = await res.json();
    if (data.error) throw new Error(data.error);

    dashboardState.currentGeneratedData = data;
    renderActiveModalPerspective();

    // Incrementa contadores
    dashboardState.postsCount += 3;
    dashboardState.conversasCount += 1;
    document.getElementById('kpiPostsCount').innerText = dashboardState.postsCount;
    document.getElementById('kpiConversasCount').innerText = dashboardState.conversasCount;

    showToast('3 Perspectivas Virais Geradas com Sucesso!');
  } catch (err) {
    showToast('Erro na geração: ' + err.message);
  } finally {
    btn.disabled = false;
    spinner.classList.add('hidden');
  }
}

function renderActiveModalPerspective() {
  if (!dashboardState.currentGeneratedData || !dashboardState.currentGeneratedData.perspectives) return;
  const pData = dashboardState.currentGeneratedData.perspectives[dashboardState.activePerspective];
  if (!pData) return;

  document.getElementById('modalHookView').innerText = pData.hook || '';
  document.getElementById('modalTextView').innerText = pData.post_content || '';
  document.getElementById('modalPromptView').innerText = pData.image_prompt || '';
}

function getCurrentPostFromModal() {
  const hook = document.getElementById('modalHookView').innerText;
  const text = document.getElementById('modalTextView').innerText;
  if (hook.includes('gancho viral') || text.includes('Preencha o tema')) return '';
  return `${hook}\n\n${text}`.trim();
}

function openPublishModal(prefillContent = '') {
  const modal = document.getElementById('modalPublicar');
  const txtArea = document.getElementById('publishTextContent');
  if (prefillContent) {
    txtArea.value = prefillContent;
  } else if (!txtArea.value.trim()) {
    txtArea.value = document.getElementById('postText1').innerText.trim();
  }
  document.getElementById('publishFeedbackBox').classList.add('hidden');
  modal.classList.remove('hidden');
}

async function handleExecutePublish() {
  const content = document.getElementById('publishTextContent').value.trim();
  if (!content) {
    showToast('Informe o texto do post.');
    return;
  }

  const mode = document.querySelector('input[name="apiMode"]:checked').value;
  const btn = document.getElementById('btnExecutePublish');
  btn.disabled = true;

  try {
    let imageUrn = null;

    // Se houver imagem selecionada, faz o upload primeiro
    if (selectedImageFile) {
      btn.innerText = 'Fazendo upload da imagem no LinkedIn...';
      const formData = new FormData();
      formData.append('file', selectedImageFile);
      formData.append('mode', mode);

      const upRes = await fetch('/api/upload-image', {
        method: 'POST',
        body: formData
      });

      if (!upRes.ok) {
        const upErr = await upRes.json();
        throw new Error(upErr.detail || 'Falha no upload da imagem para o LinkedIn');
      }

      const upData = await upRes.json();
      imageUrn = upData.image_urn;
    }

    btn.innerText = 'Publicando no LinkedIn...';
    const res = await fetch('/api/publish', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        post_content: content,
        mode: mode,
        image_urn: imageUrn
      })
    });

    const result = await res.json();
    const box = document.getElementById('publishFeedbackBox');
    box.classList.remove('hidden');

    if (result.status === 'success') {
      const imgBadge = imageUrn ? '<span style="color:#60a5fa; font-weight:600;"> (com imagem anexada)</span>' : '';
      box.innerHTML = `
        <div style="background:rgba(16,185,129,0.15); border:1px solid #10b981; padding:0.75rem; border-radius:6px;">
          <strong style="color:#34d399;">✅ ${result.message}${imgBadge}</strong>
          <div style="font-size:0.75rem; color:#d4d4d8; margin-top:4px;">
            URN: <code>${result.post_urn}</code> &bull; Protocolo: <code>X-Restli-Protocol-Version: 2.0.0</code>
          </div>
        </div>
      `;
      dashboardState.publicadosCount += 1;
      document.getElementById('kpiPublicadosCount').innerText = dashboardState.publicadosCount;
      showToast('Publicação com imagem processada com sucesso!');
    } else {
      box.innerHTML = `
        <div style="background:rgba(239,68,68,0.15); border:1px solid #ef4444; padding:0.75rem; border-radius:6px;">
          <strong style="color:#f87171;">❌ ${result.message}</strong>
          <div style="font-size:0.75rem; color:#fca5a5; margin-top:4px;">${result.error_body || ''}</div>
        </div>
      `;
    }
  } catch (err) {
    showToast('Erro ao publicar: ' + err.message);
  } finally {
    btn.disabled = false;
    btn.innerText = 'Disparar Publicação';
  }
}

function addNewPostToDashboardFeed(title, body) {
  const list = document.getElementById('generatedPostsList');
  const now = new Date();
  const timeStr = `${String(now.getDate()).padStart(2, '0')} ${now.toLocaleString('pt-BR', { month: 'short' })}, ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const targetId = 'dynPost_' + Date.now();

  const item = document.createElement('div');
  item.className = 'post-preview-item';
  item.innerHTML = `
    <div class="post-item-header">
      <span class="post-prompt-title">${title} &bull; ${timeStr}</span>
      <button class="copy-icon-btn" title="Copiar Post" data-target="${targetId}">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
        </svg>
      </button>
    </div>
    <div class="post-item-body" id="${targetId}">${body}</div>
  `;

  list.insertBefore(item, list.firstChild);
  bindCopyButtons();
}
