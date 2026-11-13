// Verificador de golpes, versão 2.
// Toda a análise acontece no navegador: nada do que a pessoa cola é enviado para servidor nenhum.
//
// Como funciona:
// 1. O texto é "normalizado": sem acento, minúsculo, números no lugar de letras viram letras
//    (s3nh4 -> senha), letras repetidas são encurtadas (urgenteee -> urgente), letras
//    separadas são juntadas (p.i.x -> pix) e abreviações viram a palavra inteira (vc -> voce).
// 2. Cada regra tem frases típicas de golpe. A comparação tolera erros de digitação
//    (trocar, sobrar ou faltar uma letra) sem confundir palavras comuns.
// 3. Links são analisados à parte: encurtadores, nomes de empresas falsificados,
//    endereços parecidos com os oficiais, finais incomuns etc.
// 4. Sinais somam pontos e algumas combinações clássicas pesam mais.

// ======================================================================
// 1. Normalização do texto
// ======================================================================

const LEET = { "0": "o", "1": "i", "3": "e", "4": "a", "5": "s", "7": "t", "@": "a", "$": "s" };

const ABREVIACOES = {
  vc: "voce", vcs: "voces", voc: "voce", q: "que", n: "nao", ñ: "nao", naum: "nao", ngm: "ninguem",
  ningm: "ninguem", nimguem: "ninguem", hj: "hoje", agr: "agora", cel: "celular", num: "numero", nmr: "numero",
  numr: "numero", nro: "numero", msg: "mensagem", msgm: "mensagem", tb: "tambem", tbm: "tambem", pra: "para",
  pro: "para", pfv: "favor", pfvr: "favor", pf: "favor", cod: "codigo", codg: "codigo", zap: "whatsapp",
  zapzap: "whatsapp", wpp: "whatsapp", whats: "whatsapp", wats: "whatsapp", watsapp: "whatsapp",
  whatsap: "whatsapp", transf: "transferencia", tranf: "transferencia", pics: "pix", piks: "pix", pixe: "pix",
  pixzinho: "pix", urg: "urgente", mainha: "mae", mamae: "mae", mami: "mae", painho: "pai", papai: "pai",
  td: "tudo", dps: "depois", ctz: "certeza", vlw: "valeu", obg: "obrigado", tô: "to", ta: "esta", tá: "esta",
  rs: "reais", emprest: "empresta", deposit: "deposito", d: "de", aki: "aqui", aq: "aqui", ki: "que",
  oq: "oque", ce: "voce", cê: "voce", tmb: "tambem", vdd: "verdade", blz: "beleza", hrs: "horas", hr: "hora"
};

// Palavras comuns que ficam a uma letra de distância de um termo de golpe.
// Elas nunca são aceitas como "erro de digitação".
const NUNCA_APROXIMAR = new Set([
  "mandando", "muita", "muito", "venha", "sena", "pronto", "ponto", "segundo", "conto", "acorda", "acordou",
  "auxilia", "gratos", "suspense", "pagou", "pegue", "ligou", "correu", "corre", "dividir", "dividi",
  "premiu", "processa", "proceso", "boletim", "bolero", "entorno", "senhor", "senhora", "tokens"
]);

function ehLetra(c) { return c >= "a" && c <= "z"; }
function ehDigito(c) { return c >= "0" && c <= "9"; }

// Troca números e símbolos que imitam letras, só quando estão no meio de letras.
function desfazerDisfarce(t) {
  const letras = [...t].filter(ehLetra).length;
  if (letras < 1 || t.length < 2) return t;
  const c = [...t];
  return c.map((ch, i) => {
    if (!(ch in LEET)) return ch;
    const ant = c[i - 1] || "", prox = c[i + 1] || "";
    const vizinhoLetra = ehLetra(ant) || ehLetra(prox);
    const vizinhoDigito = ehDigito(ant) || ehDigito(prox);
    return vizinhoLetra && !vizinhoDigito ? LEET[ch] : ch;
  }).join("");
}

// Transforma o texto em uma lista de palavras normalizadas, cada uma com sua posição no texto original.
function tokenizar(texto) {
  const chars = [], pos = [];
  for (let i = 0; i < texto.length; i++) {
    const b = texto[i].normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    if (b === "") continue;
    chars.push(b[0]);
    pos.push(i);
  }
  const s = chars.join("");

  let toks = [];
  const re = /[a-z0-9@$]+/g;
  let m;
  while ((m = re.exec(s))) {
    const limpo = desfazerDisfarce(m[0]);
    const sub = /[a-z]+|[0-9]+/g;
    let k;
    while ((k = sub.exec(limpo))) {
      const t = k[0].replace(/([a-z])\1{2,}/g, "$1"); // urgenteee -> urgente
      toks.push({ t, a: m.index + k.index, b: m.index + k.index + k[0].length });
    }
  }

  // Junta letras soltas separadas por um caractere: "p.i.x", "s e n h a".
  const juntos = [];
  for (let i = 0; i < toks.length; i++) {
    let j = i;
    while (j + 1 < toks.length && toks[j].t.length === 1 && toks[j + 1].t.length === 1 &&
      ehLetra(toks[j].t) && ehLetra(toks[j + 1].t) && toks[j + 1].a - toks[j].b === 1) j++;
    if (j - i >= 2) {
      juntos.push({ t: toks.slice(i, j + 1).map(x => x.t).join(""), a: toks[i].a, b: toks[j].b });
      i = j;
    } else juntos.push(toks[i]);
  }

  return juntos.map(x => ({
    t: ABREVIACOES[x.t] || x.t,
    ini: pos[x.a],
    fim: pos[x.b - 1] + 1
  }));
}

// ======================================================================
// 2. Comparação tolerante a erros de digitação
// ======================================================================

