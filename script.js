// Verificador de golpes: toda a análise acontece no navegador.
// Nada do que a pessoa cola é enviado para qualquer servidor.

// ---------- Utilitários de padrões ----------

// Permite escrever os termos sem acento: "transferencia" também acha "transferência".
const ACENTOS = {
  a: "[aáàâã]", e: "[eéê]", i: "[ií]", o: "[oóôõ]", u: "[uúü]", c: "[cç]"
};

function termoParaRegex(termo) {
  let s = "";
  for (const ch of termo.toLowerCase()) {
    if (ACENTOS[ch]) s += ACENTOS[ch];
    else if (ch === " ") s += "\\s+";
    else if (ch === "*") s += "[\\p{L}]*"; // "bloquead*" acha bloqueado, bloqueada...
    else s += ch.replace(/[.+?^${}()|[\]\\]/g, "\\$&");
  }
  return s;
}

function criarPadrao(termos) {
  const corpo = termos.map(termoParaRegex).join("|");
  return new RegExp("(?<![\\p{L}\\d])(?:" + corpo + ")(?![\\p{L}\\d])", "giu");
}

// ---------- Regras de texto ----------
// peso: quanto o sinal pesa na nota final (cada regra conta uma vez só).

const REGRAS = [
  {
    id: "dados",
    nome: "Pede senha, código ou dados",
    peso: 3,
    explicacao: "Bancos, governo e empresas sérias nunca pedem senha, código de verificação ou dados do cartão por mensagem.",
    termos: ["senha", "codigo de verificacao", "codigo de seguranca", "codigo que chegou", "codigo que te mandei",
      "codigo de 6 digitos", "token", "cvv", "codigo do cartao", "dados bancarios", "numero do cartao",
      "confirme seus dados", "atualize seus dados", "atualizar seus dados", "atualizar cadastro", "atualize seu cadastro",
      "foto do documento", "selfie segurando"]
  },
  {
    id: "numero-novo",
    nome: "Conhecido com número novo",
    peso: 3,
    explicacao: "Golpe muito comum: alguém finge ser parente ou amigo com “número novo” e logo pede dinheiro. Ligue para o número antigo da pessoa antes de qualquer coisa.",
    termos: ["troquei de numero", "numero novo", "meu novo numero", "esse e meu numero", "salva esse numero",
      "salva meu numero", "salva esse contato", "perdi meu celular", "meu celular quebrou", "celular quebrou"]
  },
  {
    id: "central",
    nome: "Fala como central do banco",
    peso: 3,
    explicacao: "Bancos não mandam mensagem nem ligam pedindo transferência “de segurança”, devolução de valores ou instalação de aplicativo.",
    termos: ["central de seguranca", "compra suspeita", "compra nao reconhecida", "voce reconhece", "movimentacao suspeita",
      "conta invadida", "conta de seguranca", "transferencia de seguranca", "gerente do banco", "setor de fraudes",
      "setor de seguranca", "estorno"]
  },
  {
    id: "acesso",
    nome: "Pede para instalar app ou dar acesso",
    peso: 3,
    explicacao: "Aplicativos de acesso remoto deixam o golpista controlar seu celular ou computador, inclusive o app do banco.",
    termos: ["anydesk", "teamviewer", "baixe o aplicativo", "instale o aplicativo", "baixar o aplicativo", "baixar o app",
      "baixe o app", "instale o app", "acesso remoto", "compartilhar a tela", "compartilhe a tela"]
  },
  {
    id: "dinheiro",
    nome: "Pede pagamento",
    peso: 2,
    explicacao: "Pix, transferência ou “só uma taxa” é o objetivo final da maioria dos golpes. Confirme por outro canal antes de pagar.",
    termos: ["pix", "chave pix", "transferencia", "transfere", "transferir", "deposito", "deposita", "taxa de liberacao",
      "pagar uma taxa", "pagar a taxa", "pague", "boleto", "me empresta", "emprestar", "faz um pix", "manda um pix",
      "faz uma transferencia", "te devolvo"]
  },
  {
    id: "urgencia",
    nome: "Cria pressa",
    peso: 2,
    explicacao: "Golpistas apressam você para não sobrar tempo de pensar ou de conferir com alguém.",
    termos: ["urgente", "urgencia", "imediatamente", "agora mesmo", "ultimas horas", "ultimo dia", "ainda hoje", "so hoje",
      "expira*", "prazo final", "sera bloquead*", "sera cancelad*", "sera suspens*", "em ate 24 horas", "nas proximas horas",
      "rapido", "corre"]
  },
  {
    id: "premio",
    nome: "Prêmio ou vantagem boa demais",
    peso: 2,
    explicacao: "Prêmio que você não pediu, sorteio que você não entrou ou “dinheiro esquecido” são iscas clássicas.",
    termos: ["parabens", "voce ganhou", "voce foi sorteado", "voce foi sorteada", "sorteado", "sorteada", "premio", "premiado",
      "premiada", "resgate*", "resgatar", "brinde", "gratis", "pontos expiram", "valores a receber", "dinheiro esquecido"]
  },
  {
    id: "ameaca",
    nome: "Ameaça de dívida, multa ou bloqueio",
    peso: 2,
    explicacao: "Mensagens sobre CPF irregular, multa ou benefício bloqueado assustam para a pessoa agir sem conferir. Consulte direto no site ou app oficial.",
    termos: ["cpf irregular", "cpf bloqueado", "cpf suspenso", "cpf cancelado", "pendencia*", "regularize", "regularizar",
      "receita federal", "restituicao", "multa", "divida*", "nome sujo", "serasa", "protesto", "inss", "beneficio bloqueado",
      "bloqueio do beneficio", "mandado", "intimacao", "processo judicial"]
  },
  {
    id: "renda",
    nome: "Promessa de dinheiro fácil",
    peso: 2,
    explicacao: "Ganhar para curtir vídeos, avaliar produtos ou investir com “lucro garantido” costuma terminar com você pagando para sacar.",
    termos: ["renda extra", "trabalhe de casa", "trabalho em casa", "curtir videos", "avaliar produtos", "tarefas pagas",
      "ganhe ate", "lucro garantido", "retorno garantido", "investimento garantido", "dobrar seu dinheiro", "sem sair de casa"]
  },
  {
    id: "encomenda",
    nome: "Encomenda retida",
    peso: 2,
    explicacao: "Avisos de encomenda presa com taxa para liberar são um golpe comum. Rastreie só pelo site oficial dos Correios ou da loja.",
    termos: ["correios", "encomenda retida", "encomenda pendente", "pacote retido", "entrega pendente", "taxa alfandegaria",
      "tributacao", "objeto aguardando", "taxa de entrega"]
  },
  {
    id: "segredo",
    nome: "Pede segredo",
    peso: 2,
    explicacao: "Pedir para não contar a ninguém serve para impedir que alguém de confiança perceba o golpe.",
    termos: ["nao conta pra ninguem", "nao conte pra ninguem", "nao conte a ninguem", "nao fale com ninguem",
      "nao comenta com ninguem", "segredo", "entre nos"]
  }
].map(r => ({ ...r, padrao: criarPadrao(r.termos) }));

