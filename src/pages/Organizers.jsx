import { useI18n } from '../hooks/useI18n';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  CalendarDays,
  ClipboardCheck,
  GitBranch,
  Medal,
  Megaphone,
  MonitorSmartphone,
  QrCode,
  ShoppingCart,
  Trophy,
  Users,
  Video,
  Wallet,
  Zap,
  BellRing,
  Sparkles
} from 'lucide-react';
import './Organizers.css';
import bjjStormLogo from '../../img/Bjj storm.jpg';
import copaBufaloLogo from '../../img/Copa bufalo.jpg';
import filmmakerChampion from '../../img/filmmaker-champion.jpg';
import filmmakerPhotographer from '../../img/filmmaker-photographer.jfif';
import filmmakerVenue from '../../img/filmmaker-venue.jpg';
import jjfaLogo from '../../img/JJFA.png';
import openSarzedoLogo from '../../img/Open sarzedo.jpg';
import organizersHero from '../../img/organizers-command-center-new.png';
import placarImage from '../../img/placar.png';
import {
  buildFilmmakerWhatsappLink,
  FILMMAKER_INSTAGRAM_URL
} from '../utils/filmmaker';

const CONTACT_PHONE = '5531993383014';

const metrics = [
  { value: '100%', label: 'Fluxo digital da inscrição ao pódio' },
  { value: '4x', label: 'Mais leitura para mesa, árbitros e público' },
  { value: '24h', label: 'Evento pronto para operar e divulgar' }
];

const modules = [
  {
    title: 'Inscrições e lotes',
    text: 'Venda por lote, acompanhe pagamentos e mantenha os atletas sempre no fluxo certo.',
    icon: ShoppingCart
  },
  {
    title: 'Chaves inteligentes',
    text: 'Monte categorias, gere confrontos e ajuste a operação sem depender de planilhas soltas.',
    icon: GitBranch
  },
  {
    title: 'Notificações para atletas',
    text: 'Avisos de chaveamento e cronograma direto para o atleta, mantendo todos informados e sem atrasos na área de luta.',
    icon: BellRing
  },
  {
    title: 'Mesa e placar',
    text: 'Controle de luta, pontuação e chamada com uma experiência feita para campeonato real.',
    icon: MonitorSmartphone
  },
  {
    title: 'Check-in e credenciais',
    text: 'QR Code, status de atleta e leitura rápida para reduzir fila e erro de comunicação.',
    icon: QrCode
  },
  {
    title: 'A Genesis monta tudo',
    text: 'Nós montamos o seu campeonato completo: lotes, categorias, taxas e regras. Você só foca em divulgar e lucrar.',
    icon: Sparkles
  },
  {
    title: 'Resultados oficiais',
    text: 'Pódio, ranking e histórico saem do evento com aparência profissional e dados confiáveis.',
    icon: Trophy
  },
  {
    title: 'Comunicação do evento',
    text: 'Página pública, avisos e materiais para transformar interesse em inscrições.',
    icon: Megaphone
  }
];

const showcases = [
  {
    title: 'Visão da mesa',
    text: 'Cronograma, chamadas e categorias ficam organizados para a equipe trabalhar sem improviso.',
    image: organizersHero,
    icon: ClipboardCheck
  },
  {
    title: 'Experiência de arena',
    text: 'Placar, painel e resultado final criam uma leitura limpa para atletas, professores e torcida.',
    image: placarImage,
    icon: Medal
  },
  {
    title: 'Imagem de campeonato grande',
    text: 'Fotos, vídeo e página pública ajudam sua organização a vender melhor a próxima edição.',
    image: filmmakerChampion,
    icon: Video
  }
];

const workflow = [
  {
    step: '01',
    title: 'Montamos o evento para você',
    text: 'Você nos passa as informações e nós cuidamos da configuração de lotes, categorias, taxas, imagens e regras públicas.'
  },
  {
    step: '02',
    title: 'Publicamos para atletas',
    text: 'Página do campeonato pronta para inscrição, informações, pesagem, local e avisos, com notificações de chaveamento.'
  },
  {
    step: '03',
    title: 'Operamos no dia',
    text: 'Mesa, chaves, placar, chamada e resultados trabalhando no mesmo ambiente.'
  },
  {
    step: '04',
    title: 'Entregamos o pós-evento',
    text: 'Ranking, pódio, relatórios e conteúdo para fortalecer a marca do organizador.'
  }
];