// Distância de edição (com troca de letras vizinhas contando como 1).
function distancia(a, b, max) {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  const d = [];
  for (let i = 0; i <= a.length; i++) { d[i] = [i]; }
  for (let j = 0; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    let menor = Infinity;
    for (let j = 1; j <= b.length; j++) {
      const custo = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + custo);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
      menor = Math.min(menor, d[i][j]);
    }
    if (menor > max) return max + 1;
  }
  return d[a.length][b.length];
}

// Para palavras de 5 letras: aceita letra a mais, a menos ou duas trocadas de lugar, mas não letra trocada por outra.
function quaseIgualCurta(tok, termo) {
  if (tok.length === termo.length) {
    const dif = [];
    for (let i = 0; i < tok.length; i++) if (tok[i] !== termo[i]) dif.push(i);
    return dif.length === 2 && dif[1] === dif[0] + 1 && tok[dif[0]] === termo[dif[1]] && tok[dif[1]] === termo[dif[0]];
  }
  const [maior, menor] = tok.length > termo.length ? [tok, termo] : [termo, tok];
  if (maior.length - menor.length !== 1) return false;
  for (let i = 0; i < maior.length; i++) {
    if (maior.slice(0, i) + maior.slice(i + 1) === menor) return true;
  }
  return false;
}

function palavraBate(tok, p) {
  if (p.prefixo) return tok.startsWith(p.t);
  if (tok === p.t) return true;
  const L = p.t.length;
  if (L <= 4 || p.exata) return false;
  if (tok[0] !== p.t[0] || NUNCA_APROXIMAR.has(tok)) return false;
  if (L === 5) return quaseIgualCurta(tok, p.t);
  const max = L >= 9 ? 2 : 1;
  return distancia(tok, p.t, max) <= max;
}

// Prepara um termo: "sera bloquead*" -> [{t:"sera"}, {t:"bloquead", prefixo:true}]
function prepararTermo(termo) {
  const palavras = [];
  for (const w of termo.toLowerCase().split(/\s+/).filter(Boolean)) {
    const prefixo = w.endsWith("*");
    const exata = w.startsWith("=");
    const toks = tokenizar(w.replace(/[*=]/g, ""));
    toks.forEach((tk, i) => palavras.push({ t: tk.t, prefixo: prefixo && i === toks.length - 1, exata }));
  }
  return palavras;
}

// Procura um termo na lista de palavras. Entre as palavras de uma frase, aceita uma palavra extra
// (ex.: "não conta isso pra ninguém" ainda bate com "não conta para ninguém").
function procurarTermo(toks, palavras) {
  const achados = [];
  for (let i = 0; i < toks.length; i++) {
    if (!palavraBate(toks[i].t, palavras[0])) continue;
    let j = i, pulos = 0, ok = true;
    for (let w = 1; w < palavras.length; w++) {
      if (j + 1 < toks.length && palavraBate(toks[j + 1].t, palavras[w])) { j += 1; continue; }
      if (pulos === 0 && palavras.length >= 3 && j + 2 < toks.length && palavraBate(toks[j + 2].t, palavras[w])) {
        j += 2; pulos++; continue;
      }
      ok = false; break;
    }
    if (ok) achados.push({ ini: toks[i].ini, fim: toks[j].fim });
  }
  return achados;
}

// ======================================================================
// 3. Regras de texto
// ======================================================================
// peso: quanto o sinal pesa na nota (cada regra conta uma vez só, mesmo que apareça várias vezes).
// Termos: escreva sem acento. "*" no fim pega variações (bloquead* -> bloqueado, bloqueada).
// "=" no começo exige a palavra exata, sem tolerância a erro.