// ---------- Análise de links ----------

const PADRAO_LINK = /(?:https?:\/\/|www\.)[^\s<>"']+|(?<![\p{L}\d@.-])[a-z0-9][a-z0-9-]*(?:\.[a-z0-9-]+)*\.(?:com|net|org|br|xyz|top|click|online|site|live|info|shop|store|app|link|me|io|ly|cc|ru|cn|vip|club|buzz|icu|tk|ml|ga|cf|gq|work|fun|rest|cfd|sbs|gl|at|gd|id|co)(?:\/[^\s<>"']*)?/giu;

const ENCURTADORES = ["bit.ly", "tinyurl.com", "cutt.ly", "is.gd", "encurtador.com.br", "rb.gy", "t.ly", "shorturl.at",
  "s.id", "ow.ly", "goo.gl", "tiny.cc", "v.gd", "abre.ai", "l1nk.dev"];

const TLDS_SUSPEITOS = ["xyz", "top", "click", "online", "site", "live", "shop", "icu", "buzz", "vip", "tk", "ml", "ga",
  "cf", "gq", "work", "fun", "rest", "cfd", "sbs", "ru", "cn"];

// Marcas muito usadas em golpes e seus domínios oficiais.
const MARCAS = {
  caixa: ["caixa.gov.br"], bradesco: ["bradesco.com.br", "bradesco"], itau: ["itau.com.br"],
  nubank: ["nubank.com.br"], santander: ["santander.com.br"], bancodobrasil: ["bb.com.br"],
  inss: ["inss.gov.br", "gov.br"], gov: ["gov.br"], govbr: ["gov.br"], receita: ["gov.br"], correios: ["correios.com.br"],
  serasa: ["serasa.com.br"], mercadolivre: ["mercadolivre.com.br", "mercadolivre.com"], shopee: ["shopee.com.br"],
  magalu: ["magazineluiza.com.br", "magalu.com"], americanas: ["americanas.com.br"], picpay: ["picpay.com"],
  whatsapp: ["whatsapp.com", "wa.me"], detran: ["gov.br"], cpf: ["gov.br"], pix: ["bcb.gov.br"], netflix: ["netflix.com"]
};

function hostDoLink(link) {
  let s = link.replace(/[).,;:!?]+$/, "");
  if (!/^https?:\/\//i.test(s)) s = "http://" + s;
  try { return new URL(s).hostname.toLowerCase(); } catch { return null; }
}

function analisarLink(link) {
  const motivos = [];
  const host = hostDoLink(link);
  if (!host) return motivos;

  if (ENCURTADORES.some(e => host === e || host.endsWith("." + e))) {
    motivos.push({ id: "link-curto", nome: "Link encurtado", peso: 2,
      explicacao: "Links encurtados escondem o endereço verdadeiro. Não dá para saber para onde ele leva antes de clicar." });
  }
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) {
    motivos.push({ id: "link-ip", nome: "Link com números no lugar do nome", peso: 3,
      explicacao: "Sites legítimos usam nome (como banco.com.br), não uma sequência de números." });
  }
  if (host.includes("xn--")) {
    motivos.push({ id: "link-disfarce", nome: "Link com letras disfarçadas", peso: 3,
      explicacao: "O endereço usa letras de outros alfabetos que imitam letras comuns, para parecer um site conhecido." });
  }
  const tld = host.split(".").pop();
  if (TLDS_SUSPEITOS.includes(tld)) {
    motivos.push({ id: "link-tld", nome: "Final de endereço incomum", peso: 2,
      explicacao: `Endereços terminados em “.${tld}” são baratos e muito usados em golpes. Bancos e governo brasileiros usam .com.br ou .gov.br.` });
  }
  const partes = host.split(/[.-]/);
  for (const [marca, oficiais] of Object.entries(MARCAS)) {
    const usaMarca = partes.some(p => p === marca || (marca.length >= 5 && p.startsWith(marca)));
    const ehOficial = oficiais.some(o => host === o || host.endsWith("." + o));
    if (usaMarca && !ehOficial) {
      motivos.push({ id: "link-marca-" + marca, nome: "Link imita site conhecido", peso: 3,
        explicacao: `O endereço usa o nome “${marca}”, mas não é o site oficial. Golpistas copiam nomes de empresas para enganar.` });
      break;
    }
  }
  if ((host.match(/-/g) || []).length >= 2) {
    motivos.push({ id: "link-hifens", nome: "Endereço cheio de hífens", peso: 1,
      explicacao: "Endereços como “seguro-banco-atualiza.com” imitam sites oficiais juntando palavras." });
  }
  if (/^http:\/\//i.test(link)) {
    motivos.push({ id: "link-http", nome: "Link sem cadeado (http)", peso: 1,
      explicacao: "O link não usa conexão segura (https). Nenhum banco usa isso." });
  }
  return motivos;
}

