# 🎮 Bedrock Addon Installer

> **O jeito mais fácil de organizar, ativar e instalar mods no seu Minecraft Bedrock Edition!**  
> Funciona direto no seu navegador de internet, sem instalar programas extras, sem propagandas e **sem enviar seus arquivos para a internet** (tudo é processado 100% no seu próprio celular ou computador).

---

## 📖 Dicionário para Iniciantes (Entenda em 1 minuto)

Se você não entende termos técnicos de Minecraft, não se preocupe! Aqui está tudo explicado de forma simples:

| Termo | O que significa na prática? | Exemplo |
|---|---|---|
| **Addon / Mod** | Qualquer modificação que adiciona coisas novas ao Minecraft. | Carros, dragões, novas espadas, móveis. |
| **Behavior Pack (BP)** | É o **motor / cérebro** do mod. É o código que faz as coisas funcionarem. | Faz o carro andar, a espada dar superpoderes, o monstro atacar. |
| **Resource Pack (RP)** | É a **roupa / visual** do mod. São as texturas, desenhos 3D e sons. | A imagem e cor do carro, o som do motor, o desenho da espada. |
| **Manifest e UUID** | É o **RG / Certidão de nascimento** do mod. Um código único que o Minecraft lê para saber quem é aquele mod. Se estiver errado, o jogo não abre. | `12345678-1234-1234-1234-123456789abc` |
| **Arquivo `.mcpack`** | Um pacote de mod avulso. | Só dar 2 cliques para o Minecraft instalar sozinho. |
| **Arquivo `.mcaddon`** | Um pacote completo que já vem com o Behavior Pack (BP) e o Resource Pack (RP) juntos. | Mod completo com código e textura juntos. |
| **Arquivo `.mcworld`** | Um mundo/mapa inteiro salvo do Minecraft. | O seu mapa onde você construiu sua casa. |

> 💡 **Regra de Ouro:** A maioria dos mods precisa do **Behavior Pack (BP)** e do **Resource Pack (RP)** ativados **juntos**! Se você colocar só o Behavior, o item funciona mas fica invisível ou com textura roxa e preta. Se colocar só o Resource, você vê o item mas ele não faz nada.

---

## ⚡ Como Usar a Ferramenta Web (3 Passos Rápidos)

1. **Passo 1: Envie seus arquivos**  
   Abra a página no navegador. Arraste ou clique no botão verde para escolher os arquivos do seu mod (`.mcpack`, `.mcaddon`, `.zip`) ou o arquivo do seu mapa (`.mcworld`).
2. **Passo 2: Clique em Processar Addons**  
   Aperte o botão verde **"🚀 Passo 2: Processar Addons"**. O sistema lerá e organizará tudo sozinho em segundos.
3. **Passo 3: Escolha o que ativar e Baixe!**  
   - Marque a caixinha ✅ dos mods que quer deixar ligados.
   - Clique em **"📥 Baixar Addons Organizados"** para baixar o pacote pronto, **OU** clique em **"📥 Baixar .mcpack"** ao lado de um mod específico para instalá-lo com 1 clique!

---

## 📱 TUTORIAL 1: Como Instalar no CELULAR (Android e iOS)

### Opção A — O Método Mais Fácil (Mod Avulso `.mcpack` com 1 Toque)
1. Na lista de resultados da ferramenta, clique no botão **"📥 Baixar .mcpack"** ao lado do mod que você quer.
2. Abra o gerenciador de arquivos do seu celular (ou o app gratuito **ZArchiver**).
3. Vá na pasta **Download** e dê **um toque** em cima do arquivo `.mcpack` ou `.mcaddon` baixado.
4. Escolha **"Abrir com Minecraft"** (se perguntar, selecione "Sempre").
5. O Minecraft vai abrir sozinho e mostrará no topo da tela: `Importação iniciada... Importação bem-sucedida!`.
6. No menu do Minecraft, clique no botão de **Lápis (Editar)** ao lado do seu mundo:
   - Vá em **Pacotes de Comportamento** > *Disponíveis* > clique no mod > **Ativar**.
   - Vá em **Pacotes de Recursos** > *Disponíveis* > clique no mod > **Ativar**.
   - **OBRIGATÓRIO:** Role até **Experimentos** e ligue todos os botões (veja o tutorial de experimentos abaixo!).