const REGRAS = [
  {
    id: "dados", nome: "Pede senha, código ou dados", peso: 3,
    explicacao: "Bancos, governo e empresas sérias nunca pedem senha, código de verificação ou dados do cartão por mensagem. Quem tem o código do WhatsApp consegue roubar sua conta.",
    termos: ["sua senha", "a senha do banco", "senha do banco", "senha do cartao", "senha do app", "senha da conta",
      "digite sua senha", "informe sua senha", "confirme sua senha", "me passa a senha", "manda a senha",
      "senha de 4", "senha de 6", "token", "cvv",
      "codigo do cartao", "dados bancarios", "numero do cartao", "data de validade", "confirme seus dados",
      "confirmar seus dados", "atualize seus dados", "atualizar seus dados", "atualizar cadastro",
      "atualize seu cadastro", "atualizar seu cadastro", "atualizacao cadastral", "foto do documento", "foto da identidade",
      "selfie segurando", "foto do rosto", "chave de seguranca", "validar sua conta", "valide sua conta"]
  },
  {
    id: "codigo", nome: "Pede o código que chegou por SMS", peso: 4,
    explicacao: "Esse código serve para ativar sua conta do WhatsApp ou do banco em outro celular. Quem tem o código consegue roubar sua conta. Nunca passe para ninguém.",
    termos: ["codigo de verificacao", "codigo de seguranca", "codigo de ativacao", "codigo de confirmacao",
      "codigo que chegou", "codigo que te mandei", "codigo que te enviei", "codigo que foi enviado",
      "codigo que voce recebeu", "codigo por sms", "codigo de 6", "codigo de seis", "manda o codigo",
      "me manda o codigo", "me passa o codigo", "passa o codigo", "envia o codigo", "envie o codigo",
      "me envia o codigo", "mandei um codigo", "enviei um codigo", "codigo sem querer", "suporte do whatsapp",
      "equipe do whatsapp"]
  },
  {
    id: "cartao", nome: "Quer buscar seu cartão", peso: 4,
    explicacao: "Banco nunca manda motoboy ou funcionário buscar cartão na sua casa, nem pede para cortar o cartão e entregar.",
    termos: ["motoboy", "buscar o cartao", "buscar seu cartao", "recolher o cartao", "recolher seu cartao",
      "retirar o cartao", "entregar o cartao", "entregue o cartao", "cortar o cartao", "corte o cartao",
      "portador para buscar"]
  },
  {
    id: "numero-novo", nome: "Conhecido com número novo", peso: 3,
    explicacao: "Golpe muito comum: alguém finge ser parente ou amigo com “número novo” e logo pede dinheiro. Confirme ligando para o número antigo da pessoa.",
    termos: ["troquei de numero", "troquei o numero", "troquei meu numero", "mudei de numero", "mudei meu numero",
      "numero novo", "novo numero", "meu novo numero", "esse e meu numero", "esse e o meu numero", "salva esse numero",
      "salva meu numero", "salva esse contato", "salva meu contato", "salva ai", "anota esse numero",
      "perdi meu celular", "perdi o celular", "meu celular quebrou", "celular quebrou", "celular caiu",
      "roubaram meu celular", "celular foi roubado", "to sem celular", "to usando o celular de", "numero de uma amiga",
      "numero de um amigo", "esse numero e temporario"]
  },
  {
    id: "central", nome: "Fala como central do banco", peso: 3,
    explicacao: "Bancos não mandam mensagem nem ligam pedindo transferência “de segurança”, devolução de valores, entrega de cartão ou instalação de aplicativo.",
    termos: ["central de seguranca", "central de atendimento", "central antifraude", "setor antifraude",
      "setor de fraudes", "setor de seguranca", "compra suspeita", "compra nao reconhecida", "voce reconhece",
      "reconhece essa compra", "movimentacao suspeita", "transacao suspeita", "acesso suspeito",
      "tentativa de acesso", "conta invadida", "conta de seguranca", "conta segura", "transferencia de seguranca",
      "gerente do banco", "seu gerente", "estorno", "cancelar a compra", "cancelamento da compra",
      "febraban", "banco central", "suporte tecnico"]
  },
  {
    id: "acesso", nome: "Pede para instalar app ou dar acesso", peso: 3,
    explicacao: "Aplicativos de acesso remoto deixam o golpista controlar seu celular ou computador, inclusive o app do banco.",
    termos: ["anydesk", "teamviewer", "rustdesk", "baixe o aplicativo", "instale o aplicativo", "baixar o aplicativo",
      "baixar o app", "baixe o app", "instale o app", "instalar o app", "acesso remoto", "compartilhar a tela",
      "compartilhe a tela", "compartilhamento de tela", "arquivo apk", "=apk"]
  },
  {
    id: "dinheiro", nome: "Pede pagamento", peso: 2,
    explicacao: "Pix, transferência ou “só uma taxa” é o objetivo final da maioria dos golpes. Confirme por outro canal antes de pagar.",
    termos: ["=pix", "chave pix", "transferencia", "transfere", "transferir", "deposito", "deposita", "depositar",
      "taxa de liberacao", "taxa de adesao", "taxa de cadastro", "pagar uma taxa", "pagar a taxa", "pague",
      "pagamento antecipado", "boleto", "me empresta", "empresta", "emprestar", "faz um pix", "faz o pix",
      "manda um pix", "me manda um pix", "faz uma transferencia", "te devolvo", "te pago amanha", "devolvo amanha",
      "preciso de dinheiro", "preciso pagar", "consegue me ajudar com", "qr code", "copia e cola", "pagar o frete",
      "pagando o frete", "pagando so o frete", "so o frete", "=deposite"]
  },
  {
    id: "urgencia", nome: "Cria pressa", peso: 2,
    explicacao: "Golpistas apressam você para não sobrar tempo de pensar ou de conferir com alguém.",
    termos: ["urgente", "urgencia", "imediatamente", "agora mesmo", "ultimas horas", "ultimo dia", "ainda hoje",
      "so hoje", "=expira*", "prazo final", "sera bloquead*", "sera cancelad*", "sera suspens*", "sera encerrad*",
      "vai ser bloquead*", "foi bloquead*", "em ate 24 horas", "em 24 horas", "em 24h", "nas proximas horas",
      "evitar o bloqueio", "evitar bloqueio", "evitar o cancelamento", "evitar cancelamento", "nao perca",
      "o quanto antes", "o mais rapido possivel", "ate hoje", "ate amanha"]
  },
  {
    id: "premio", nome: "Prêmio ou vantagem boa demais", peso: 2,
    explicacao: "Prêmio que você não pediu, sorteio que você não entrou ou “dinheiro esquecido” são iscas clássicas.",
    termos: ["voce ganhou", "voce foi sorteado", "voce foi sorteada", "foi o sorteado", "foi a sorteada",
      "ganhou um premio", "ganhou o premio", "premio de r", "premio em dinheiro", "parabens voce", "=resgate*",
      "resgatar o premio", "resgatar seu premio", "pontos expiram", "seus pontos expiram",
      "cashback", "valores a receber", "dinheiro esquecido", "voce foi selecionado", "voce foi selecionada",
      "oferta exclusiva", "brinde exclusivo", "ganhou um premio", "ganhou um brinde"]
  },
  {
    id: "ameaca", nome: "Ameaça de dívida, multa ou bloqueio", peso: 2,
    explicacao: "Mensagens sobre CPF irregular, multa ou nome negativado assustam para a pessoa agir sem conferir. Consulte direto no site ou app oficial.",
    termos: ["cpf irregular", "cpf bloqueado", "cpf suspenso", "cpf cancelado", "=pendencia*", "regularize",
      "regularizar", "regularizacao", "receita federal", "restituicao", "multa", "=divida*", "nome sujo",
      "nome negativado", "negativacao", "serasa", "protesto", "mandado de prisao", "intimacao",
      "processo judicial", "oficial de justica", "conta bloqueada", "cartao bloqueado", "detran",
      "licenciamento", "ipva atrasado"]
  },
  {
    id: "beneficio", nome: "Promessa de benefício do governo", peso: 2,
    explicacao: "Golpistas usam nomes de programas do governo para pedir dados ou taxas. Benefícios só se consultam no app oficial ou no gov.br.",
    termos: ["bolsa familia", "auxilio", "fgts", "saque do fgts", "abono", "=pis", "pe de meia", "desenrola",
      "cnh social", "beneficio", "inss", "aposentadoria", "revisao da vida toda", "valor liberado",
      "valores liberados"]
  },
  {
    id: "advogado", nome: "Falso advogado ou processo", peso: 2,
    explicacao: "No golpe do falso advogado, criminosos usam dados públicos de processos e pedem uma “taxa” para liberar um valor. Fale com seu advogado pelo telefone que você já tem.",
    termos: ["advogado", "advogada", "escritorio de advocacia", "seu processo", "sua acao", "causa ganha",
      "ganhou a causa", "ganhou o processo", "alvara", "indenizacao", "precatorio", "custas processuais",
      "liberacao de valores", "liberacao do valor", "liberar o valor", "liberar seu dinheiro", "=oab"]
  },
  {
    id: "romance", nome: "Pedido de dinheiro de um par romântico à distância", peso: 2,
    explicacao: "No golpe do amor, a pessoa constrói um romance à distância, nunca aparece em vídeo e um dia pede dinheiro por causa de uma emergência ou de uma encomenda presa. Desconfie de quem diz amar sem nunca ter te encontrado.",
    termos: ["meu amor", "meu bem", "minha rainha", "meu rei", "amor da minha vida", "te amo tanto", "nunca te encontrei",
      "ainda nao nos conhecemos", "preso no aeroporto", "retido na alfandega", "pagar a alfandega", "soldado em missao",
      "medico fora do pais", "engenheiro fora do pais", "plataforma de petroleo", "te mandar um presente",
      "pacote preso", "liberar o pacote", "so confio em voce", "nossa historia de amor"]
  },
  {
    id: "renda", nome: "Promessa de dinheiro fácil", peso: 3,
    explicacao: "Ganhar para curtir vídeos, avaliar produtos ou trabalhar de casa sem experiência costuma terminar com você pagando para “sacar” ou para “subir de nível”.",
    termos: ["renda extra", "trabalhe de casa", "trabalho em casa", "curtir videos", "avaliar produtos",
      "tarefas pagas", "tarefa paga", "ganhe ate", "ganhos diarios", "renda diaria", "por dia sem sair",
      "sem sair de casa", "sem experiencia", "comissao por tarefa", "vaga home office",
      "ganhe dinheiro", "dinheiro extra", "so curtir", "curtindo videos", "avaliando produtos",
      "ganho diario", "saque diario", "deposito inicial", "primeira tarefa gratis", "ganhe ate r", "por dia trabalhando"]
  },
  {
    id: "investimento", nome: "Investimento com lucro garantido", peso: 2,
    explicacao: "Nenhum investimento sério garante lucro alto e rápido. Promessas assim, ainda mais com cripto, são o golpe da pirâmide ou da falsa corretora.",
    termos: ["lucro garantido", "retorno garantido", "rendimento garantido", "investimento garantido",
      "dobrar seu dinheiro", "multiplicar seu dinheiro", "rende ate", "rendimento de", "=bitcoin",
      "=cripto*", "trader", "corretora", "plataforma de investimento", "opcoes binarias", "sem risco"]
  },
  {
    id: "encomenda", nome: "Encomenda retida", peso: 2,
    explicacao: "Avisos de encomenda presa com taxa para liberar são um golpe comum. Rastreie só pelo site oficial dos Correios ou da loja.",
    termos: ["correios", "encomenda retida", "encomenda pendente", "sua encomenda", "pacote retido",
      "entrega pendente", "entrega nao realizada", "tentativa de entrega", "taxa alfandegaria", "tributacao",
      "objeto aguardando", "taxa de entrega", "taxa de importacao", "endereco incompleto", "reagendar a entrega"]
  },
  {
    id: "venda", nome: "Compra ou venda com pagamento adiantado", peso: 1,
    explicacao: "Em vendas pela internet, pedir pagamento antes sem garantia, ou mandar “comprovante” de Pix agendado, são truques comuns. Confira o dinheiro no app do banco antes de entregar algo.",
    termos: ["pix agendado", "agendei o pix", "comprovante", "ja te paguei", "ja fiz o pix", "pagamento caiu",
      "so aceito pix", "reservar o produto", "sinal para reservar", "frete gratis"]
  },
  {
    id: "segredo", nome: "Pede segredo", peso: 2,
    explicacao: "Pedir para não contar a ninguém serve para impedir que alguém de confiança perceba o golpe.",
    termos: ["nao conta para ninguem", "nao conte para ninguem", "nao conte a ninguem", "nao fala para ninguem",
      "nao fale com ninguem", "nao comenta com ninguem", "nao comente com ninguem", "segredo", "entre nos",
      "so entre a gente", "nao conta para o pai", "nao conta para a mae"]
  },
  {
    id: "acao", nome: "Pede clique ou resposta", peso: 1,
    explicacao: "Pedir para clicar, responder “SIM” ou ligar para um número enviado na própria mensagem é a porta de entrada de muitos golpes.",
    termos: ["clique aqui", "clique no link", "clica no link", "acesse o link", "acesse agora", "acesse aqui",
      "toque no link", "responda sim", "digite 1", "ligue para", "ligue agora", "entre em contato pelo"]
  }
].map(r => ({ ...r, termosPreparados: r.termos.map(prepararTermo) }));