// ---------- Análise completa ----------

function analisar(texto) {
  const motivos = new Map(); // id -> motivo (cada sinal conta uma vez)
  const trechos = [];        // { inicio, fim, id }

  for (const regra of REGRAS) {
    regra.padrao.lastIndex = 0;
    for (const m of texto.matchAll(regra.padrao)) {
      motivos.set(regra.id, regra);
      trechos.push({ inicio: m.index, fim: m.index + m[0].length, id: regra.id });
    }
  }

  let temLink = false;
  for (const m of texto.matchAll(PADRAO_LINK)) {
    temLink = true;
    const doLink = analisarLink(m[0]);
    doLink.forEach(mo => { if (!motivos.has(mo.id)) motivos.set(mo.id, mo); });
    trechos.push({ inicio: m.index, fim: m.index + m[0].length, id: doLink[0] ? doLink[0].id : "link" });
  }

  // Combinações clássicas pesam mais.
  if (motivos.has("numero-novo") && motivos.has("dinheiro")) {
    motivos.set("combo-numero", { id: "combo-numero", nome: "Número novo + pedido de dinheiro", peso: 3,
      explicacao: "Essa combinação é o roteiro do golpe do falso parente. Ligue para o número antigo da pessoa." });
  }
  if (motivos.has("central") && (motivos.has("dinheiro") || motivos.has("acesso"))) {
    motivos.set("combo-central", { id: "combo-central", nome: "“Banco” pedindo pagamento ou acesso", peso: 3,
      explicacao: "Banco de verdade nunca pede para você transferir dinheiro ou instalar app para “proteger” a conta." });
  }

  const lista = [...motivos.values()];
  const pontos = lista.reduce((s, m) => s + m.peso, 0) + (temLink && lista.length ? 1 : 0);

  let nivel;
  if (pontos === 0) nivel = "limpo";
  else if (pontos <= 3) nivel = "atencao";
  else if (pontos <= 6) nivel = "suspeito";
  else nivel = "golpe";

  return { nivel, pontos, motivos: lista, trechos, temLink };
}