---

### Opção B — Colocar Pastas no Mundo do Celular (com ZArchiver)
Se você baixou o pacote `.zip` completo gerado por esta ferramenta:
1. Instale o aplicativo gratuito **ZArchiver** na Google Play Store.
2. Abra o **ZArchiver**, entre na pasta **Download**, dê um toque no arquivo `.zip` baixado e escolha **Extrair aqui**.
3. Você verá as pastas `behavior_packs` e `resource_packs`.
4. Segure o dedo em cima delas e toque em **Copiar**.
5. Agora vá navegando pelas seguintes pastas no ZArchiver:
   ```text
   Memória interna > Android > data > com.mojang.minecraftpe > files > games > com.mojang > minecraftWorlds
   ```
6. Entre na pasta do seu mundo.
7. Se já existirem as pastas `behavior_packs` e `resource_packs`, **apague as antigas**.
8. Toque no botão verde no canto inferior direito para **Colar** as novas pastas!

> 📌 **Dica para Android 13 e 14:** Se o Android pedir permissão para acessar a pasta `data`, toque no botão azul **"Usar esta pasta"** e depois em **"Permitir"**.

---

## 💻 TUTORIAL 2: Como Instalar no COMPUTADOR (Windows 10 / 11)

### Opção A — Instalação com 2 Cliques (Mod Avulso `.mcpack`)
1. Clique no botão **"📥 Baixar .mcpack"** no card do mod que deseja instalar.
2. Abra a pasta **Downloads** no seu computador.
3. Dê **dois cliques** rápidos no arquivo `.mcpack`.
4. O Minecraft Bedrock vai abrir automaticamente e instalar o mod sozinho!
5. Abra o jogo, vá nas opções do seu mundo, ative o mod e ligue os **Experimentos**.

---

### Opção B — Colocar na Pasta do Mundo no Computador (Atalho Win + R)
Se você baixou o arquivo `.zip` completo com os addons organizados:
1. Clique com o botão direito no arquivo `.zip` baixado e escolha **"Extrair Tudo"**.
2. No teclado do seu computador, aperte as teclas **Windows (a tecla com a bandeirinha) + R** ao mesmo tempo.
3. Uma janelinha chamada **Executar** vai abrir no canto da tela.
4. Copie exatamente a linha abaixo, cole dentro da janelinha e aperte **Enter**:
   ```text
   %localappdata%\Packages\Microsoft.MinecraftUWP_8wekyb3d8bbwe\LocalState\games\com.mojang\minecraftWorlds
   ```
5. Você verá as pastas dos seus mundos (cada pasta com letras aleatórias é um mundo seu).
6. Abra a pasta do mundo que você quer alterar.
7. Se existirem pastas antigas chamadas `behavior_packs` e `resource_packs`, **apague-as**.
8. **Copie e cole** as novas pastas e arquivos que você extraiu do `.zip` para dentro desta pasta do mundo!
9. Abra o Minecraft e jogue!

---

## 🖥️ TUTORIAL 3: Como Instalar em SERVIDORES (EnxadaHost)

1. Baixe o arquivo `.zip` clicando em **"📥 Baixar Addons Organizados"** e extraia no seu computador ou celular.
2. Acesse o painel da sua hospedagem de Minecraft (EnxadaHost) e abra o **Gerenciador de Arquivos** (ou conecte via FTP / FileZilla).
3. Abra a pasta `worlds` e entre na pasta do seu mundo (geralmente chamada `Bedrock level`).
4. Apague as pastas antigas `behavior_packs` e `resource_packs` que estiverem lá dentro.
5. Envie (upload) as novas pastas geradas pela ferramenta:
   - 📁 `behavior_packs/`
   - 📁 `resource_packs/`
   - 📄 `world_behavior_packs.json`
   - 📄 `world_resource_packs.json`