// ======================================================================
// 4. Análise de links
// ======================================================================

const PADRAO_LINK = /(?:https?:\/\/|www\.)[^\s<>"']+|(?<![\p{L}\d@.-])[a-z0-9][a-z0-9-]*(?:\.[a-z0-9-]+)*\.(?:com|net|org|br|xyz|top|click|online|site|live|info|shop|store|app|link|me|io|ly|cc|ru|cn|vip|club|buzz|icu|tk|ml|ga|cf|gq|work|fun|rest|cfd|sbs|gl|at|gd|id|co|pro|bio|lat|today|life|services|support|help|digital|pw|ws)(?:\/[^\s<>"']*)?/giu;

const ENCURTADORES = ["bit.ly", "tinyurl.com", "cutt.ly", "is.gd", "encurtador.com.br", "rb.gy", "t.ly", "shorturl.at",
  "s.id", "ow.ly", "goo.gl", "tiny.cc", "v.gd", "abre.ai", "l1nk.dev", "t.co", "short.gy", "linktr.ee", "bitly.com",
  "encurta.net", "u.to", "x.gd", "qrco.de"];

const TLDS_SUSPEITOS = ["xyz", "top", "click", "online", "site", "live", "shop", "icu", "buzz", "vip", "tk", "ml",
  "ga", "cf", "gq", "work", "fun", "rest", "cfd", "sbs", "ru", "cn", "lat", "today", "life", "services", "support",
  "help", "pw", "ws", "bio"];

// Marcas usadas em golpes e seus domínios oficiais.
const MARCAS = {
  caixa: ["caixa.gov.br"], bradesco: ["bradesco.com.br", "bradesco"], itau: ["itau.com.br"],
  nubank: ["nubank.com.br"], santander: ["santander.com.br"], bancodobrasil: ["bb.com.br"],
  inter: ["bancointer.com.br", "inter.co"], c6bank: ["c6bank.com.br"], picpay: ["picpay.com"],
  mercadopago: ["mercadopago.com.br", "mercadopago.com"], pagbank: ["pagbank.com.br", "pagseguro.uol.com.br"],
  inss: ["inss.gov.br", "gov.br"], gov: ["gov.br"], govbr: ["gov.br"], receita: ["gov.br"], detran: ["gov.br"],
  correios: ["correios.com.br"], serasa: ["serasa.com.br"], mercadolivre: ["mercadolivre.com.br", "mercadolivre.com"],
  shopee: ["shopee.com.br"], magalu: ["magazineluiza.com.br", "magalu.com"], magazineluiza: ["magazineluiza.com.br"],
  americanas: ["americanas.com.br"], amazon: ["amazon.com.br", "amazon.com"], netflix: ["netflix.com"],
  whatsapp: ["whatsapp.com", "wa.me"], instagram: ["instagram.com"], facebook: ["facebook.com"],
  cpf: ["gov.br"], pix: ["bcb.gov.br"], febraban: ["febraban.org.br"], fgts: ["caixa.gov.br", "gov.br"],
  enel: ["enel.com.br"], sabesp: ["sabesp.com.br"], vivo: ["vivo.com.br"], claro: ["claro.com.br"], tim: ["tim.com.br"]
};

// Nome principal de cada site oficial, para achar imitações como "nubnak" ou "bradescco".
const NOMES_OFICIAIS = ["caixa", "bradesco", "itau", "nubank", "santander", "bancointer", "c6bank", "picpay",
  "mercadopago", "pagbank", "pagseguro", "correios", "serasa", "mercadolivre", "shopee", "magazineluiza",
  "americanas", "amazon", "netflix", "whatsapp", "instagram", "facebook", "febraban", "sabesp"];

const SUFIXOS_COMPOSTOS = ["com.br", "gov.br", "org.br", "net.br", "edu.br", "co.uk", "com.ar"];

function hostDoLink(link) {
  let s = link.replace(/[).,;:!?]+$/, "");
  if (!/^https?:\/\//i.test(s)) s = "http://" + s;
  try { return new URL(s).hostname.toLowerCase(); } catch { return null; }
}

function nomePrincipal(host) {
  const partes = host.split(".");
  const final2 = partes.slice(-2).join(".");
  const idx = SUFIXOS_COMPOSTOS.includes(final2) ? partes.length - 3 : partes.length - 2;
  return partes[Math.max(idx, 0)] || "";
}

function analisarLink(link) {
  const motivos = [];
  const host = hostDoLink(link);
  if (!host) return motivos;
  const add = m => motivos.push(m);

  if (ENCURTADORES.some(e => host === e || host.endsWith("." + e))) {
    add({ id: "link-curto", nome: "Link encurtado", peso: 2,
      explicacao: "Links encurtados escondem o endereço verdadeiro. Não dá para saber para onde ele leva antes de clicar." });
  }
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) {
    add({ id: "link-ip", nome: "Link com números no lugar do nome", peso: 3,
      explicacao: "Sites legítimos usam nome (como banco.com.br), não uma sequência de números." });
  }
  if (host.includes("xn--")) {
    add({ id: "link-disfarce", nome: "Link com letras disfarçadas", peso: 3,
      explicacao: "O endereço usa letras de outros alfabetos que imitam letras comuns, para parecer um site conhecido." });
  }
  if (/^[a-z]+:\/\/[^/]*@/i.test(link) || /^[^/]*@[^/]*\.[a-z]/i.test(link.replace(/^www\./i, ""))) {
    add({ id: "link-arroba", nome: "Link com arroba escondendo o destino", peso: 3,
      explicacao: "Num link, tudo o que vem antes do “@” é ignorado. O site de verdade é o que vem depois." });
  }

  const tld = host.split(".").pop();
  if (TLDS_SUSPEITOS.includes(tld)) {
    add({ id: "link-tld", nome: "Final de endereço incomum", peso: 2,
      explicacao: `Endereços terminados em “.${tld}” são baratos e muito usados em golpes. Bancos e governo brasileiros usam .com.br ou .gov.br.` });
  }

  // Domínio oficial colocado no começo para enganar: "gov.br.consulta-cpf.com"
  if (/(^|\.)(gov\.br|com\.br)\./.test(host)) {
    add({ id: "link-sufixo-falso", nome: "Endereço que finge ser oficial", peso: 3,
      explicacao: "O endereço começa com “gov.br” ou “com.br”, mas termina em outro lugar. O que vale é o final do endereço." });
  }

  // Nome de empresa dentro de um endereço que não é o oficial.
  const partes = host.split(/[.-]/);
  let imitou = false;
  for (const [marca, oficiais] of Object.entries(MARCAS)) {
    const usaMarca = partes.some(p => p === marca || (marca.length >= 5 && p.startsWith(marca)));
    const ehOficial = oficiais.some(o => host === o || host.endsWith("." + o));
    if (usaMarca && !ehOficial) {
      add({ id: "link-marca", nome: "Link imita site conhecido", peso: 3,
        explicacao: `O endereço usa o nome “${marca}”, mas não é o site oficial. Golpistas copiam nomes de empresas para enganar.` });
      imitou = true;
      break;
    }
  }

  // Nome parecido com o oficial: "nubnak", "bradescco", "itaau-seguro".
  if (!imitou) {
    const principal = nomePrincipal(host);
    const candidatos = [principal.replace(/-/g, ""), ...principal.split("-")];
    busca:
    for (const nome of candidatos) {
      if (nome.length < 4) continue;
      for (const oficial of NOMES_OFICIAIS) {
        if (nome === oficial) continue;
        const max = oficial.length >= 8 ? 2 : 1;
        if (distancia(nome, oficial, max) <= max) {
          add({ id: "link-parecido", nome: "Endereço parecido com o de uma empresa", peso: 3,
            explicacao: `“${nome}” imita “${oficial}” com uma letra trocada, sobrando ou faltando. É um truque comum para parecer o site oficial.` });
          break busca;
        }
      }
    }
  }

  if ((host.match(/-/g) || []).length >= 2) {
    add({ id: "link-hifens", nome: "Endereço cheio de hífens", peso: 1,
      explicacao: "Endereços como “seguro-banco-atualiza.com” imitam sites oficiais juntando palavras." });
  }
  if (/^http:\/\//i.test(link)) {
    add({ id: "link-http", nome: "Link sem cadeado (http)", peso: 1,
      explicacao: "O link não usa conexão segura (https). Nenhum banco usa isso." });
  }
  return motivos;
}

