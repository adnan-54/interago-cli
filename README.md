# Interago CLI

CLI de desenvolvimento local para projetos da plataforma [Interago](https://www.interago.com.br). Permite baixar e enviar páginas e blocos de um projeto, iniciar um servidor local com live reload — tudo em um terminal interativo.

---

## Tecnologias

| Tecnologia                                        | Uso                                     |
| ------------------------------------------------- | --------------------------------------- |
| [Bun](https://bun.sh)                             | Runtime, bundler e compilador           |
| [TypeScript](https://www.typescriptlang.org)      | Linguagem principal                     |
| [ink](https://github.com/vadimdemedes/ink)        | Interface de terminal (React no TUI)    |
| [chokidar](https://github.com/paulmillr/chokidar) | Observação de arquivos para live reload |

---

## Pré-requisitos

- [Bun](https://bun.sh) instalado (`bun --version` deve funcionar)
- [PowerShell 7+](https://github.com/PowerShell/PowerShell/releases) (necessário para o script de instalação)
- Windows 10/11

> **macOS / Linux:** o código-fonte e todas as dependências são multiplataforma. O script de build e instalação atual é específico para Windows (`--windows-icon`, `install.ps1`). Para compilar em outros sistemas, basta remover a flag `--windows-icon` do `scripts/build.ts` e criar um script de instalação equivalente para o seu sistema.

---

## Instalação

O script `scripts/install.ps1` compila o executável, copia para `%APPDATA%\interago\` e adiciona ao PATH do usuário automaticamente.

```powershell
pwsh -ExecutionPolicy Bypass -File .\scripts\install.ps1
```

Após concluir, abra um novo terminal e o comando `interago` estará disponível globalmente.

---

## Build manual

Para compilar sem instalar:

```powershell
bun run build
# ou diretamente:
bun scripts/build.ts
```

O executável `interago.exe` será gerado na raiz do projeto.

---

## Uso

Execute `interago` dentro da pasta do projeto que deseja trabalhar. A interface exibe uma barra de status permanente com o projeto ativo, estado do servidor e contagem de requisições.

Na primeira execução em um diretório sem `.interago.json`, o CLI solicita automaticamente o ID do projeto e o API token.

### Comandos disponíveis

#### Projeto

| Comando   | Descrição                                            |
| --------- | ---------------------------------------------------- |
| `project` | Exibe ID do projeto e contagem local de páginas e blocos. |

#### Pull (download)

| Comando                  | Descrição                                          |
| ------------------------ | -------------------------------------------------- |
| `pull`                   | Baixa todas as páginas e blocos do projeto.        |
| `pull pages`             | Baixa todas as páginas.                            |
| `pull page <nome\|id>`   | Baixa uma única página pelo slug ou ID.            |
| `pull blocks`            | Baixa todos os blocos.                             |
| `pull block <nome\|id>`  | Baixa um único bloco pelo nome ou ID.              |

#### Push (upload)

| Comando                  | Descrição                                                        |
| ------------------------ | ---------------------------------------------------------------- |
| `push`                   | Envia todas as páginas e blocos para o projeto.                  |
| `push pages`             | Envia todas as páginas.                                          |
| `push page <nome\|id>`   | Envia uma única página pelo slug ou ID.                          |
| `push blocks`            | Envia todos os blocos.                                           |
| `push block <nome\|id>`  | Envia um único bloco pelo nome ou ID.                            |

> Blocos do tipo 4 (repetição) salvam um arquivo `.virtual.json` durante o pull. O push utiliza esse arquivo automaticamente para preservar a estrutura virtual do bloco.

#### Servidor

| Comando              | Descrição                                                  |
| -------------------- | ---------------------------------------------------------- |
| `server start [porta]` | Inicia o servidor local de desenvolvimento (padrão: 3000). |
| `server stop`        | Para o servidor local.                                     |

#### Geral

| Comando | Descrição                          |
| ------- | ---------------------------------- |
| `help`  | Lista todos os comandos disponíveis. |
| `exit`  | Encerra o CLI.                     |

---

## Primeiro uso

```
# 1. Criar e entrar na pasta do projeto
mkdir meu-projeto
cd meu-projeto

# 2. Iniciar o CLI — solicita ID e token automaticamente
interago

# 3. Baixar páginas e blocos
❯ pull

# 4. Iniciar o servidor local
❯ server start 3000
```

Acesse `http://localhost:3000` no navegador. Ao editar qualquer arquivo em `pages/` ou `blocks/`, o navegador recarrega automaticamente.

---

## Estrutura gerada pelo `pull`

```
meu-projeto/
  .interago.json           ← credenciais salvas localmente
  pages/
    index - 123.html       ← página raiz (pageUrl vazio → index)
    sobre - 456.html       ← demais páginas pelo slug da URL
  blocks/
    header - 10.html       ← blocos reutilizáveis
    footer - 11.html
    banner - 15.html       ← bloco comum
    banner - 15.virtual.json  ← sidecar de bloco tipo 4 (repetição)
```

Os blocos são injetados automaticamente nas páginas durante a compilação sob demanda pelo servidor local. Nenhum arquivo compilado é gravado em disco.

---

## Rate limiting

A API da Interago aceita no máximo 60 requisições por minuto. O CLI aplica um limitador de janela deslizante com teto de 60 req/min para evitar bloqueios. O contador atual é exibido na barra de status (`Req: N/60`).