6. **MUITO IMPORTANTE:** Clique no botão **Reiniciar Servidor** no seu painel para aplicar as alterações!

---

## ⚠️ TUTORIAL 4 OBRIGATÓRIO: Como Ativar os "Experimentos" no Minecraft

> 🔥 **Atenção:** 90% das pessoas acham que o mod veio com defeito porque **esqueceram de ligar os Experimentos**! Todo addon moderno exige que esta opção esteja ativada no mundo.

1. No menu principal do Minecraft, clique em **Jogar**.
2. Ao lado do seu mundo, clique no ícone do **Lápis (Editar)**.
3. No menu da esquerda, certifique-se de estar na aba **Jogo**.
4. Role a tela da direita para baixo até encontrar a categoria **Experimentos**.
5. **Ative todos os interruptores:**
   - [x] **Recursos de criador de férias** (*Holiday Creator Features*)
   - [x] **Recursos adicionais de modificação** (*Additional Modding Capabilities*)
   - [x] **Próximas funções do criador** (*Upcoming Creator Features*)
   - [x] **Recursos da API Beta** (*Beta APIs*)
   - [x] **Criação de biomas personalizados** (*Custom Biomes*)
6. Quando o jogo perguntar se tem certeza, clique em **"Ativar experimentos mesmo assim"**.
7. O Minecraft criará uma cópia do seu mundo com os experimentos ligados. Entre nessa cópia e divirta-se!

---

## ❓ Perguntas Frequentes (FAQ)

### 1. Meu mod termina em `.rar` ou `.7z`, por que não funciona?
Navegadores de internet não conseguem abrir arquivos `.rar` ou `.7z` por limitações técnicas. Use o aplicativo gratuito **ZArchiver** no celular ou o **WinRAR** no PC para extrair os arquivos antes, e use os arquivos `.mcpack` ou `.zip` que estiverem lá dentro.

### 2. Por que os itens do meu mod estão invisíveis ou com textura roxa e preta?
Isso acontece quando o **Behavior Pack** foi carregado, mas o **Resource Pack (Texturas)** não foi ativado, ou os **Experimentos** não foram ligados nas opções do mundo.

### 3. Esta ferramenta pode apagar minhas construções no mundo?
**Não!** A ferramenta só mexe nas pastas de mods e nos arquivos de ativação. Ela nunca altera suas construções, baús ou mapa. Ainda assim, sempre recomendamos fazer um backup por precaução.

### 4. Meus arquivos são enviados para a internet?
**Não!** A ferramenta processa tudo localmente na memória do seu próprio navegador. Nada é enviado para nenhum servidor externo.

---

## 🛠️ Para Desenvolvedores (Rodando Localmente)

Se você deseja rodar localmente no seu computador ou contribuir com o código:

```bash
# 1. Clonar o repositório
git clone https://github.com/PgLESv/BedrockAddonInstaller.git
cd BedrockAddonInstaller

# 2. Iniciar servidor local
npm start

# 3. Rodar a suíte de testes automatizados
npm test

# 4. Recompilar o bundle de produção (caso altere arquivos em src/)
npm run build
```

> **Dica:** Você também pode simplesmente dar dois cliques no arquivo `index.html` para abrir diretamente no navegador!

---

## 📄 Licença e Aviso Legal

Distribuído sob a licença MIT. Consulte `LICENSE` para mais detalhes.

**Aviso Legal:** Este é um projeto de código aberto mantido de forma independente pela comunidade e **não possui qualquer afiliação, patrocínio ou endosso** da Mojang Studios ou da Microsoft Corporation. Minecraft® é marca registrada da Mojang Synergies AB.