// ======================================================================
// 5. Análise completa
// ======================================================================

const COMBINACOES = [
  { se: ["numero-novo", "dinheiro"], id: "combo-numero", nome: "Número novo + pedido de dinheiro", peso: 3,
    explicacao: "Essa combinação é o roteiro do golpe do falso parente. Ligue para o número antigo da pessoa." },
  { se: ["central", ["dinheiro", "acesso", "dados"]], id: "combo-central", nome: "“Banco” pedindo pagamento, dados ou acesso", peso: 3,
    explicacao: "Banco de verdade nunca pede para você transferir dinheiro, passar dados ou instalar app para “proteger” a conta." },
  { se: ["advogado", "dinheiro"], id: "combo-advogado", nome: "Processo + pedido de pagamento", peso: 3,
    explicacao: "Advogado de verdade não cobra “taxa de liberação” por mensagem para soltar valor de processo." },
  { se: ["romance", ["dinheiro", "encomenda", "urgencia"]], id: "combo-romance", nome: "Romance à distância + pedido de dinheiro", peso: 3,
    explicacao: "É o roteiro do golpe do amor: afeto à distância e, de repente, um pedido de dinheiro por uma emergência. Nunca envie dinheiro para quem você não conheceu pessoalmente." },
  { se: ["renda", "dinheiro"], id: "combo-renda", nome: "Trabalho que cobra para começar", peso: 3,
    explicacao: "Emprego de verdade não cobra taxa de cadastro, de material ou para liberar seus ganhos." },
  { se: ["investimento", "dinheiro"], id: "combo-investimento", nome: "Investimento que pede depósito", peso: 3,
    explicacao: "Pedido de depósito para “investir” com lucro garantido é o padrão da falsa corretora." },
  { se: ["encomenda", ["dinheiro", "link"]], id: "combo-encomenda", nome: "Encomenda + taxa ou link", peso: 2,
    explicacao: "Correios e lojas não cobram taxa por link de mensagem. Rastreie no site oficial." },
  { se: ["beneficio", ["dinheiro", "link", "dados"]], id: "combo-beneficio", nome: "Benefício + taxa, link ou dados", peso: 2,
    explicacao: "Benefício do governo nunca cobra taxa para liberar e só é consultado no app oficial ou no gov.br." },
  { se: ["premio", ["dinheiro", "link", "dados"]], id: "combo-premio", nome: "Prêmio + taxa, link ou dados", peso: 3,
    explicacao: "Prêmio de verdade não cobra frete, taxa nem pede dados por link de mensagem." },
  { se: ["ameaca", ["dinheiro", "link", "dados"]], id: "combo-ameaca", nome: "Ameaça + cobrança, link ou dados", peso: 3,
    explicacao: "Cobrança ou bloqueio de verdade se resolve no app ou site oficial, nunca por link ou Pix enviado em mensagem." },
  { se: ["ameaca", "urgencia"], id: "combo-pressao", nome: "Ameaça com prazo curto", peso: 1,
    explicacao: "Assustar e apressar ao mesmo tempo é a receita para a pessoa agir sem pensar." }
];