// ---------- Interface ----------

const NIVEIS = {
  limpo: { titulo: "Não encontrei sinais comuns de golpe",
    texto: "Isso não garante que a mensagem é segura. Golpes novos podem passar sem ser notados. Se envolver dinheiro, confira mesmo assim." },
  atencao: { titulo: "Atenção: há sinais de alerta",
    texto: "A mensagem tem alguns sinais usados em golpes. Confira por outro caminho antes de fazer o que ela pede." },
  suspeito: { titulo: "Mensagem suspeita",
    texto: "Vários sinais de golpe aparecem juntos. Não clique em links, não pague e não passe dados." },
  golpe: { titulo: "Muito provavelmente é golpe",
    texto: "A mensagem segue o roteiro de golpes conhecidos. Não responda, não clique e não pague nada." }
};

const PASSOS = {
  base: [
    "Não clique no link e não responda à mensagem.",
    "Confira por um caminho que você já conhece: o app oficial, o número atrás do seu cartão ou uma ligação para o número antigo da pessoa.",
    "Nunca passe senha ou código que chegou por SMS, nem para quem diz ser do banco."
  ],
  caiu: [
    "Ligue agora para o seu banco pelo número oficial e conte o que aconteceu.",
    "Se pagou por Pix, peça ao banco para acionar o MED (Mecanismo Especial de Devolução) o quanto antes.",
    "Troque as senhas que você passou e ative a verificação em duas etapas no WhatsApp.",
    "Registre um boletim de ocorrência. Na maioria dos estados dá para fazer pela delegacia online.",
    "Bloqueie e denuncie o número no WhatsApp."
  ]
};

