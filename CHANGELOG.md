# Changelog

## [Unreleased]

### Added
- **Validação de Schema Bedrock Oficial (`manifestValidator.js`)**: Mecanismo de validação estrita que inspeciona `format_version`, integridade do bloco `header`, validade de sintaxe dos UUIDs (padrão 8-4-4-4-12), formato da versão (tripla de inteiros [major, minor, patch]), compatibilidade de `min_engine_version` e prevenção de UUIDs duplicados entre módulo e cabeçalho.
- **Feedback Visual de Schema na UI**: Exibição de badges coloridos (❌ erros e ⚠️ avisos) em cada cartão de addon, com painel expansível `<details>` listando cada inconsistência encontrada e atualizado em tempo real após edições.
- **Download Individual de Addon (`.mcpack`)**: Adicionado botão "📥 .mcpack" em cada card de pack, permitindo baixar addons avulsos re-empacotados e com `manifest.json` atualizado diretamente pelo navegador.
- **Suporte PWA e Operação 100% Offline**:
  - `manifest.webmanifest`: Metadados completos de Web App para instalação em dispositivos móveis e desktop.
  - `sw.js`: Service Worker com cache-first e versionamento de cache para os arquivos da aplicação (`index.html`, `style.css`, `script.js`) e as 3 bibliotecas CDN externas (`JSZip`, `JSZip-Utils`, `Pako`), permitindo uso offline integral.
  - Registro contextual seguro em `src/main.js`, ativo apenas em conexões HTTP/HTTPS para manter compatibilidade com execução direta via `file:///`.
- **Arquitetura Modular em Módulos ES6**: Desmonte do monólito de 2.000 linhas em módulos desacoplados sob `src/`:
  - `src/core/`: `config.js`, `state.js`
  - `src/utils/`: `security.js`, `formatters.js`, `feedback.js`
  - `src/parsers/`: `manifest.js`, `archive.js`, `manifestValidator.js`
  - `src/services/`: `packService.js`, `worldService.js`, `exportService.js`
  - `src/ui/`: `elements.js`, `renderer.js`, `events.js`
  - `src/main.js`: Ponto de entrada da aplicação
- **Prevenção de Colisão de Pastas no ZIP Exportado**: Implementado algoritmo em `exportService.js` que detecta pacotes com nomes idênticos e gera sufixos numéricos únicos (`_2`, `_3`), impedindo sobreposição silenciosa de arquivos.
- **Ferramental de Build e Testes**: Adicionado `package.json` com scripts `npm run build` (usando esbuild ultrarrápido) e `npm test` (suite de testes unitários automatizados cobrindo parsers, sanitização, validação de schema, PWA e integridade do DOM).

### Changed
- **Eliminação de Código Duplicado**: Unificadas as pipelines de extração de packs de mundos, zips aninhados e arquivos avulsos em `extractPackFromZip()`, reduzindo o bundle em ~28% (de 82KB para 58KB).
- **Delegação de Eventos Segura**: Removidos todos os manipuladores de evento inline no DOM em favor de delegação de eventos via `addEventListener` com atributos `data-*`.
- **Correção de Sintaxe no CSS**: Corrigidas aspas escapadas inválidas no seletor de checkbox móvel em `style.css`.

