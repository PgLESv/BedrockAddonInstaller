# Bedrock Addon Installer

Uma ferramenta web prática para organizar, validar e ativar pacotes de addons do Minecraft Bedrock Edition direto no navegador, sem precisar instalar nada e sem enviar seus arquivos para nenhum servidor externo (processamento 100% no seu computador/celular).

---

## O que ela faz?

- **Separação Automática**: Identifica e separa Behavior Packs (BP) e Resource Packs (RP), lendo os manifests e tipos de módulo (incluindo Script API / GameTest).
- **Gerenciamento de Mundos**: Suporta `.mcworld` ou pastas de mapas (como `Bedrock level`), lendo e gerando os arquivos de ativação `world_behavior_packs.json` e `world_resource_packs.json`.
- **Validação de Manifest**: Aponta na hora se algum pack tem UUID malformatado, versão inválida ou conflitos comuns que costumam impedir o addon de carregar no Minecraft.
- **Edição Rápida**: Permite corrigir UUIDs e versões direto na interface caso algum manifest esteja corrompido ou incompleto.
- **Exportação Flexível**: Baixe tudo organizado em um único `.zip` pronto para colocar na pasta do mundo/servidor, ou baixe pacotes individuais em formato `.mcpack`.
- **Funciona Offline (PWA)**: Pode ser instalado como aplicativo ou usado sem conexão à internet.

---

## Formatos Suportados

| Formato | Suporte | Observação |
|---|---|---|
| `.mcpack` | ✅ Suportado | Addon avulso (Resource ou Behavior) |
| `.mcaddon` | ✅ Suportado | Pacote contendo BP + RP juntos |
| `.mcworld` | ✅ Suportado | Mundo completo do Bedrock |
| `.zip` / `.tar.gz` | ✅ Suportado | Arquivos compactados contendo addons ou mapas |
| `.rar` / `.7z` | ⚠️ Requer conversão | Extraia e envie como `.zip` (o navegador não descompacta esses formatos nativamente) |

---

## Como Usar

1. Acesse a página ou abra o `index.html` no seu navegador.
2. Arraste seus arquivos de addons ou o mapa para a tela de upload.
3. Clique em **Processar Addons**.
4. Ajuste as opções de ativação ou resolva duplicados se necessário.
5. Clique em **Baixar Addons Organizados** (ou baixe os `.mcpack` individualmente nos cards de cada addon).

---

## Rodando Localmente

Se quiser rodar na sua máquina ou contribuir com o código:

```bash
# Clone o repositório
git clone https://github.com/PgLESv/BedrockAddonInstaller.git
cd BedrockAddonInstaller

# Iniciar servidor local de desenvolvimento (para testar Service Worker/PWA)
npm start

# Executar testes unitários
npm test

# Recompilar o bundle de produção (caso edite arquivos em src/)
npm run build
```

> **Dica:** Você também pode simplesmente abrir o `index.html` diretamente com dois cliques no navegador. A aplicação funciona sem depender de servidor local.

---

## Estrutura do Projeto

```text
├── index.html              # Página principal
├── style.css               # Estilos da interface
├── script.js               # Bundle de produção (gerado via esbuild)
├── sw.js                   # Service worker para cache e PWA
├── manifest.webmanifest    # Configuração de PWA
├── src/                    # Código-fonte modular (ES6)
│   ├── core/               # Estado e configurações globais
│   ├── parsers/            # Leitura de manifest, zips e validação de schema
│   ├── services/           # Lógica de packs, mundos e exportação
│   ├── ui/                 # Renderização e eventos
│   └── utils/              # Funções de sanitização, formatação e feedback
└── scripts/
    └── test.js             # Testes automatizados (Node.js)
```

---

## Aviso Legal

Este é um projeto independente feito pela comunidade e **não possui qualquer afiliação, patrocínio ou endosso** da Mojang Studios ou da Microsoft.  
Minecraft® é uma marca registrada da Mojang Synergies AB.
