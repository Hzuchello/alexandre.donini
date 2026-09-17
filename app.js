/* ============================================================
   CONFIGURAÇÃO — preencher antes de publicar o site
   ============================================================
   1) OJAS_CHAT_WEBHOOK_URL: URL do webhook do n8n que recebe as
      mensagens do chat (o "Chat Trigger" com chatInput + sessionId,
      conforme a arquitetura já definida no seu workflow).
   2) OJAS_INTEREST_WEBHOOK_URL: URL do webhook do n8n que recebe
      o formulário de "Registrar interesse".
   Enquanto estiverem vazias, o site funciona normalmente, mas o
   chat e o formulário mostram um aviso amigável em vez de enviar
   os dados (nenhuma mensagem é perdida silenciosamente).
============================================================ */
const OJAS_CHAT_WEBHOOK_URL = "   https://overfunctioning-undefensibly-johnette.ngrok-free.dev/http:/webhook/1d08054d-8c65-44d8-94ea-2f199427137a/chat";
const OJAS_INTEREST_WEBHOOK_URL = "";

document.getElementById('year').textContent = new Date().getFullYear();

/* ---- NAV scroll + mobile menu ---- */
const nav = document.getElementById('siteNav');
window.addEventListener('scroll', () => {
  nav.classList.toggle('scrolled', window.scrollY > 40);
}, { passive: true });

const navBurger = document.getElementById('navBurger');
const navLinks = document.getElementById('navLinks');
navBurger.addEventListener('click', () => navLinks.classList.toggle('open'));
navLinks.querySelectorAll('a').forEach(a => a.addEventListener('click', () => navLinks.classList.remove('open')));

/* ---- FORMULÁRIO DE INTERESSE ---- */
const form = document.getElementById('interesse-form');
const formStatus = document.getElementById('formStatus');

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const nome = document.getElementById('f-nome').value.trim();
  const contato = document.getElementById('f-contato').value.trim();
  const modalidade = document.getElementById('f-modalidade').value;
  const mensagem = document.getElementById('f-mensagem').value.trim();

  if (!nome || !contato) {
    formStatus.textContent = 'Preencha nome e uma forma de contato.';
    formStatus.className = 'form-status err';
    return;
  }

  const payload = { nome, contato, modalidade, mensagem, origem: 'site-vitrine', data: new Date().toISOString() };

  if (!OJAS_INTEREST_WEBHOOK_URL) {
    formStatus.textContent = 'Recebido — em breve o consultório entrará em contato. (Webhook de integração ainda não configurado.)';
    formStatus.className = 'form-status ok';
    form.reset();
    return;
  }

  const submitBtn = form.querySelector('button[type="submit"]');
  submitBtn.disabled = true;
  formStatus.textContent = 'Enviando...';
  formStatus.className = 'form-status';

  try {
    const res = await fetch(OJAS_INTEREST_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error('status ' + res.status);
    formStatus.textContent = 'Recebido! Em breve o consultório entrará em contato.';
    formStatus.className = 'form-status ok';
    form.reset();
  } catch (err) {
    formStatus.textContent = 'Não foi possível enviar agora. Tente pelo WhatsApp: +55 41 9115-1535.';
    formStatus.className = 'form-status err';
  } finally {
    submitBtn.disabled = false;
  }
});

/* ---- ÔJAS BOT CHAT ---- */
const launcher = document.getElementById('ojas-launcher');
const panel = document.getElementById('ojas-panel');
const closeBtn = document.getElementById('ojasClose');
const body = document.getElementById('ojasBody');
const input = document.getElementById('ojasInput');
const sendBtn = document.getElementById('ojasSend');

const sessionId = (crypto.randomUUID ? crypto.randomUUID() : 'sess-' + Date.now() + '-' + Math.random().toString(36).slice(2));
let greeted = false;

function addMsg(text, who) {
  const div = document.createElement('div');
  div.className = 'msg ' + who;
  div.textContent = text;
  body.appendChild(div);
  body.scrollTop = body.scrollHeight;
  return div;
}

function showTyping() {
  const div = document.createElement('div');
  div.className = 'msg bot typing';
  div.innerHTML = '<span></span><span></span><span></span>';
  body.appendChild(div);
  body.scrollTop = body.scrollHeight;
  return div;
}

function openPanel() {
  panel.classList.add('open');
  panel.setAttribute('aria-hidden', 'false');
  launcher.setAttribute('aria-expanded', 'true');
  if (!greeted) {
    greeted = true;
    addMsg('Olá! Eu sou o Ôjas, assistente virtual do consultório do Alexandre. Posso tirar dúvidas sobre o atendimento ou registrar seu interesse em uma consulta. Como posso ajudar?', 'bot');
  }
  setTimeout(() => input.focus(), 300);
}

function closePanel() {
  panel.classList.remove('open');
  panel.setAttribute('aria-hidden', 'true');
  launcher.setAttribute('aria-expanded', 'false');
}

launcher.addEventListener('click', () => {
  panel.classList.contains('open') ? closePanel() : openPanel();
});
closeBtn.addEventListener('click', closePanel);

async function sendMessage() {
  const text = input.value.trim();
  if (!text) return;
  addMsg(text, 'user');
  input.value = '';
  sendBtn.disabled = true;

  if (!OJAS_CHAT_WEBHOOK_URL) {
    const typing = showTyping();
    setTimeout(() => {
      typing.remove();
      addMsg('O chat ainda não está conectado ao assistente (webhook de integração pendente). Fale pelo WhatsApp: +55 41 9115-1535.', 'bot');
      sendBtn.disabled = false;
    }, 500);
    return;
  }

  const typing = showTyping();
  try {
    const res = await fetch(OJAS_CHAT_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chatInput: text, sessionId })
    });
    const data = await res.json();
    typing.remove();
    const reply = data.output || data.text || data.reply || 'Desculpe, não consegui processar agora. Tente novamente.';
    addMsg(reply, 'bot');
  } catch (err) {
    typing.remove();
    addMsg('Não consegui me conectar agora. Fale pelo WhatsApp: +55 41 9115-1535.', 'bot');
  } finally {
    sendBtn.disabled = false;
  }
}

sendBtn.addEventListener('click', sendMessage);
input.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') sendMessage();
});