function analisar(texto) {
  const toks = tokenizar(texto);
  const motivos = new Map();
  const trechos = [];
  const regrasAchadas = new Set();

  for (const regra of REGRAS) {
    for (const palavras of regra.termosPreparados) {
      for (const a of procurarTermo(toks, palavras)) {
        motivos.set(regra.id, regra);
        regrasAchadas.add(regra.id);
        trechos.push({ inicio: a.ini, fim: a.fim, id: regra.id });
      }
    }
  }

  let temLink = false;
  PADRAO_LINK.lastIndex = 0;
  for (const m of texto.matchAll(PADRAO_LINK)) {
    temLink = true;
    const doLink = analisarLink(m[0]);
    doLink.forEach(mo => { if (!motivos.has(mo.id)) motivos.set(mo.id, mo); });
    trechos.push({ inicio: m.index, fim: m.index + m[0].length, id: doLink[0] ? doLink[0].id : "link" });
  }
  if (temLink) regrasAchadas.add("link");

  const tem = c => Array.isArray(c) ? c.some(x => regrasAchadas.has(x)) : regrasAchadas.has(c);
  for (const combo of COMBINACOES) {
    if (combo.se.every(tem)) motivos.set(combo.id, combo);
  }

  const lista = [...motivos.values()];
  const pontos = lista.reduce((s, m) => s + m.peso, 0) + (temLink && lista.length ? 1 : 0);

  let nivel;
  if (pontos === 0) nivel = "limpo";
  else if (pontos <= 3) nivel = "atencao";
  else if (pontos <= 6) nivel = "suspeito";
  else nivel = "golpe";

  return { nivel, pontos, motivos: lista, trechos, temLink, cenario: escolherCenario(regrasAchadas, nivel) };
}

