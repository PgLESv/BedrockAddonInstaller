# Changelog

## [Unreleased] - 2025-10-14

### Fixed
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