function escaparHtml(s) {
  return s.replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function marcarTexto(texto, trechos, numeros) {
  const ordenados = [...trechos].sort((a, b) => a.inicio - b.inicio || b.fim - a.fim);
  let html = "", pos = 0;
  for (const t of ordenados) {
    if (t.inicio < pos) continue; // ignora sobreposições
    html += escaparHtml(texto.slice(pos, t.inicio));
    const n = numeros.get(t.id);
    const rotulo = n ? `<sup aria-hidden="true">${n}</sup>` : "";
    html += `<mark class="${t.id.startsWith("link") ? "marca-link" : ""}"${n ? ` aria-describedby="motivo-${n}"` : ""}>` +
      escaparHtml(texto.slice(t.inicio, t.fim)) + rotulo + "</mark>";
    pos = t.fim;
  }
  return html + escaparHtml(texto.slice(pos));
}

function mostrarResultado(texto) {
  const r = analisar(texto);
  const area = document.getElementById("resultado");
  const nivel = NIVEIS[r.nivel];

  const numeros = new Map();
  r.motivos.forEach((m, i) => numeros.set(m.id, i + 1));

  const motivosHtml = r.motivos.length
    ? `<h3>Por que</h3><ol class="motivos">${r.motivos.map((m, i) =>
        `<li id="motivo-${i + 1}"><strong>${escaparHtml(m.nome)}.</strong> ${escaparHtml(m.explicacao)}</li>`).join("")}</ol>`
    : "";

  const passosHtml = `
    <h3>O que fazer agora</h3>
    <ul class="passos">${PASSOS.base.map(p => `<li>${p}</li>`).join("")}</ul>
    <details class="caiu">
      <summary>Já paguei ou passei meus dados</summary>
      <ul class="passos">${PASSOS.caiu.map(p => `<li>${p}</li>`).join("")}</ul>
    </details>`;

  area.innerHTML = `
    <div class="veredito nivel-${r.nivel}" role="status">
      <h2 tabindex="-1" id="veredito-titulo">${nivel.titulo}</h2>
      <p>${nivel.texto}</p>
    </div>
    ${r.trechos.length ? `<h3>Sua mensagem, com os trechos de alerta marcados</h3>
      <blockquote class="mensagem-marcada">${marcarTexto(texto, r.trechos, numeros)}</blockquote>` : ""}
    ${motivosHtml}
    ${passosHtml}`;

  area.hidden = false;
  document.getElementById("veredito-titulo").focus();
}

// ---------- Exemplos ----------

const EXEMPLOS = {
  parente: "Oi mãe, troquei de número, salva esse aqui. Tô com um problema urgente, consegue fazer um pix de R$ 850 pra mim? Amanhã te devolvo. Não conta pra ninguém por enquanto.",
  banco: "BRADESCO INFORMA: Compra não reconhecida de R$ 2.399,00 em seu cartão. Caso não reconheça, acesse imediatamente http://bradesco-seguranca-cliente.top/validar e confirme seus dados para evitar bloqueio.",
  encomenda: "Correios: sua encomenda está retida por falta de pagamento da taxa alfandegária. Pague em até 24 horas ou o objeto será devolvido: bit.ly/correios-taxa"
};

// ---------- Ligações dos botões ----------

document.addEventListener("DOMContentLoaded", () => {
  const campo = document.getElementById("mensagem");
  const form = document.getElementById("form-verificar");
  const aviso = document.getElementById("aviso-vazio");

  form.addEventListener("submit", e => {
    e.preventDefault();
    const texto = campo.value.trim();
    if (!texto) {
      aviso.hidden = false;
      campo.focus();
      return;
    }
    aviso.hidden = true;
    mostrarResultado(texto);
  });

  document.getElementById("limpar").addEventListener("click", () => {
    campo.value = "";
    document.getElementById("resultado").hidden = true;
    aviso.hidden = true;
    campo.focus();
  });

  document.querySelectorAll("[data-exemplo]").forEach(botao => {
    botao.addEventListener("click", () => {
      campo.value = EXEMPLOS[botao.dataset.exemplo];
      aviso.hidden = true;
      mostrarResultado(campo.value);
    });
  });
});

// Exporta para testes no Node (não afeta o navegador).
if (typeof module !== "undefined") module.exports = { analisar };
