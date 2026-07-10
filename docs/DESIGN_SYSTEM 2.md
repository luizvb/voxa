# Voxa Design System: 2050 Minimalist & Apple Magical Experience

Este documento serve como a "Bíblia" de interface e experiência para o Voxa. Ele consolida uma estética visual arrojada — o **"2050 Minimalist"** — com o rigor técnico, a ergonomia e a **Experiência Mágica** do ecossistema Apple (iOS). Seja desenvolvendo a versão web com Shadcn UI ou o aplicativo nativo com SwiftUI, estas são as leis imutáveis do produto.

---

## 1. Estética Central: "2050 Minimalist"

O minimalismo de 2050 transcende o flat design tradicional. Trata-se da total ausência de ruído visual, focando no que realmente importa através de luz, profundidade matemática e alto contraste.

### 1.1 Cores e Dark Mode Integrado
*   **Deep Dark First:** A interface principal habita os pretos profundos (Vantablack ou `#050505`).
*   **Semantic Colors (Cores Semânticas):** No código (especialmente iOS), nunca inverta cores com lógicas manuais ou use hexadecimais engessados. Utilize estilos semânticos do sistema (como `System Background`, `Secondary System Background`, `Label Color`) deixando o motor de renderização calcular os contrastes perfeitos e adaptações de acessibilidade.
*   **Brilho e Contraste:** Textos primários são brancos ofuscantes para destacar a leitura. Elementos secundários recuam em cinzas profundos para hierarquia imediata.

### 1.2 Materiais, Desfoque e Profundidade
*   **Vibrancy & Materials (Glassmorphism Evoluído):** Em vez de cores sólidas, barras flutuantes, menus de navegação e modais devem usar camadas de material translúcido com *blur* nativo (no iOS: `UIBlurEffectStyle`; na Web: `backdrop-blur`). Isso cria uma sensação física de camadas sobrepostas sem perder a legibilidade.

### 1.3 Espaço Negativo e Limites Físicos (Safe Areas)
*   A interface deve respirar generosamente.
*   Nenhum conteúdo interativo pode ultrapassar ou ignorar a **Safe Area**. O layout deve contornar naturalmente a *Dynamic Island* (ou notch) no topo e a *Home Indicator* (barra de navegação) na base.

---

## 2. Navegação e Arquitetura da Informação

A jornada do usuário precisa exigir zero esforço cognitivo. O app não é um site onde o usuário explora; é uma ferramenta onde ele executa.

*   **Hierarquia Flat (Rasa):** A função central (ex: Gravar) nunca deve estar a mais de um toque de distância.
*   **Tab Bar Nativa:** Utilize uma barra inferior limpa (3 a 5 abas). É terminantemente proibido o uso de "Menus Hambúrguer" para funções centrais, pois eles criam fricção e escondem o contexto.
*   **Large Titles e Navigation Bar:** Toda tela superior usa *Large Titles* (títulos imensos de 34pt, alinhados à esquerda) para declarar o contexto com autoridade. Ao realizar o scroll da página, esse título deve encolher suavemente e se centralizar na barra superior de forma nativa.
*   **Gestos Mandatórios:** 
    *   **Swipe to Go Back:** Deslizar da borda esquerda para a direita deve sempre voltar a tela.
    *   **Drag to Dismiss:** Arrastar para baixo deve invariavelmente dispensar modais e folhas (sheets).

---

## 3. Tipografia e Acessibilidade (Dynamic Type)

A tipografia no ecossistema Apple não é apenas estética; é uma ciência exata de leitura e acessibilidade elástica.

### 3.1 Família San Francisco (SF)
O Voxa utiliza a fonte do sistema para máxima integração, otimização e *Optical Sizing* automático:
*   **SF Pro:** O pilar da interface.
*   **SF Rounded:** Utilizada para trazer um ar mais lúdico, orgânico e moderno (especialmente em botões circulares ou métricas).
*   **SF Mono:** Exclusiva para cronômetros, códigos ou tabelas de dados que exigem alinhamento rígido.

### 3.2 O Padrão Dynamic Type
**É proibido definir tamanhos fixos de fonte (ex: 16pt).** A tipografia deve sempre ser instanciada por **Estilos Semânticos**. Isso permite ao sistema ajustar espaçamento (tracking) e entrelinha (leading) e suportar usuários com deficiência visual que ampliam as fontes do sistema.

| Estilo Semântico (Text Style) | Tamanho Base | Peso Padrão | Uso |
| :--- | :--- | :--- | :--- |
| **Large Title** | 34pt | Regular | Cabeçalho supremo da aba atual. |
| **Title 1 / 2 / 3** | 28pt / 22pt / 20pt | Regular | Divisões de blocos e destaques. |
| **Headline** | 17pt | Semi-Bold | Cabeçalho para ações, forte legibilidade. |
| **Body** | **17pt** | **Regular** | **O texto corrido oficial (usado em 80% do app).** |
| **Callout / Subhead** | 16pt / 15pt | Regular | Textos de apoio a títulos maiores. |
| **Footnote / Caption 1 / 2**| 13pt / 12pt / 11pt | Regular | Menores textos do app (não descer além de 11pt). |

### 3.3 Acessibilidade (A11y)
*   **Layouts Elásticos (Auto Layout):** Os componentes devem "quebrar" graciosamente para múltiplas linhas se o usuário colocar o iPhone no modo de letra gigantesca. Nenhum texto deve ser "truncado" sem motivo, nem vazar da tela.
*   **VoiceOver:** Todos os ícones interativos devem possuir rótulos invisíveis (Accessibility Labels) perfeitos para que o leitor de tela os dite corretamente para pessoas cegas.

---

## 4. Layout, Espaçamento e Ergonomia