// ======================================================================
// 6. Como responder com segurança
// ======================================================================

function escolherCenario(r, nivel) {
  if (nivel === "limpo") return null;
  if (r.has("cartao") || r.has("central") || r.has("acesso")) return "banco";
  if (r.has("romance")) return "romance";
  if (r.has("advogado")) return "advogado";
  if (r.has("investimento")) return "investimento";
  if (r.has("renda")) return "emprego";
  if (r.has("codigo") && (r.has("numero-novo") || !(r.has("premio") || r.has("ameaca") || r.has("beneficio") || r.has("encomenda")))) return "conhecido";
  if (r.has("numero-novo")) return "conhecido";
  if (r.has("dinheiro") && (r.has("segredo") || r.has("urgencia")) &&
      !r.has("premio") && !r.has("ameaca") && !r.has("encomenda") && !r.has("beneficio") && !r.has("venda")) return "conhecido";
  if (r.has("venda")) return "venda";
  return "empresa";
}

const RESPOSTAS = {
  conhecido: {
    titulo: "Quer confirmar se é a pessoa mesmo?",
    texto: "Mande uma pergunta que só a pessoa verdadeira saberia responder. Golpista costuma enrolar, mudar de assunto, dizer que “não dá para falar agora” ou ficar insistindo no dinheiro.",
    mensagens: [
      "Antes de qualquer coisa, me responde uma coisa: qual era o nome do nosso primeiro bichinho de estimação?",
      "Me liga agora por chamada de vídeo que eu resolvo isso com você.",
      "Vou te ligar no seu número antigo para confirmar, tá bom?"
    ],
    dica: "Escolha uma pergunta cuja resposta não apareça nas redes sociais. E não mande dinheiro antes de falar com a pessoa pelo número antigo ou por vídeo, porque hoje dá para imitar voz com inteligência artificial."
  },
  banco: {
    titulo: "O melhor é não responder",
    texto: "Qualquer resposta confirma para o golpista que seu número está ativo. Desligue ou ignore e ligue você mesmo para o banco pelo número que está atrás do seu cartão ou no app oficial.",
    mensagens: [],
    dica: "Se ligarem de volta dizendo ser do banco, desligue. Use outro telefone, se puder, porque golpistas conseguem manter a linha presa."
  },
  romance: {
    titulo: "Confirme quem é antes de qualquer coisa",
    texto: "Antes de pensar em dinheiro, confirme que a pessoa é real. Golpista do amor sempre tem uma desculpa para não aparecer ao vivo. Proponha uma chamada de vídeo agora:",
    mensagens: [
      "Antes de resolvermos isso, vamos fazer uma chamada de vídeo agora? Preciso te ver para ter certeza.",
      "Não consigo ajudar com dinheiro sem a gente se falar por vídeo primeiro."
    ],
    dica: "Se a pessoa recusar o vídeo, inventar um problema na câmera ou insistir no dinheiro, é golpe. Nunca envie dinheiro a quem você nunca encontrou pessoalmente, por mais verdadeira que a história pareça."
  },
  advogado: {
    titulo: "Confirme com quem você já conhece",
    texto: "Não pague nada por mensagem. Fale com o seu advogado pelo telefone que está no seu contrato ou que você já tinha antes. Se quiser responder, use uma mensagem que não passa nenhum dado:",
    mensagens: [
      "Vou confirmar essa informação diretamente com o escritório, pelo telefone que está no meu contrato."
    ],
    dica: "Você pode consultar o andamento do processo no site do tribunal. Valores de processo são liberados por alvará judicial, sem pagamento de taxa por Pix."
  },
  emprego: {
    titulo: "Peça dados que uma empresa séria tem",
    texto: "Se quiser responder, peça informações que dá para conferir sozinho. Empresa de verdade responde sem problema. Golpista costuma sumir ou enrolar.",
    mensagens: [
      "Qual é o CNPJ e o site oficial da empresa? Vou conferir antes de continuar.",
      "Vocês podem me mandar a proposta por e-mail com o domínio da empresa?"
    ],
    dica: "Confira o CNPJ no site da Receita Federal. Nunca pague taxa para começar a trabalhar ou para sacar “ganhos”."
  },
  investimento: {
    titulo: "Confira antes de qualquer conversa",
    texto: "Corretoras e plataformas de investimento precisam ter autorização. Se quiser responder, peça o registro:",
    mensagens: [
      "Qual é o registro da empresa na CVM? Vou conferir no site oficial antes de qualquer coisa."
    ],
    dica: "Consulte no site da CVM se a empresa é autorizada. Se a resposta vier com pressa ou desculpas, é golpe."
  },
  venda: {
    titulo: "Confira o pagamento por conta própria",
    texto: "Não confie em comprovante enviado por mensagem. Abra o app do seu banco e veja se o dinheiro realmente entrou. Se for você comprando, peça uma prova de que o vendedor existe:",
    mensagens: [
      "Pode fazer uma chamada de vídeo rápida mostrando o produto antes do pagamento?",
      "Consigo pagar pela plataforma do site, com a proteção de compra?"
    ],
    dica: "Comprovante de “Pix agendado” não é pagamento. Só entregue o produto quando o valor aparecer na sua conta."
  },
  empresa: {
    titulo: "O melhor é não responder",
    texto: "Quando a mensagem diz ser de loja, órgão público ou empresa, qualquer resposta confirma que seu número está ativo. Confira você mesmo, abrindo o app ou o site oficial digitado por você, sem usar o link da mensagem.",
    mensagens: [],
    dica: "Bloqueie e denuncie o número no WhatsApp para ajudar a derrubar a conta do golpista."
  }
};

