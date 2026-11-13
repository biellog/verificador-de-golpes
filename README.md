# É golpe? Verificador de mensagens suspeitas

Site simples onde qualquer pessoa cola uma mensagem ou link e vê, em linguagem clara, se ele tem sinais de golpe, o que fazer e como responder com segurança.

## O que ele faz

- Marca na própria mensagem os trechos de alerta e explica cada um.
- Entende erros de digitação, abreviações (vc, pfv, zap), letras disfarçadas (s3nh4) e acentos faltando, sem confundir palavras comuns.
- Reconhece os golpes mais comuns no Brasil: falso parente, falsa central do banco, código do WhatsApp, encomenda retida, falso advogado, falso emprego, investimento, prêmio, benefício do governo, cobrança falsa e golpe do amor.
- Analisa links: encurtadores, nomes de empresas falsificados, endereços parecidos com os oficiais (nubnak), finais de endereço suspeitos, links sem https, truque do arroba.
- Quando faz sentido, oferece uma resposta pronta para confirmar se é golpe, como uma pergunta que só a pessoa verdadeira saberia responder.
- Mostra o que fazer agora, inclusive se a pessoa já pagou ou passou dados.
- Funciona 100% no navegador: o texto colado não é enviado para nenhum servidor.

## Arquivos

| Arquivo | Para que serve |
|---|---|
| `index.html` | Estrutura da página |
| `style.css` | Visual (tema claro e escuro, letras grandes, acessível) |
| `script.js` | Regras de detecção, análise de links e respostas prontas |

## Como atualizar

No GitHub, abra o arquivo, clique no lápis, edite e confirme. O site se atualiza sozinho em um ou dois minutos.

Para incluir uma frase nova de golpe, em `script.js` procure a lista `REGRAS` e adicione o texto em `termos`, sem acento. Dicas:
- `*` no fim pega variações: `bloquead*` acha "bloqueado" e "bloqueada".
- `=` no começo exige a palavra exata, sem tolerância a erro de digitação: `=pix`.

## Aviso

A ferramenta procura padrões comuns e pode errar nos dois sentidos. Ela serve como alerta, não como garantia. Na dúvida, confirme sempre pelo canal oficial.