O design do Voxa respeita a biologia da mão e os recortes do hardware.

*   **Margens Sistêmicas:** O alinhamento vertical principal obedece a margens absolutas de **16pt ou 20pt** nas laterais, acompanhando as margens nativas das telas de Ajustes da Apple.
*   **Touch Targets Implacáveis:** O dedo é impreciso e rápido. **Nada interativo no app pode ter menos que 44x44pt** de área de toque real (mesmo que o desenho do ícone tenha apenas 24x24pt).
*   **Iconografia:** Preferência irrestrita aos **SF Symbols** para desenvolvimento iOS e ícones estruturalmente similares (como Lucide) para Web. SF Symbols alinham-se opticamente com a SF Pro, suportam variação de peso (bold, thin) e reagem perfeitamente à mudança de escala.

---

## 5. A Experiência "Mágica" (O Diferencial Apple)

Aplicativos mágicos não apenas mostram dados, eles parecem vivos. O Voxa se destacará através da implementação imaculada destes três pilares avançados:

### 5.1 Animações Físicas (Physics-Based Animation)
O Voxa não usa tempo linear para animações, usa física.
*   **Springs (Molas):** As animações possuem propriedades físicas (massa, rigidez, amortecimento). Ao puxar uma lista, o *Rubber Banding* deve entrar em ação. Ao tocar em um card, ele sofre uma micro-contração orgânica.
*   **100% Interrompíveis:** Se um card está subindo para abrir e o usuário desliza para fechar no meio da transição, a física reverte a rota instantaneamente. Nunca force o usuário a assistir ao término de uma animação para poder agir novamente.
*   **Fluid Morphing:** Ao alterar estados (ex: Botão "Play" para "Stop"), os elementos se transformam através do movimento de seus vetores (path morphing) em vez de um rude *fade in/out*.
*   **ProMotion Ready:** Código rigorosamente limpo em SwiftUI / Core Animation para rodar a **120Hz** nos iPhones Pro sem derrubar nenhum frame.

### 5.2 Inteligência Invisível e Contextual
A IA no Voxa não exige que o usuário abra um chat. Ela age nos bastidores do sistema operacional.
*   **Live Activities e Dynamic Island:** Se o Voxa está gravando ou transcrevendo em background, o usuário não precisa de dezenas de notificações chatas. O status vive de forma sutil e animada na Ilha Dinâmica, expandindo para controles rápidos (Pausar/Parar) com um simples toque prolongado.
*   **App Intents (Siri):** O Voxa ensina seus principais comandos (como "Iniciar Gravação Rápida") ao sistema, permitindo que a Siri sugira esses botões diretamente na tela de bloqueio do usuário com base nos horários que ele costuma usar o app.
*   **Core ML (Processamento Local):** Tarefas intensas como separação de voz ou detecção de contexto usam a Neural Engine do chip da Apple localmente, garantindo zero latência percebida e privacidade absoluta.

### 5.3 Microinterações e Sincronia Sensorial
O fator "Uau" mora nos detalhes fisiológicos.
*   **Sincronia Tátil-Visual (Haptics):** A experiência não é só visual, é física. O **Taptic Engine** deve espelhar o que acontece na tela. Ao confirmar uma ação ou finalizar uma gravação, o componente visual deve pulsar em perfeita sincronia com um pulso `.success` do vibracall.
*   **Stateful Design (Feedback Emocional):** Componentes falhos "negam" fisicamente com a cabeça (tremem na horizontal + haptic `.error`), enquanto componentes ativados parecem saltar felizes contra o dedo (haptic `.selection`).
*   **Esqueletos ao invés de Spinners:** Em telas complexas, nunca trave o app inteiro com uma rodinha girando. O conteúdo que já está lá carrega instantaneamente, e o restante pulsa em blocos de esqueleto cinza até ser preenchido (Skeleton Screens).

---

## 6. Fluxos Críticos e Boas Práticas

*   **Permissões Contextuais (Camera/Microfone):** Nunca ataque o usuário pedindo permissão de microfone logo após o login. A permissão **só deve ser disparada** na fração de segundo em que ele apertar o botão "Gravar" pela primeira vez. Isso maximiza a taxa de aprovação (opt-in).
*   **Uso de Sheets Modal:** Para criar uma nota rápida, realizar configurações ou preencher formulários secundários, sempre levante uma "Sheet" (painel que sobe de baixo). Isso preserva a memória espacial do usuário, mantendo a tela principal visível ao fundo.

---

## 7. O Check-list de Validação Suprema

Nenhum PR de design ou de tela será aprovado a menos que gabarite os requisitos abaixo:

- [ ] **Ergonomia e Tamanho:** Todos os itens clicáveis batem os 44x44pt mínimos?
- [ ] **Limites Seguros:** A interface respeita a *Safe Area* e as margens sistêmicas laterais (16/20pt)?
- [ ] **Fonte Fluida:** Toda a tipografia usa os **Estilos Semânticos** do Dynamic Type e obedece aos ajustes de tamanho via sistema?
- [ ] **Leitura de Tela:** Todo ícone isolado possui *Accessibility Label* oculto?
- [ ] **Navegação Nativa:** As transições entre páginas respeitam *Large Titles* no topo e suportam plenamente gestos como *Swipe to Go Back*?
- [ ] **Sentido Tátil:** As interações chave disparam feedback tátil sutil através da Taptic Engine?
- [ ] **Física em Animação:** As transições e respostas a toques usam *Spring Animations* interrompíveis (e não durações fixas)?
- [ ] **Integração OS:** Foi planejado o suporte nativo (onde aplicável) para *Live Activities / Dynamic Island*?
- [ ] **Aesthetic 2050:** O layout tem respiro, hierarquia através de *Vibrancy/Materials* no background e um contraste dramático?