const testimonials = [
  {
    quote: 'A Genesis organizou o caos da mesa. O evento ganhou leitura, ritmo e muito mais confiança para a equipe inteira.',
    author: 'BJJ Storm',
    role: 'Organização oficial',
    image: bjjStormLogo
  },
  {
    quote: 'Placar, cronograma e chaveamento conversando no mesmo fluxo mudaram nosso nível de operação.',
    author: 'Copa Búfalo',
    role: 'Equipe técnica',
    image: copaBufaloLogo
  },
  {
    quote: 'O ranking automático e os resultados oficiais deram cara de campeonato grande para o nosso evento.',
    author: 'Open Sarzedo',
    role: 'Direção de evento',
    image: openSarzedoLogo
  },
  {
    quote: 'Hoje a gente não depende mais de papel e improviso. O fluxo inteiro fica na plataforma.',
    author: 'JJFA',
    role: 'Coordenação geral',
    image: jjfaLogo
  }
];

const Organizers = () => {
  const { uiVariant } = useI18n();

  const copyByLanguage = {
    pt: {
      kicker: 'Genesis para organizadores',
      title: 'Seu campeonato com estrutura de arena, mesa digital e entrega profissional.',
      desc: 'Uma página completa para vender inscrições, organizar atletas, controlar chaves, publicar horários e entregar resultados com aparência de evento grande.',
      specialistBtn: 'Falar com especialista',
      createBtn: 'Criar evento',
      opComplete: 'Operação completa',
      opCompleteTitle: 'Menos improviso na mesa. Mais controle antes, durante e depois do evento.',
      opCompleteDesc: 'A Genesis une inscrição, comunicação, chaveamento, placar, ranking e conteúdo em uma experiência única para a organização. O atleta encontra tudo no campeonato público e a equipe trabalha com informação centralizada.',
      toolsKicker: 'Ferramentas essenciais',
      toolsTitle: 'O que o organizador precisa no mesmo lugar.',
      visualKicker: 'Visual forte',
      visualTitle: 'Uma experiência que parece campeonato grande desde o primeiro clique.',
      methodKicker: 'Método Genesis',
      methodTitle: 'Do cadastro ao resultado final, cada etapa tem dono.',
      methodDesc: 'O fluxo foi desenhado para reduzir retrabalho e deixar a organização livre para cuidar do que importa: público, atletas, professores e patrocinadores.',
      partnersKicker: 'Organizadores parceiros',
      partnersTitle: 'Quem opera com mais clareza, vende melhor a próxima edição.',
      filmmakerKicker: 'Filmmaker e foto',
      filmmakerTitle: 'Transforme seu campeonato em conteúdo para vender a próxima edição.',
      filmmakerDesc: 'Cobertura cinematográfica, fotos de pódio, bastidores e material de divulgação para dar peso visual à sua organização.',
      filmmakerReq: 'Solicitar cobertura',
      filmmakerPort: 'Ver portfólio',
      ctaKicker: 'Pronto para publicar',
      ctaTitle: 'Vamos montar uma página de campeonato que atletas realmente entendem.',
      ctaDesc: 'Conte com a Genesis para deixar inscrições, hospedagem, localização, pesagem, chaves, horários e resultados no mesmo ambiente.',
      ctaBtn: 'Começar agora',
      m1Label: 'Fluxo digital da inscrição ao pódio',
      m2Label: 'Mais leitura para mesa, árbitros e público',
      m3Label: 'Evento pronto para operar e divulgar',
      mod1Title: 'Inscrições e lotes',
      mod1Text: 'Venda por lote, acompanhe pagamentos e mantenha os atletas sempre no fluxo certo.',
      mod2Title: 'Chaves inteligentes',
      mod2Text: 'Monte categorias, gere confrontos e ajuste a operação sem depender de planilhas soltas.',
      mod3Title: 'Notificações para atletas',
      mod3Text: 'Avisos de chaveamento e cronograma direto para o atleta, mantendo todos informados e sem atrasos na área de luta.',
      mod4Title: 'Mesa e placar',
      mod4Text: 'Controle de luta, pontuação e chamada com uma experiência feita para campeonato real.',
      mod5Title: 'Check-in e credenciais',
      mod5Text: 'QR Code, status de atleta e leitura rápida para reduzir fila e erro de comunicação.',
      mod6Title: 'A Genesis monta tudo',
      mod6Text: 'Nós montamos o seu campeonato completo: lotes, categorias, taxas e regras. Você só foca em divulgar e lucrar.',
      mod7Title: 'Resultados oficiais',
      mod7Text: 'Pódio, ranking e histórico saem do evento com aparência profissional e dados confiáveis.',
      mod8Title: 'Comunicação do evento',
      mod8Text: 'Página pública, avisos e materiais para transformar interesse em inscrições.',
      show1Title: 'Visão da mesa',
      show1Text: 'Cronograma, chamadas e categorias ficam organizados para a equipe trabalhar sem improviso.',
      show2Title: 'Experiência de arena',
      show2Text: 'Placar, painel e resultado final criam uma leitura limpa para atletas, professores e torcida.',
      show3Title: 'Imagem de campeonato grande',
      show3Text: 'Fotos, vídeo e página pública ajudam sua organização a vender melhor a próxima edição.',
      work1Title: 'Montamos o evento para você',
      work1Text: 'Você nos passa as informações e nós cuidamos da configuração de lotes, categorias, taxas, imagens e regras públicas.',
      work2Title: 'Publicamos para atletas',
      work2Text: 'Página do campeonato pronta para inscrição, informações, pesagem, local e avisos, com notificações de chaveamento.',
      work3Title: 'Operamos no dia',
      work3Text: 'Mesa, chaves, placar, chamada e resultados trabalhando no mesmo ambiente.',
      work4Title: 'Entregamos o pós-evento',
      work4Text: 'Ranking, pódio, relatórios e conteúdo para fortalecer a marca do organizador.',
      test1Quote: 'A Genesis organizou o caos da mesa. O evento ganhou leitura, ritmo e muito mais confiança para a equipe inteira.',
      test1Role: 'Organização oficial',
      test2Quote: 'Placar, cronograma e chaveamento conversando no mesmo fluxo mudaram nosso nível de operação.',
      test2Role: 'Equipe técnica',
      test3Quote: 'O ranking automático e os resultados oficiais deram cara de campeonato grande para o nosso evento.',
      test3Role: 'Direção de evento',
      test4Quote: 'Hoje a gente não depende mais de papel e improviso. O fluxo inteiro fica na plataforma.',
      test4Role: 'Coordenação geral',
      schedClear: 'Cronograma claro',
      schedClearDesc: 'Ordem de lutas, áreas e horários em uma leitura simples.',
      athletesOrg: 'Atletas organizados',
      athletesOrgDesc: 'Dados, categorias, status e inscrições sempre conectados.',
      revenueTrack: 'Receita acompanhada',
      revenueTrackDesc: 'Valores, lotes e relatórios para decidir com mais segurança.',
      whatsappMessage: 'Olá, quero organizar um campeonato com a Genesis Esportes.',
      whatsappFilmmaker: 'Olá, quero solicitar cobertura cinematográfica da Genesis Filmmaker para meu evento.'
    },
    en: {
      kicker: 'Genesis for Organizers',
      title: 'Your championship with arena structure, digital desk and professional delivery.',
      desc: 'A complete page to sell registrations, organize athletes, control brackets, publish schedules and deliver results looking like a major event.',
      specialistBtn: 'Talk to a specialist',
      createBtn: 'Create event',
      opComplete: 'Complete operation',
      opCompleteTitle: 'Less improvisation at the desk. More control before, during and after the event.',
      opCompleteDesc: 'Genesis unites registration, communication, brackets, scoreboard, ranking and content in a unique experience for the organization. The athlete finds everything in the public championship and the staff works with centralized information.',
      toolsKicker: 'Essential tools',
      toolsTitle: 'What the organizer needs in one place.',
      visualKicker: 'Strong visuals',
      visualTitle: 'An experience that looks like a major championship from the first click.',
      methodKicker: 'Genesis Method',
      methodTitle: 'From registration to final result, every step has an owner.',
      methodDesc: 'The flow was designed to reduce rework and leave the organization free to take care of what matters: audience, athletes, coaches and sponsors.',
      partnersKicker: 'Partner organizers',
      partnersTitle: 'Those who operate with more clarity, sell the next edition better.',
      filmmakerKicker: 'Filmmaker and photo',
      filmmakerTitle: 'Turn your championship into content to sell the next edition.',
      filmmakerDesc: 'Cinematic coverage, podium photos, behind-the-scenes and promotional material to give visual weight to your organization.',
      filmmakerReq: 'Request coverage',
      filmmakerPort: 'View portfolio',
      ctaKicker: 'Ready to publish',
      ctaTitle: 'Let\'s build a championship page that athletes truly understand.',
      ctaDesc: 'Count on Genesis to keep registrations, accommodation, location, weigh-in, brackets, schedules and results in the same environment.',
      ctaBtn: 'Start now',
      m1Label: 'Digital flow from registration to podium',
      m2Label: 'Better reading for desk, referees and audience',
      m3Label: 'Event ready to operate and promote',
      mod1Title: 'Registrations and batches',
      mod1Text: 'Sell by batch, track payments and keep athletes always in the right flow.',
      mod2Title: 'Smart brackets',
      mod2Text: 'Build categories, generate matchups and adjust the operation without relying on loose spreadsheets.',
      mod3Title: 'Notifications for athletes',
      mod3Text: 'Bracket notices and schedules direct to the athlete, keeping everyone informed and without delays in the fight area.',
      mod4Title: 'Desk and scoreboard',
      mod4Text: 'Fight control, scoring and calling with an experience made for a real championship.',
      mod5Title: 'Check-in and credentials',
      mod5Text: 'QR Code, athlete status and quick reading to reduce queues and communication errors.',
      mod6Title: 'Genesis builds it all',
      mod6Text: 'We set up your entire championship: batches, categories, fees and rules. You just focus on promoting and profiting.',
      mod7Title: 'Official results',
      mod7Text: 'Podium, ranking and history leave the event looking professional and with reliable data.',
      mod8Title: 'Event communication',
      mod8Text: 'Public page, notices and materials to turn interest into registrations.',
      show1Title: 'Desk view',
      show1Text: 'Schedule, calls and categories are organized for the team to work without improvisation.',
      show2Title: 'Arena experience',
      show2Text: 'Scoreboard, panel and final result create a clean reading for athletes, coaches and fans.',
      show3Title: 'Major championship image',
      show3Text: 'Photos, video and public page help your organization sell the next edition better.',
      work1Title: 'We set up the event for you',
      work1Text: 'You give us the information and we take care of configuring batches, categories, fees, images and public rules.',
      work2Title: 'We publish for athletes',
      work2Text: 'Championship page ready for registration, information, weigh-in, location and notices, with bracket notifications.',
      work3Title: 'We operate on the day',
      work3Text: 'Desk, brackets, scoreboard, calling and results working in the same environment.',
      work4Title: 'We deliver the post-event',
      work4Text: 'Ranking, podium, reports and content to strengthen the organizer\'s brand.',
      test1Quote: 'Genesis organized the chaos of the desk. The event gained reading, rhythm and much more confidence for the whole team.',
      test1Role: 'Official organization',
      test2Quote: 'Scoreboard, schedule and brackets talking in the same flow changed our operation level.',
      test2Role: 'Technical team',
      test3Quote: 'The automatic ranking and official results gave a major championship face to our event.',
      test3Role: 'Event direction',
      test4Quote: 'Today we no longer depend on paper and improvisation. The entire flow is on the platform.',
      test4Role: 'General coordination',
      schedClear: 'Clear schedule',
      schedClearDesc: 'Order of fights, areas and times in a simple reading.',
      athletesOrg: 'Organized athletes',
      athletesOrgDesc: 'Data, categories, status and registrations always connected.',
      revenueTrack: 'Tracked revenue',
      revenueTrackDesc: 'Values, batches and reports to decide with more confidence.',
      whatsappMessage: 'Hello, I want to organize a championship with Genesis Sports.',
      whatsappFilmmaker: 'Hello, I want to request cinematic coverage from Genesis Filmmaker for my event.'
    },
    es: {
      kicker: 'Genesis para organizadores',
      title: 'Tu campeonato con estructura de arena, mesa digital y entrega profesional.',
      desc: 'Una página completa para vender inscripciones, organizar atletas, controlar llaves, publicar horarios y entregar resultados con apariencia de evento grande.',
      specialistBtn: 'Hablar con un especialista',
      createBtn: 'Crear evento',
      opComplete: 'Operación completa',
      opCompleteTitle: 'Menos improvisación en la mesa. Más control antes, durante y después del evento.',
      opCompleteDesc: 'Genesis une inscripción, comunicación, llaves, marcador, ranking y contenido en una experiencia única para la organización. El atleta encuentra todo en el campeonato público y el equipo trabaja con información centralizada.',
      toolsKicker: 'Herramientas esenciales',
      toolsTitle: 'Lo que el organizador necesita en un solo lugar.',
      visualKicker: 'Visual fuerte',
      visualTitle: 'Una experiencia que parece un campeonato grande desde el primer clic.',
      methodKicker: 'Método Genesis',
      methodTitle: 'Del registro al resultado final, cada etapa tiene dueño.',
      methodDesc: 'El flujo fue diseñado para reducir el retrabajo y dejar a la organización libre para cuidar lo que importa: público, atletas, profesores y patrocinadores.',
      partnersKicker: 'Organizadores asociados',
      partnersTitle: 'Quien opera con más claridad, vende mejor la próxima edición.',
      filmmakerKicker: 'Filmmaker y foto',
      filmmakerTitle: 'Convierte tu campeonato en contenido para vender la próxima edición.',
      filmmakerDesc: 'Cobertura cinematográfica, fotos de podio, backstage y material de divulgación para darle peso visual a tu organización.',
      filmmakerReq: 'Solicitar cobertura',
      filmmakerPort: 'Ver portafolio',
      ctaKicker: 'Listo para publicar',
      ctaTitle: 'Vamos a armar una página de campeonato que los atletas realmente entiendan.',
      ctaDesc: 'Cuenta con Genesis para dejar inscripciones, alojamiento, ubicación, pesaje, llaves, horarios y resultados en el mismo entorno.',
      ctaBtn: 'Empezar ahora',
      m1Label: 'Flujo digital desde la inscripción al podio',
      m2Label: 'Mejor lectura para mesa, árbitros y público',
      m3Label: 'Evento listo para operar y divulgar',
      mod1Title: 'Inscripciones y lotes',
      mod1Text: 'Vende por lote, rastrea pagos y mantén a los atletas siempre en el flujo correcto.',
      mod2Title: 'Llaves inteligentes',
      mod2Text: 'Arma categorías, genera enfrentamientos y ajusta la operación sin depender de hojas sueltas.',
      mod3Title: 'Notificaciones para atletas',
      mod3Text: 'Avisos de llaves y horarios directos al atleta, manteniendo a todos informados y sin retrasos en el área de lucha.',
      mod4Title: 'Mesa y marcador',
      mod4Text: 'Control de lucha, puntuación y llamadas con una experiencia hecha para un campeonato real.',
      mod5Title: 'Check-in y credenciales',
      mod5Text: 'Código QR, estado del atleta y lectura rápida para reducir filas y errores de comunicación.',
      mod6Title: 'Genesis arma todo',
      mod6Text: 'Nosotros configuramos todo tu campeonato: lotes, categorías, tarifas y reglas. Tú solo te enfocas en promover y lucrar.',
      mod7Title: 'Resultados oficiales',
      mod7Text: 'Podio, ranking e historial salen del evento luciendo profesionales y con datos confiables.',
      mod8Title: 'Comunicación del evento',
      mod8Text: 'Página pública, avisos y materiales para convertir interés en inscripciones.',
      show1Title: 'Vista de la mesa',
      show1Text: 'Horario, llamadas y categorías se organizan para que el equipo trabaje sin improvisar.',
      show2Title: 'Experiencia de arena',
      show2Text: 'Marcador, panel y resultado final crean una lectura limpia para atletas, profesores y fans.',
      show3Title: 'Imagen de campeonato grande',
      show3Text: 'Fotos, video y página pública ayudan a tu organización a vender mejor la próxima edición.',
      work1Title: 'Armamos el evento por ti',
      work1Text: 'Nos das la información y nos encargamos de configurar lotes, categorías, tarifas, imágenes y reglas públicas.',
      work2Title: 'Publicamos para atletas',
      work2Text: 'Página del campeonato lista para inscripción, información, pesaje, ubicación y avisos, con notificaciones de llaves.',
      work3Title: 'Operamos en el día',
      work3Text: 'Mesa, llaves, marcador, llamadas y resultados trabajando en el mismo entorno.',
      work4Title: 'Entregamos el post-evento',
      work4Text: 'Ranking, podio, informes y contenido para fortalecer la marca del organizador.',
      test1Quote: 'Genesis organizó el caos de la mesa. El evento ganó lectura, ritmo y mucha más confianza para todo el equipo.',
      test1Role: 'Organización oficial',
      test2Quote: 'Marcador, horario y llaves hablando en el mismo flujo cambiaron nuestro nivel de operación.',
      test2Role: 'Equipo técnico',
      test3Quote: 'El ranking automático y los resultados oficiales le dieron cara de campeonato grande a nuestro evento.',
      test3Role: 'Dirección de evento',
      test4Quote: 'Hoy ya no dependemos del papel y la improvisación. Todo el flujo está en la plataforma.',
      test4Role: 'Coordinación general',
      schedClear: 'Horario claro',
      schedClearDesc: 'Orden de luchas, áreas y horarios en una lectura simple.',
      athletesOrg: 'Atletas organizados',
      athletesOrgDesc: 'Datos, categorías, estado e inscripciones siempre conectados.',
      revenueTrack: 'Ingresos rastreados',
      revenueTrackDesc: 'Valores, lotes e informes para decidir con más seguridad.',
      whatsappMessage: 'Hola, quiero organizar un campeonato con Genesis Sports.',
      whatsappFilmmaker: 'Hola, quiero solicitar cobertura cinematográfica de Genesis Filmmaker para mi evento.'
    },
    fr: {
      kicker: 'Genesis pour les organisateurs',
      title: 'Votre championnat avec une structure d\'arène, un bureau numérique et une livraison professionnelle.',
      desc: 'Une page complète pour vendre des inscriptions, organiser des athlètes, contrôler les tableaux, publier des horaires et fournir des résultats comme un grand événement.',
      specialistBtn: 'Parler à un spécialiste',
      createBtn: 'Créer un événement',
      opComplete: 'Opération complète',
      opCompleteTitle: 'Moins d\'improvisation au bureau. Plus de contrôle avant, pendant et après l\'événement.',
      opCompleteDesc: 'Genesis réunit l\'inscription, la communication, les tableaux, le tableau d\'affichage, le classement et le contenu dans une expérience unique pour l\'organisation. L\'athlète trouve tout dans le championnat public et l\'équipe travaille avec des informations centralisées.',
      toolsKicker: 'Outils essentiels',
      toolsTitle: 'Ce dont l\'organisateur a besoin au même endroit.',
      visualKicker: 'Visuel fort',
      visualTitle: 'Une expérience qui ressemble à un grand championnat dès le premier clic.',
      methodKicker: 'Méthode Genesis',
      methodTitle: 'De l\'inscription au résultat final, chaque étape a un propriétaire.',
      methodDesc: 'Le flux a été conçu pour réduire les retouches et laisser l\'organisation libre de s\'occuper de ce qui compte: public, athlètes, professeurs et sponsors.',
      partnersKicker: 'Organisateurs partenaires',
      partnersTitle: 'Ceux qui opèrent avec plus de clarté vendent mieux la prochaine édition.',
      filmmakerKicker: 'Filmmaker et photo',
      filmmakerTitle: 'Transformez votre championnat en contenu pour vendre la prochaine édition.',
      filmmakerDesc: 'Couverture cinématographique, photos de podium, coulisses et matériel promotionnel pour donner un poids visuel à votre organisation.',
      filmmakerReq: 'Demander une couverture',
      filmmakerPort: 'Voir le portfolio',
      ctaKicker: 'Prêt à publier',
      ctaTitle: 'Construisons une page de championnat que les athlètes comprennent vraiment.',
      ctaDesc: 'Comptez sur Genesis pour garder les inscriptions, l\'hébergement, l\'emplacement, la pesée, les tableaux, les horaires et les résultats dans le même environnement.',
      ctaBtn: 'Commencer maintenant',
      m1Label: 'Flux numérique de l\'inscription au podium',
      m2Label: 'Meilleure lecture pour le bureau, les arbitres et le public',
      m3Label: 'Événement prêt à fonctionner et à promouvoir',
      mod1Title: 'Inscriptions et lots',
      mod1Text: 'Vendez par lot, suivez les paiements et gardez les athlètes toujours dans le bon flux.',
      mod2Title: 'Tableaux intelligents',
      mod2Text: 'Créez des catégories, générez des matchs et ajustez l\'opération sans dépendre de feuilles de calcul volantes.',
      mod3Title: 'Notifications pour les athlètes',
      mod3Text: 'Avis de tableaux et horaires directs à l\'athlète, tenant tout le monde informé et sans retards dans la zone de combat.',
      mod4Title: 'Bureau et tableau d\'affichage',
      mod4Text: 'Contrôle des combats, notation et appel avec une expérience faite pour un vrai championnat.',
      mod5Title: 'Enregistrement et identifiants',
      mod5Text: 'QR Code, statut de l\'athlète et lecture rapide pour réduire les files d\'attente et les erreurs de communication.',
      mod6Title: 'Genesis construit tout',
      mod6Text: 'Nous configurons tout votre championnat : lots, catégories, frais et règles. Vous vous concentrez uniquement sur la promotion et le profit.',
      mod7Title: 'Résultats officiels',
      mod7Text: 'Le podium, le classement et l\'historique quittent l\'événement avec un aspect professionnel et des données fiables.',
      mod8Title: 'Communication de l\'événement',
      mod8Text: 'Page publique, avis et matériels pour transformer l\'intérêt en inscriptions.',
      show1Title: 'Vue du bureau',
      show1Text: 'L\'horaire, les appels et les catégories sont organisés pour que l\'équipe travaille sans improvisation.',
      show2Title: 'Expérience d\'arène',
      show2Text: 'Le tableau d\'affichage, le panneau et le résultat final créent une lecture claire pour les athlètes, les professeurs et les fans.',
      show3Title: 'Image de grand championnat',
      show3Text: 'Des photos, des vidéos et une page publique aident votre organisation à mieux vendre la prochaine édition.',
      work1Title: 'Nous préparons l\'événement pour vous',
      work1Text: 'Vous nous donnez les informations et nous nous occupons de configurer les lots, les catégories, les frais, les images et les règles publiques.',
      work2Title: 'Nous publions pour les athlètes',
      work2Text: 'Page de championnat prête pour l\'inscription, informations, pesée, emplacement et avis, avec notifications de tableaux.',
      work3Title: 'Nous opérons le jour J',
      work3Text: 'Bureau, tableaux, tableau d\'affichage, appels et résultats fonctionnant dans le même environnement.',
      work4Title: 'Nous livrons l\'après-événement',
      work4Text: 'Classement, podium, rapports et contenu pour renforcer la marque de l\'organisateur.',
      test1Quote: 'Genesis a organisé le chaos du bureau. L\'événement a gagné en lecture, en rythme et en beaucoup plus de confiance pour toute l\'équipe.',
      test1Role: 'Organisation officielle',
      test2Quote: 'Le tableau d\'affichage, l\'horaire et les tableaux qui se parlent dans le même flux ont changé notre niveau de fonctionnement.',
      test2Role: 'Équipe technique',
      test3Quote: 'Le classement automatique et les résultats officiels ont donné un visage de grand championnat à notre événement.',
      test3Role: 'Direction d\'événement',
      test4Quote: 'Aujourd\'hui, nous ne dépendons plus du papier et de l\'improvisation. Tout le flux est sur la plateforme.',
      test4Role: 'Coordination générale',
      schedClear: 'Horaire clair',
      schedClearDesc: 'Ordre des combats, zones et horaires dans une lecture simple.',
      athletesOrg: 'Athlètes organisés',
      athletesOrgDesc: 'Données, catégories, statut et inscriptions toujours connectés.',
      revenueTrack: 'Revenus suivis',
      revenueTrackDesc: 'Valeurs, lots et rapports pour décider avec plus de certitude.',
      whatsappMessage: 'Bonjour, je souhaite organiser un championnat avec Genesis Sports.',
      whatsappFilmmaker: 'Bonjour, je souhaite demander une couverture cinématographique de Genesis Filmmaker pour mon événement.'
    }
  };
  const copy = copyByLanguage[uiVariant] || copyByLanguage.pt;

  const whatsappLink = `https://api.whatsapp.com/send?phone=${CONTACT_PHONE}&text=${encodeURIComponent(copy.whatsappMessage)}`;
  const filmmakerWhatsappLink = buildFilmmakerWhatsappLink(
    copy.whatsappFilmmaker
  );

  return (
    <main className="public-page organizers-pro-page">
      <section className="organizers-pro-hero">
        <img className="organizers-pro-hero__image" src={organizersHero} alt="" aria-hidden="true" />
        <div className="organizers-pro-hero__shade" aria-hidden="true" />
        <div className="organizers-pro-hero__content">
          <span className="organizers-pro-kicker">{copy.kicker}</span>
          <h1>{copy.title}</h1>
          <p>
            {copy.desc}
          </p>
          <div className="organizers-pro-hero__actions">
            <a className="organizers-pro-button organizers-pro-button--primary" href={whatsappLink} target="_blank" rel="noreferrer">
              <Zap size={18} />
              Falar com especialista
            </a>
            <Link className="organizers-pro-button organizers-pro-button--secondary" to="/admin/eventos/novo">
              Criar evento
              <ArrowRight size={18} />
            </Link>
          </div>
        </div>
        <div className="organizers-pro-metrics" aria-label="Resumo da operação">
          {metrics.map((item, index) => (
            <div className="organizers-pro-metric" key={item.label}>
              <strong>{item.value}</strong>
              <span>{copy['m' + (index + 1) + 'Label'] || item.label}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="organizers-pro-section organizers-pro-section--intro">
        <div className="organizers-pro-copy">
          <span className="organizers-pro-kicker">{copy.opComplete}</span>
          <h2>{copy.opCompleteTitle}</h2>
          <p>
            {copy.opCompleteDesc}
          </p>
        </div>
        <div className="organizers-pro-stack">
          <div>
            <CalendarDays size={22} />
            <strong>{copy.schedClear}</strong>
            <span>{copy.schedClearDesc}</span>
          </div>
          <div>
            <Users size={22} />
            <strong>{copy.athletesOrg}</strong>
            <span>{copy.athletesOrgDesc}</span>
          </div>
          <div>
            <Wallet size={22} />
            <strong>{copy.revenueTrack}</strong>
            <span>{copy.revenueTrackDesc}</span>
          </div>
        </div>
      </section>

      <section className="organizers-pro-section">
        <header className="organizers-pro-section__head">
          <span className="organizers-pro-kicker">{copy.toolsKicker}</span>
          <h2>{copy.toolsTitle}</h2>
        </header>
        <div className="organizers-pro-modules">
          {modules.map(({ title, text, icon: Icon }, index) => (
            <article className="organizers-pro-module" key={title}>
              <span className="organizers-pro-module__icon"><Icon size={22} /></span>
              <h3>{copy['mod' + (index + 1) + 'Title'] || title}</h3>
              <p>{copy['mod' + (index + 1) + 'Text'] || text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="organizers-pro-section organizers-pro-section--showcase">
        <header className="organizers-pro-section__head">
          <span className="organizers-pro-kicker">{copy.visualKicker}</span>
          <h2>{copy.visualTitle}</h2>
        </header>
        <div className="organizers-pro-showcase">
          {showcases.map(({ title, text, image, icon: Icon }, index) => (
            <article className="organizers-pro-showcase-card" key={title}>
              <img src={image} alt={title} loading="lazy" />
              <div>
                <span><Icon size={18} /></span>
                <h3>{copy['show' + (index + 1) + 'Title'] || title}</h3>
                <p>{copy['show' + (index + 1) + 'Text'] || text}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="organizers-pro-section organizers-pro-flow-section">
        <div className="organizers-pro-section__head organizers-pro-section__head--split">
          <div>
            <span className="organizers-pro-kicker">{copy.methodKicker}</span>
            <h2>{copy.methodTitle}</h2>
          </div>
          <p>
            {copy.methodDesc}
          </p>
        </div>
        <div className="organizers-pro-flow">
          {workflow.map((item, index) => (
            <article className="organizers-pro-flow-card" key={item.step}>
              <span>{item.step}</span>
              <h3>{copy['work' + (index + 1) + 'Title'] || item.title}</h3>
              <p>{copy['work' + (index + 1) + 'Text'] || item.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="organizers-pro-proof">
        <div className="organizers-pro-proof__media">
          <img src={filmmakerVenue} alt="Equipe trabalhando em evento de jiu-jitsu" loading="lazy" />
        </div>
        <div className="organizers-pro-proof__content">
          <span className="organizers-pro-kicker">{copy.partnersKicker}</span>
          <h2>{copy.partnersTitle}</h2>
          <div className="organizers-pro-testimonials">
            {testimonials.map((item, index) => (
              <article className="organizers-pro-testimonial" key={item.author}>
                <div>
                  <img src={item.image} alt={item.author} loading="lazy" />
                  <span>
                    <strong>{item.author}</strong>
                    <small>{copy['test' + (index + 1) + 'Role'] || item.role}</small>
                  </span>
                </div>
                <p>{copy['test' + (index + 1) + 'Quote'] || item.quote}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="organizers-pro-filmmaker">
        <img src={filmmakerPhotographer} alt="" aria-hidden="true" />
        <div>
          <span className="organizers-pro-kicker">{copy.filmmakerKicker}</span>
          <h2>{copy.filmmakerTitle}</h2>
          <p>
            {copy.filmmakerDesc}
          </p>
          <div className="organizers-pro-hero__actions">
            <a className="organizers-pro-button organizers-pro-button--primary" href={filmmakerWhatsappLink} target="_blank" rel="noreferrer">
              Solicitar cobertura
            </a>
            <a className="organizers-pro-button organizers-pro-button--secondary" href={FILMMAKER_INSTAGRAM_URL} target="_blank" rel="noreferrer">
              Ver portfólio
              <ArrowRight size={18} />
            </a>
          </div>
        </div>
      </section>

      <section className="organizers-pro-cta">
        <span className="organizers-pro-kicker">{copy.ctaKicker}</span>
        <h2>{copy.ctaTitle}</h2>
        <p>
          {copy.ctaDesc}
        </p>
        <a className="organizers-pro-button organizers-pro-button--primary" href={whatsappLink} target="_blank" rel="noreferrer">
          Começar agora
          <ArrowRight size={18} />
        </a>
      </section>
    </main>
  );
};

export default Organizers;
