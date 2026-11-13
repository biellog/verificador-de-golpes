# É golpe? Verificador de mensagens suspeitas

Site simples onde qualquer pessoa cola uma mensagem ou link e vê, em linguagem clara, se ele tem sinais de golpe e o que fazer.

- Marca na própria mensagem os trechos de alerta e explica cada um.
- Analisa links: encurtadores, nomes de empresas falsificados, finais de endereço suspeitos, links sem https.
- Mostra o que fazer agora, inclusive se a pessoa já pagou ou passou dados.
- Funciona 100% no navegador: o texto colado não é enviado para nenhum servidor.

## Arquivos

| Arquivo | Para que serve |
|---|---|
| `index.html` | Estrutura da página |
| `style.css` | Visual (tema claro e escuro, letras grandes) |
| `script.js` | Regras de detecção e a lógica do verificador |

## Como publicar no GitHub Pages (sem terminal)

1. Entre no GitHub e clique em **New repository**. Dê um nome, por exemplo `verificador-de-golpes`, deixe **Public** e crie.
2. Na página do repositório, clique em **uploading an existing file** (ou **Add file → Upload files**).
3. Arraste os arquivos `index.html`, `style.css`, `script.js` e `README.md` e clique em **Commit changes**.
4. Vá em **Settings → Pages**. Em **Branch**, escolha `main` e a pasta `/ (root)`, depois clique em **Save**.
5. Em um ou dois minutos o site estará em `https://SEU-USUARIO.github.io/verificador-de-golpes/`.

## Como adicionar novas regras

Em `script.js`, a lista `REGRAS` guarda cada tipo de sinal. Para incluir uma frase nova, adicione o texto em `termos` sem acento (o verificador acha com ou sem acento). Um `*` no fim pega variações: `bloquead*` acha "bloqueado", "bloqueada" e "bloqueados".

## Aviso

A ferramenta procura padrões comuns e pode errar. Ela serve como alerta, não como garantia.
