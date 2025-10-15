# Instalador de Addons do Bedrock

App estático (HTML/CSS/JS) para organizar e ativar addons do Minecraft Bedrock diretamente no navegador.

## Publicar no GitHub Pages

1) Crie um repositório novo no GitHub (público)
- Nome sugerido: `addon-installer` (ou o que preferir)

2) Faça o push do conteúdo desta pasta (`e:\\AddonInstaller`) para o repositório
- Inclua todos os arquivos: `index.html`, `style.css`, `script.js`, `README.md`, e `.nojekyll`

3) Ative o GitHub Pages
- Acesse Settings → Pages
- Build and deployment → Source: `Deploy from a branch`
- Branch: `main` (ou `master`), Folder: `/root`
- Salve. A URL ficará parecida com: `https://SEU_USUARIO.github.io/NOME_DO_REPO/`

4) (Opcional) Defina um custom domain
- Ainda em Settings → Pages, adicione seu domínio e configure DNS (CNAME)

5) Teste no celular
- Abra a URL no navegador do celular
- Verifique:
  - Botão de download fica fixo no rodapé em telas pequenas
  - Toques em botões e radios estão confortáveis
  - Uploads grandes processam e mostram progresso

6) Verifique export e ativação
- Baixe o .zip gerado e confira se pastas de mundos mantêm caminhos originais
- Abra os `world_behavior_packs.json` e `world_resource_packs.json` e valide as entradas

## Dicas
- `.nojekyll` evita que o Pages ignore arquivos/paths iniciados com `_`
- Não são necessários builds/compilações
- Evite .rar (suporte limitado); prefira .zip

## Aviso legal
Este projeto não é afiliado, endossado, patrocinado ou aprovado pela Mojang Studios ou Microsoft.
Minecraft® e Mojang® são marcas registradas da Mojang Synergies AB.
# 🎮 Minecraft Bedrock Addon Installer

Um instalador web inteligente para organizar automaticamente seus addons do Minecraft Bedrock Edition.