### Fixed
- **Normalização de Pastas de Mundos na Exportação (ex: `Bedrock level/`)**: Corrigido descompasso onde `world_behavior_packs.json` e `world_resource_packs.json` eram gerados na raiz do ZIP enquanto os addons ficavam aninhados dentro da pasta externa do mundo (ex: `Bedrock level/behavior_packs/`). Agora qualquer prefixo de pasta de mapa é normalizado, mantendo `behavior_packs/`, `resource_packs/` e os dois arquivos `.json` juntos no mesmo nível de diretório.
- **Suporte a UTF-8 BOM em Manifests**: Adicionada remoção preventiva de Byte Order Mark (`\uFEFF` e `\uFFFE`), evitando falhas no `JSON.parse` em manifests gerados ou editados no Windows.
- **Falso-positivo na detecção de mundos**: Corrigida verificação que tratava qualquer arquivo contendo palavras como "world", "mundo" ou "mapa" como um mundo completo e apagava os outros uploads. Agora apenas `.mcworld` ou arquivos com indicadores estruturais reais (`level.dat`, `world_behavior_packs.json`, `db/`) ativam o modo mundo.
- **Corrupção de URLs em manifests**: Corrigida a função `removeJsonComments()` para respeitar aspas/strings literais, evitando que URLs (ex: `https://...`) e textos com barras duplas quebrem a estrutura do JSON.
- **Vulnerabilidade XSS e Quebra de Sintaxe por Apóstrofos**: Adicionada função `escapeHtml()` para sanitizar nomes de arquivos e propriedades de packs no DOM; corrigida a função `saveEditEssentials()` para receber o `_id` único do pack em vez do nome em string, evitando erros de sintaxe JS quando o addon contém apóstrofos (ex: `Bob's Pack`).
- **Lookup na edição de packs duplicados**: `saveEditEssentials()` agora localiza o pack exclusivamente pelo identificador único interno `pack._id`, permitindo editar individualmente pacotes com nomes idênticos.
- **Detecção de módulos Bedrock Script API**: Módulos do tipo `script` e `javascript` (Scripting API / GameTest) e `client_data` agora são corretamente categorizados como `behavior`, evitando que addons modernos caiam indevidamente em `unknown`.
- **Formatação de ativação JSON**: Migrado de concatenação manual de strings para `JSON.stringify(packs, null, '\t')`, garantindo conformidade total de especificação.
- **Remoção de suporte fantasma (.7z / .rar)**: Validação preventiva explícita com avisos amigáveis para arquivos `.rar` e `.7z` que não são suportados pelo `JSZip` no navegador.
- **Estado não inicializado**: Corrigido erro `state.processedAddons.unknownPacks is undefined`
  - Adicionado `unknownPacks: []` na função `clearFiles()`
  - Adicionado reset completo do `activationState` incluindo `unknownPacks: {}`
  - Corrigido reset em `processAddons()` para incluir todos os arrays

- **Caracteres de controle em JSON**: Corrigido erro "bad control character in string literal"
  - Melhorada função `removeJsonComments()` para remover caracteres de controle inválidos (0x00-0x1F)
  - Preserva apenas caracteres permitidos: \n, \r, \t
  - Adiciona fallback com limpeza mais agressiva caso o primeiro parse falhe

- **Tratamento de erro robusto**: 
  - Dupla tentativa de parsing JSON com diferentes níveis de limpeza
  - Logs detalhados quando JSON não pode ser corrigido
  - Mostra preview do conteúdo problemático para debug

- **Manifest corrompido**: Packs de mundo com manifest corrompido agora são carregados
  - Cria manifest genérico automaticamente quando JSON falha completamente
  - Mantém pack na pasta original do mundo
  - Exibe badge ⚠️ indicando manifest corrompido
  - Gera UUID único automaticamente

### Added
- **Suporte a packs desconhecidos**: Sistema completo para categorização manual
- **JSON com comentários**: Suporta `//` e `/* */` em manifest.json
- **Interface de categorização**: Dropdown para escolher tipo de pack desconhecido

### Changed
- Melhor logging de erros com emojis para facilitar identificação
- Estado da aplicação sempre inicializado completamente

## Problemas Corrigidos

### 1. `TypeError: can't access property "push", state.processedAddons.unknownPacks is undefined`
**Causa**: O array `unknownPacks` não estava sendo inicializado em todas as funções de reset.

**Solução**: Garantir que todas as funções que resetam o estado incluem:
```javascript
state.processedAddons = { 
    behaviorPacks: [], 
    resourcePacks: [],
    unknownPacks: []
};
state.activationState = {
    behaviorPacks: {},
    resourcePacks: {},
    unknownPacks: {}
```

### 2. `SyntaxError: JSON.parse: bad control character in string literal`
**Causa**: Alguns manifest.json contêm caracteres de controle inválidos (como tabs literais, caracteres nulos, etc.) dentro de strings.

**Solução**: Função `removeJsonComments()` agora remove caracteres de controle:
```javascript
// Remover caracteres de controle inválidos (0x00-0x1F)
// Exceto: \n (0x0A), \r (0x0D) que são tratados separadamente
cleaned = cleaned.replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F]/g, ' ');
```

**Fallback adicional**: Se o primeiro parse falhar, tenta limpeza mais agressiva:
```javascript
let cleaned = manifestContent
    .replace(/[\x00-\x09\x0B-\x0C\x0E-\x1F\x7F]/g, '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n');
```

## Exemplo de Uso

### Packs com JSON Problemático
Agora o sistema consegue processar:

```json
{
  "format_version": 2,
  "header": {
    "name": "Pack com	tabs	literais",
    "description": "Linhas
com quebras inválidas",
    "uuid": "abc-123",
    "version": [1, 0, 0]
  }
}
```

### Logs Melhorados
```
❌ Erro ao fazer parse do JSON em path/manifest.json: Unexpected character...
✅ JSON corrigido com limpeza adicional em path/manifest.json
```

ou

```
❌ Não foi possível corrigir o JSON. Pulando path/manifest.json
Conteúdo problemático (primeiros 500 chars): {...}
```