// ======================================================================
// 7. Interface
// ======================================================================

const NIVEIS = {
  limpo: { titulo: "Não encontrei sinais comuns de golpe",
    texto: "Isso não garante que a mensagem é segura. Golpes novos podem passar sem ser notados. Se envolver dinheiro, confira mesmo assim." },
  atencao: { titulo: "Atenção: há sinais de alerta",
    texto: "A mensagem tem alguns sinais usados em golpes. Confira por outro caminho antes de fazer o que ela pede." },
  suspeito: { titulo: "Mensagem suspeita",
    texto: "Vários sinais de golpe aparecem juntos. Não clique em links, não pague e não passe dados." },
  golpe: { titulo: "Muito provavelmente é golpe",
    texto: "A mensagem segue o roteiro de golpes conhecidos. Não clique, não pague e não passe nenhum dado." }
};

const PASSOS = {
  base: [
    "Não clique no link e não passe nenhum dado.",
    "Confira por um caminho que você já conhece: o app oficial, o número atrás do seu cartão ou uma ligação para o número antigo da pessoa.",
    "Nunca passe senha ou código que chegou por SMS, nem para quem diz ser do banco ou do WhatsApp."
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
    if (t.inicio < pos) continue;
    html += escaparHtml(texto.slice(pos, t.inicio));
    const n = numeros.get(t.id);
    const rotulo = n ? `<sup aria-hidden="true">${n}</sup>` : "";
    html += `<mark class="${t.id.startsWith("link") ? "marca-link" : ""}"${n ? ` aria-describedby="motivo-${n}"` : ""}>` +
      escaparHtml(texto.slice(t.inicio, t.fim)) + rotulo + "</mark>";
    pos = t.fim;
  }
  return html + escaparHtml(texto.slice(pos));
}

function htmlResposta(cenario) {
  if (!cenario) return "";
  const r = RESPOSTAS[cenario];
  const msgs = r.mensagens.map((m, i) => `
      <div class="msg-pronta">
        <p id="msg-${i}">${escaparHtml(m)}</p>
        <button type="button" class="copiar" data-copiar="msg-${i}">Copiar mensagem</button>
      </div>`).join("");
  return `
    <section class="resposta" aria-labelledby="resposta-titulo">
      <h3 id="resposta-titulo">${r.titulo}</h3>
      <p>${r.texto}</p>
      ${msgs}
      <p class="dica">${r.dica}</p>
    </section>`;
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
    ${htmlResposta(r.cenario)}
    ${passosHtml}`;

  area.hidden = false;
  document.getElementById("veredito-titulo").focus();
}

async function copiarTexto(texto) {
  try {
    await navigator.clipboard.writeText(texto);
    return true;
  } catch {
    const campo = document.createElement("textarea");
    campo.value = texto;
    campo.setAttribute("readonly", "");
    campo.style.position = "fixed";
    campo.style.opacity = "0";
    document.body.appendChild(campo);
    campo.select();
    let ok = false;
    try { ok = document.execCommand("copy"); } catch { ok = false; }
    campo.remove();
    return ok;
  }
}

// ======================================================================
// 8. Exemplos e botões
// ======================================================================

const EXEMPLOS = {
  parente: "Oi mãe, troquei de número, salva esse aqui. Tô com um problema urgente, consegue fazer um pix de R$ 850 pra mim? Amanhã te devolvo. Não conta pra ninguém por enquanto.",
  banco: "BRADESCO INFORMA: Compra não reconhecida de R$ 2.399,00 em seu cartão. Caso não reconheça, acesse imediatamente http://bradesco-seguranca-cliente.top/validar e confirme seus dados para evitar bloqueio.",
  encomenda: "Correios: sua encomenda está retida por falta de pagamento da taxa alfandegária. Pague em até 24 horas ou o objeto será devolvido: bit.ly/correios-taxa",
  advogado: "Boa tarde! Sou o Dr. Ricardo, advogado do seu processo. Temos uma ótima notícia: a causa foi ganha e o valor de R$ 18.400 já está liberado. Para liberar o alvará é preciso pagar as custas processuais de R$ 1.250 via Pix ainda hoje."
};

if (typeof document !== "undefined") {
  document.addEventListener("DOMContentLoaded", () => {
    const campo = document.getElementById("mensagem");
    const form = document.getElementById("form-verificar");
    const aviso = document.getElementById("aviso-vazio");
    const area = document.getElementById("resultado");

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
      area.hidden = true;
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

    area.addEventListener("click", async e => {
      const botao = e.target.closest("[data-copiar]");
      if (!botao) return;
      const texto = document.getElementById(botao.dataset.copiar).textContent;
      const ok = await copiarTexto(texto);
      botao.textContent = ok ? "Mensagem copiada" : "Não deu para copiar. Selecione o texto e copie.";
      setTimeout(() => { botao.textContent = "Copiar mensagem"; }, 2500);
    });
  });
}

// Para os testes no Node (não afeta o navegador).
if (typeof module !== "undefined") module.exports = { analisar, tokenizar, analisarLink };