![License](https://img.shields.io/badge/license-M### Cenário 3: Estrutura Aninhada
Suporta## 🐛 Solução de Problemas## 🐛 Solução de Problemas

### ⚠️ Arquivos .rar não são processados corretamente
**Problema**: RAR é um formato proprietário com suporte limitado em navegadores.

**Solução**:
1. Extraia o arquivo `.rar` no seu computador (usando WinRAR, 7-Zip, etc)
2. Recompacte os arquivos como `.zip`:
   - Windows: Clique direito → Enviar para → Pasta compactada
   - Linux/Mac: `zip -r arquivo.zip pasta/`
3. Envie o arquivo `.zip` no site

**Alternativa**: Use `.tar.gz` ou `.7z` se preferir

### ❓ Packs Desconhecidos (Tipo Não Identificado)
**Problema**: Alguns addons não têm o campo `type` padrão no manifest ou usam valores customizados.

**O que acontece**:
- **Packs de Mundos** (marcados com 🌍): Mantidos na pasta original automaticamente
- **Packs Novos** (marcados com ❓): Precisam de categorização manual

**Como resolver**:
1. Na seção "❓ Packs Desconhecidos", você verá uma lista
2. Para packs novos, selecione o tipo no dropdown:
   - **Behavior Pack**: Se adiciona lógica/comportamento ao jogo
   - **Resource Pack**: Se adiciona texturas/modelos/sons
3. O pack será movido automaticamente para a categoria correta
4. Packs de mundos serão exportados na estrutura original

### 💬 JSON com Comentários
**Problema**: Alguns editores (como bridge.) adicionam comentários no manifest.json.

**Solução Automática**: O sistema agora remove automaticamente:
- Comentários de linha única: `// comentário`
- Comentários de múltiplas linhas: `/* comentário */`

Exemplo de manifest com comentários (agora suportado):
```json
{
  //bridge-file-version: #1
  "format_version": 2,
  /* Este é o header */
  "header": {
    "name": "Meu Pack"
  }
}
```

### O arquivo não é processado
- Verifique se o arquivo contém um `manifest.json` válido
- Certifique-se de que o formato do arquivo é suportado
- Se for um nested archive, verifique se os arquivos internos são válidos
- Abra o Console do navegador (F12) para ver logs detalhados

### Erro ao baixar o resultado
- Verifique se pelo menos um addon foi processado com sucesso
- Tente com um navegador diferente

### Performance lenta
- Arquivos muito grandes podem levar mais tempo para processar
- Nested archives com muitos níveis podem aumentar o tempo de processamento
- Tente processar menos arquivos de uma vezvos .rar não são processados corretamente
**Problema**: RAR é um formato proprietário com suporte limitado em navegadores.

**Solução**:
1. Extraia o arquivo `.rar` no seu computador (usando WinRAR, 7-Zip, etc)
2. Recompacte os arquivos como `.zip`:
   - Windows: Clique direito → Enviar para → Pasta compactada
   - Linux/Mac: `zip -r arquivo.zip pasta/`
3. Envie o arquivo `.zip` no site

**Alternativa**: Use `.tar.gz` ou `.7z` se preferir

### O arquivo não é processado
- Verifique se o arquivo contém um `manifest.json` válido
- Certifique-se de que o formato do arquivo é suportado
- Se for um nested archive, verifique se os arquivos internos são válidos
- Abra o Console do navegador (F12) para ver detalhes dos arquivos encontrados

### Erro ao baixar o resultado
- Verifique se pelo menos um addon foi processado com sucesso
- Tente com um navegador diferente

### Performance lenta
- Arquivos muito grandes podem levar mais tempo para processar
- Nested archives com muitos níveis podem aumentar o tempo de processamento
- Tente processar menos arquivos de uma vezníveis de nested archives:
```
collection.zip
├── pack1/
│   ├── behavior.mcpack
│   └── resource.mcpack
└── pack2.zip
    ├── addon_a.mcaddon
    └── addon_b.mcpack
```

### Cenário 4: Gerenciamento de Mundo 🌍
Envie um mundo em qualquer formato compactado para gerenciar seus addons:
```
1. Envie MeuMundo.mcworld (ou .zip, .tar.gz, etc)
2. Visualize os addons existentes (marcados com 🌍)
3. Adicione novos addons em qualquer formato (marcados com ✨)
4. Desmarque addons que deseja remover da ativação
5. Baixe apenas as pastas behavior_packs/, resource_packs/ e os arquivos JSON
```

**Formatos Suportados para Mundos**: `.mcworld`, `.zip`, `.tar.gz`, `.tgz`, ou qualquer formato contendo a estrutura do mundo

**Importante**: No modo mundo, o download NÃO inclui os arquivos do mapa, apenas os addons e configurações de ativação!

## 🐛 Solução de Problemas
![JavaScript](https://img.shields.io/badge/JavaScript-ES6-yellow.svg)
![GitHub Pages](https://img.shields.io/badge/deploy-GitHub%20Pages-brightgreen.svg)

## 🌟 Características

- ✅ **Upload Múltiplo**: Carregue vários arquivos de addons de uma só vez
- 📦 **Suporte a Múltiplos Formatos de Compactação**: 
  - Addons: `.zip`, `.mcpack`, `.mcaddon`, `.tar`, `.tar.gz`, `.tgz`, `.7z`
  - Mundos: `.mcworld` ou qualquer formato compactado contendo um mundo
  - ⚠️ `.rar` tem suporte limitado - recomendamos converter para `.zip`
- 🌍 **Gerenciamento de Mundos**: Envie um mundo compactado para gerenciar seus addons
  - Visualize addons existentes no mundo
  - Adicione novos addons ao mundo
  - Remova addons desmarcando-os
  - Exporte apenas as pastas de addons (sem o mapa)
- 🎁 **Suporte a Nested Archives**: Envie um `.zip` contendo vários addons dentro (processamento recursivo)
- 🔍 **Detecção Automática**: Identifica automaticamente Behavior Packs e Resource Packs através do `manifest.json`
- 📁 **Organização Inteligente**: Separa os addons nas pastas corretas:
  - `behavior_packs/` para Behavior Packs
  - `resource_packs/` para Resource Packs
  - `unknown_packs/` para packs não categorizados (novos uploads)
  - Pasta original preservada para packs desconhecidos de mundos
- ❓ **Categorização Manual**: Packs sem tipo identificável podem ser categorizados manualmente
- 💬 **JSON com Comentários**: Suporta manifest.json com comentários (`//` e `/* */`) usados por editores como bridge.
- ⚙️ **Sistema de Ativação**: Gera automaticamente os arquivos de ativação:
  - `world_behavior_packs.json`
  - `world_resource_packs.json`
- ✅ **Controle Individual**: Escolha quais addons ativar ou desativar
- 💾 **Download Organizado**: Baixe um único arquivo `.zip` com tudo organizado
- 🎨 **Interface Moderna**: Design bonito e responsivo com tema inspirado no Minecraft
- 🚀 **100% Client-Side**: Nenhum dado é enviado para servidores, tudo é processado no navegador

## 🚀 Como Usar

1. **Acesse o Site**
   - Abra o `index.html` no seu navegador
   - Ou acesse a versão hospedada no GitHub Pages

2. **Faça Upload dos Addons**
   - Arraste e solte seus arquivos de addon na área de upload
   - Ou clique no botão "Selecionar Arquivos"
   - Suporta múltiplos arquivos de uma vez

3. **Processe os Addons**
   - Clique no botão "🚀 Processar Addons"
   - Aguarde o processamento (pode levar alguns segundos dependendo do tamanho)

4. **Configure a Ativação**
   - Marque ou desmarque os addons que deseja ativar
   - Por padrão, todos vêm marcados
   - Use "Selecionar Todos" ou "Desmarcar Todos" para facilitar

5. **Baixe o Resultado**
   - Clique em "📥 Baixar Addons Organizados"
   - Um arquivo `.zip` será baixado com:
     - Pastas organizadas (`behavior_packs/` e `resource_packs/`)
     - Arquivos de ativação (`world_behavior_packs.json` e `world_resource_packs.json`)

## 📂 Estrutura do Projeto

```
AddonInstaller/
├── index.html          # Página principal
├── style.css           # Estilos da interface
├── script.js           # Lógica da aplicação
└── README.md           # Este arquivo
```

## 🛠️ Tecnologias Utilizadas

- **HTML5** - Estrutura da página
- **CSS3** - Estilos e animações
- **JavaScript (ES6+)** - Lógica da aplicação
- **JSZip** - Biblioteca para manipulação de arquivos ZIP e similares
- **Pako** - Biblioteca para descompactação de arquivos .gz e .tar.gz
- **GitHub Pages** - Hospedagem gratuita

## 📋 Como Funciona

O sistema funciona através dos seguintes passos:

1. **Leitura dos Arquivos**: Os arquivos são lidos diretamente no navegador
2. **Descompactação Recursiva**: 
   - Cada arquivo é descompactado usando JSZip
   - Se encontrar arquivos `.zip`, `.rar`, `.mcpack` ou `.mcaddon` dentro, processa recursivamente
   - Suporta múltiplos níveis de arquivos nested
3. **Análise do Manifest**: O sistema procura por arquivos `manifest.json` em todos os níveis
4. **Classificação**: Verifica o campo `modules[].type`:
   - `"data"` → Behavior Pack
   - `"resources"` → Resource Pack
5. **Organização**: Agrupa os arquivos nas pastas corretas
6. **Ativação**: Gera os arquivos JSON com base nos addons selecionados:
   - Extrai `uuid` e `version` do `header` do manifest
   - Cria `world_behavior_packs.json` com os behavior packs ativos
   - Cria `world_resource_packs.json` com os resource packs ativos
7. **Geração**: Cria um novo arquivo ZIP com a estrutura organizada e arquivos de ativação

## 🌐 Deploy no GitHub Pages

### Passo 1: Criar Repositório

1. Crie um novo repositório no GitHub
2. Faça upload dos arquivos do projeto

### Passo 2: Configurar GitHub Pages

1. Vá em **Settings** → **Pages**
2. Em **Source**, selecione a branch `main` (ou `master`)
3. Selecione a pasta `/` (root)
4. Clique em **Save**

### Passo 3: Acessar o Site

Após alguns minutos, seu site estará disponível em:
```
https://seu-usuario.github.io/nome-do-repositorio/
```

## 📝 Exemplos

### Manifest.json - Behavior Pack
```json
{
  "format_version": 2,
  "header": {
    "name": "Meu Behavior Pack",
    "description": "Descrição do pack",
    "uuid": "33556fcf-d192-4d5f-96a0-29357702af7b",
    "version": [1, 0, 0]
  },
  "modules": [
    {
      "type": "data",
      "uuid": "8c9f456a-d192-4d5f-96a0-29357702af7c",
      "version": [1, 0, 0]
    }
  ]
}
```

### Manifest.json - Resource Pack
```json
{
  "format_version": 2,
  "header": {
    "name": "Meu Resource Pack",
    "description": "Descrição do pack",
    "uuid": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "version": [1, 0, 0]
  },
  "modules": [
    {
      "type": "resources",
      "uuid": "b2c3d4e5-f6a7-8901-bcde-f12345678901",
      "version": [1, 0, 0]
    }
  ]
}
```

### world_behavior_packs.json (Gerado Automaticamente)
```json
[
	{
		"pack_id": "33556fcf-d192-4d5f-96a0-29357702af7b",
		"version": [1, 0, 0]
	}
]
```

### world_resource_packs.json (Gerado Automaticamente)
```json
[
	{
		"pack_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
		"version": [1, 0, 0]
	}
]
```

## � Casos de Uso

### Cenário 1: Addons Individuais
Envie arquivos `.mcpack` ou `.mcaddon` individuais:
```
addon1.mcpack
addon2.mcaddon
addon3.zip
```

### Cenário 2: Pasta com Múltiplos Addons
Envie um único `.zip` contendo vários addons:
```
meus_addons.zip
├── addon1.mcpack
├── addon2.mcaddon
├── addon3.zip
└── addon4.mcpack
```

### Cenário 3: Estrutura Aninhada
Suporta até múltiplos níveis de nested archives:
```
collection.zip
├── pack1/
│   ├── behavior.mcpack
│   └── resource.mcpack
└── pack2.zip
    ├── addon_a.mcaddon
    └── addon_b.mcpack
```

## �🐛 Solução de Problemas

### O arquivo não é processado
- Verifique se o arquivo contém um `manifest.json` válido
- Certifique-se de que o formato do arquivo é suportado
- Se for um nested archive, verifique se os arquivos internos são válidos

### Erro ao baixar o resultado
- Verifique se pelo menos um addon foi processado com sucesso
- Tente com um navegador diferente

### Performance lenta
- Arquivos muito grandes podem levar mais tempo para processar
- Nested archives com muitos níveis podem aumentar o tempo de processamento
- Tente processar menos arquivos de uma vez

## 🤝 Contribuindo

Contribuições são bem-vindas! Sinta-se à vontade para:

1. Fazer um fork do projeto
2. Criar uma branch para sua feature (`git checkout -b feature/MinhaFeature`)
3. Commit suas mudanças (`git commit -m 'Adiciona MinhaFeature'`)
4. Push para a branch (`git push origin feature/MinhaFeature`)
5. Abrir um Pull Request

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo `LICENSE` para mais detalhes.

## 💚 Créditos

Feito com ❤️ para a comunidade Minecraft Bedrock

---

## 📦 Estrutura do ZIP Final

O arquivo baixado terá a seguinte estrutura:

```
minecraft_addons_organized.zip
├── behavior_packs/
│   ├── Addon1/
│   │   ├── manifest.json
│   │   └── ... (outros arquivos)
│   └── Addon2/
│       └── ...
├── resource_packs/
│   ├── Addon3/
│   │   ├── manifest.json
│   │   └── ... (outros arquivos)
│   └── Addon4/
│       └── ...
├── world_behavior_packs.json (se houver behavior packs ativos)
└── world_resource_packs.json (se houver resource packs ativos)
```

## 🎯 Roadmap

Futuras melhorias planejadas:

- [ ] Suporte para arquivos `.mcworld`
- [ ] Preview dos addons antes do processamento
- [ ] Validação de UUIDs duplicados
- [ ] Suporte para edição de metadados
- [ ] Reordenação de prioridade dos addons
- [ ] Temas customizáveis
- [ ] Suporte para múltiplos idiomas

## 📞 Suporte

Se você encontrar algum problema ou tiver sugestões, por favor:

1. Abra uma [Issue](https://github.com/seu-usuario/nome-do-repositorio/issues)
2. Descreva o problema ou sugestão detalhadamente
3. Aguarde o retorno da comunidade

---

**Nota**: Este projeto não é afiliado ou endossado pela Mojang Studios ou Microsoft.
