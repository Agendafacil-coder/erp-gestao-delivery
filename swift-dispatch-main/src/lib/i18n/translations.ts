export type TranslationSchema = {
  common: {
    realtime: string;
    loading: string;
    active: string;
    offline: string;
    save: string;
    close: string;
    logout: string;
    activeShift: string;
    operator: string;
    searchPlaceholder: string;
    allClear: string;
    urgent: string;
    soon: string;
  };
  nav: {
    central: string;
    kanban: string;
    mapa: string;
    pedidos: string;
    entregadores: string;
    iaOps: string;
    whatsapp: string;
    analytics: string;
    financeiro: string;
    configs: string;
  };
  central: {
    title: string;
    highlight: string;
    subtitle: string;
    scanBtn: string;
    dispatchBtn: string;
    calculating: string;
    iaActive: string;
    activeOrders: string;
    onlineDrivers: string;
    avgEta: string;
    delayRate: string;
    delayedNow: string;
    billing: string;
    criticalAlerts: string;
    ordersInProgress: string;
    billingHour: string;
    highRisk: string;
    underControl: string;
  };
  kanban: {
    title: string;
    highlight: string;
    subtitle: string;
    columns: {
      novo: string;
      em_preparo: string;
      pronto: string;
      aguardando_entregador: string;
      em_rota_coleta: string;
      retirado: string;
      em_rota_entrega: string;
      entregue: string;
      cancelado: string;
    };
    empty: string;
    itemsCount: string;
    elapsed: string;
  };
  map: {
    title: string;
    highlight: string;
    subtitle: string;
    activeDrivers: string;
    etaCongestion: string;
    efficiency: string;
    modeDark: string;
    modeLight: string;
    switchToken: string;
    mapboxGateTitle: string;
    mapboxGateSub: string;
    mapboxGateStep1: string;
    mapboxGateStep2: string;
    mapboxGateStep3: string;
    mapboxGateBtn: string;
  };
  scanner: {
    title: string;
    subtitle: string;
    physicalScanner: string;
    cameraScanner: string;
    readyScan: string;
    helperText: string;
    manualPlaceholder: string;
    quickSimulate: string;
    scanComplete: string;
    emptyOrders: string;
  };
  alerts: {
    title: string;
    subtitle: string;
    kitchenBottleneck: string;
    driverIdle: string;
    regionCongested: string;
    reoptimizedRoute: string;
    highDemand: string;
    allClearDesc: string;
    actionRequired: string;
    iaOpsActive: string;
    showIa: string;
  };
};

export const translations: Record<"pt-BR" | "en" | "es", TranslationSchema> = {
  "pt-BR": {
    common: {
      realtime: "Realtime",
      loading: "Carregando...",
      active: "Ativo",
      offline: "Offline",
      save: "Salvar",
      close: "Fechar",
      logout: "Sair",
      activeShift: "Operação ativa",
      operator: "Operador",
      searchPlaceholder: "Buscar pedido, cliente ou entregador…",
      allClear: "Tudo sob controle",
      urgent: "Ação imediata",
      soon: "breve",
    },
    nav: {
      central: "Central",
      kanban: "Kanban",
      mapa: "Mapa Live",
      pedidos: "Pedidos",
      entregadores: "Entregadores",
      iaOps: "IA Logística",
      whatsapp: "WhatsApp Hub",
      analytics: "Analytics",
      financeiro: "Financeiro",
      configs: "Configurações",
    },
    central: {
      title: "Central",
      highlight: "Operacional",
      subtitle: "Torre de Controle",
      scanBtn: "Escanear Etiqueta",
      dispatchBtn: "Despacho auto ✦",
      calculating: "Calculando rotas...",
      iaActive: "IA Operacional ativa",
      activeOrders: "Pedidos ativos",
      onlineDrivers: "Entregadores online",
      avgEta: "ETA médio",
      delayRate: "Taxa de atraso",
      delayedNow: "Atrasados agora",
      billing: "Faturamento turno",
      criticalAlerts: "Alertas críticos",
      ordersInProgress: "Pedidos em andamento",
      billingHour: "Faturamento por hora",
      highRisk: "Risco alto",
      underControl: "Sob controle",
    },
    kanban: {
      title: "Kanban",
      highlight: "de pedidos",
      subtitle: "Pipeline operacional",
      columns: {
        novo: "Novo",
        em_preparo: "Em preparo",
        pronto: "Pronto",
        aguardando_entregador: "Aguardando entregador",
        em_rota_coleta: "Rota coleta",
        retirado: "Retirado",
        em_rota_entrega: "Rota entrega",
        entregue: "Entregue",
        cancelado: "Cancelado",
      },
      empty: "vazio",
      itemsCount: "itens",
      elapsed: "decorrido",
    },
    map: {
      title: "Mapa",
      highlight: "Operacional",
      subtitle: "Geolocalização Live",
      activeDrivers: "entregadores",
      etaCongestion: "ETA estimado",
      efficiency: "Eficiência logística",
      modeDark: "Modo dark",
      modeLight: "Modo claro",
      switchToken: "Trocar token",
      mapboxGateTitle: "Conectar Mapbox",
      mapboxGateSub: "Cole seu public token para ativar o mapa live",
      mapboxGateStep1: "Acesse mapbox.com/access-tokens",
      mapboxGateStep2: "Copie seu Default public token (começa com pk.)",
      mapboxGateStep3: "Cole abaixo — fica salvo apenas neste navegador",
      mapboxGateBtn: "Ativar Mapa Live",
    },
    scanner: {
      title: "Central de Leitura",
      subtitle: "Leitor de Etiquetas Realtime",
      physicalScanner: "Leitor Físico / Teclado",
      cameraScanner: "Câmera Web (Virtual)",
      readyScan: "Pronto para leitura",
      helperText: "Aponte o leitor de código de barras ou digite o código do pedido (#4821) e pressione Enter.",
      manualPlaceholder: "Digitar código manualmente (ex: #4820)...",
      quickSimulate: "Simular Leitura (Clique rápido para ler)",
      scanComplete: "Leitura Efetuada",
      emptyOrders: "Nenhum pedido ativo para ser escaneado.",
    },
    alerts: {
      title: "Alertas Operacionais",
      subtitle: "tempo real",
      kitchenBottleneck: "Gargalo de Produção na Cozinha",
      driverIdle: "Entregador Ocioso",
      regionCongested: "Região Itaim congestionada",
      reoptimizedRoute: "Rota reotimizada",
      highDemand: "Pico de pedidos previsto",
      allClearDesc: "Nenhum atraso crítico ou gargalo detectado na operação.",
      actionRequired: "Ação imediata requerida",
      iaOpsActive: "IA operacional ativa",
      showIa: "Ver inteligência ↗",
    },
  },
  en: {
    common: {
      realtime: "Real-time",
      loading: "Loading...",
      active: "Active",
      offline: "Offline",
      save: "Save",
      close: "Close",
      logout: "Logout",
      activeShift: "Active operation",
      operator: "Operator",
      searchPlaceholder: "Search order, customer or driver…",
      allClear: "All under control",
      urgent: "Immediate action",
      soon: "soon",
    },
    nav: {
      central: "Dashboard",
      kanban: "Kanban",
      mapa: "Live Map",
      pedidos: "Orders",
      entregadores: "Drivers",
      iaOps: "AI Logistics",
      whatsapp: "WhatsApp Hub",
      analytics: "Analytics",
      financeiro: "Financial",
      configs: "Settings",
    },
    central: {
      title: "Operations",
      highlight: "Center",
      subtitle: "Control Tower",
      scanBtn: "Scan Ticket",
      dispatchBtn: "Auto Dispatch ✦",
      calculating: "Calculating routes...",
      iaActive: "Operational AI Active",
      activeOrders: "Active orders",
      onlineDrivers: "Online drivers",
      avgEta: "Average ETA",
      delayRate: "Delay rate",
      delayedNow: "Delayed now",
      billing: "Shift billing",
      criticalAlerts: "Critical alerts",
      ordersInProgress: "Orders in progress",
      billingHour: "Revenue per hour",
      highRisk: "High risk",
      underControl: "Under control",
    },
    kanban: {
      title: "Kanban",
      highlight: "Board",
      subtitle: "Operational Pipeline",
      columns: {
        novo: "New",
        em_preparo: "In preparation",
        pronto: "Ready",
        aguardando_entregador: "Awaiting driver",
        em_rota_coleta: "Route pickup",
        retirado: "Picked up",
        em_rota_entrega: "Route delivery",
        entregue: "Delivered",
        cancelado: "Canceled",
      },
      empty: "empty",
      itemsCount: "items",
      elapsed: "elapsed",
    },
    map: {
      title: "Live",
      highlight: "Map",
      subtitle: "Live Geolocation",
      activeDrivers: "drivers",
      etaCongestion: "estimated ETA",
      efficiency: "Logistical efficiency",
      modeDark: "Dark mode",
      modeLight: "Light mode",
      switchToken: "Change token",
      mapboxGateTitle: "Connect Mapbox",
      mapboxGateSub: "Paste your public token to activate the live map",
      mapboxGateStep1: "Visit mapbox.com/access-tokens",
      mapboxGateStep2: "Copy your Default public token (starts with pk.)",
      mapboxGateStep3: "Paste below — saved only in this browser",
      mapboxGateBtn: "Activate Live Map",
    },
    scanner: {
      title: "Scan Center",
      subtitle: "Realtime Ticket Scanner",
      physicalScanner: "Physical Barcode / Keyboard",
      cameraScanner: "Web Camera (Virtual)",
      readyScan: "Ready to scan",
      helperText: "Point barcode scanner or type order code (#4821) and press Enter.",
      manualPlaceholder: "Type code manually (e.g. #4820)...",
      quickSimulate: "Simulate Scan (Click row to read)",
      scanComplete: "Scan Success",
      emptyOrders: "No active orders to be scanned.",
    },
    alerts: {
      title: "Operational Alerts",
      subtitle: "real-time",
      kitchenBottleneck: "Production Kitchen Bottleneck",
      driverIdle: "Idle Driver",
      regionCongested: "Itaim Region congested",
      reoptimizedRoute: "Route reoptimized",
      highDemand: "Order peak predicted",
      allClearDesc: "No critical delays or bottlenecks detected in operation.",
      actionRequired: "Immediate action required",
      iaOpsActive: "Operational AI active",
      showIa: "View intelligence ↗",
    },
  },
  es: {
    common: {
      realtime: "Tiempo Real",
      loading: "Cargando...",
      active: "Activo",
      offline: "Offline",
      save: "Guardar",
      close: "Cerrar",
      logout: "Salir",
      activeShift: "Operación activa",
      operator: "Operador",
      searchPlaceholder: "Buscar pedido, cliente o conductor…",
      allClear: "Todo bajo control",
      urgent: "Acción inmediata",
      soon: "pronto",
    },
    nav: {
      central: "Central",
      kanban: "Kanban",
      mapa: "Mapa en Vivo",
      pedidos: "Pedidos",
      entregadores: "Repartidores",
      iaOps: "IA Logística",
      whatsapp: "WhatsApp Hub",
      analytics: "Analítica",
      financeiro: "Financiero",
      configs: "Configuración",
    },
    central: {
      title: "Central",
      highlight: "Operativa",
      subtitle: "Torre de Control",
      scanBtn: "Escanear Etiqueta",
      dispatchBtn: "Despacho auto ✦",
      calculating: "Calculando rutas...",
      iaActive: "IA Operativa Activa",
      activeOrders: "Pedidos activos",
      onlineDrivers: "Repartidores online",
      avgEta: "ETA medio",
      delayRate: "Tasa de retraso",
      delayedNow: "Retrasados ahora",
      billing: "Facturación turno",
      criticalAlerts: "Alertas críticas",
      ordersInProgress: "Pedidos en curso",
      billingHour: "Facturación por hora",
      highRisk: "Alto riesgo",
      underControl: "Bajo control",
    },
    kanban: {
      title: "Kanban",
      highlight: "de pedidos",
      subtitle: "Flujo operacional",
      columns: {
        novo: "Nuevo",
        em_preparo: "En preparación",
        pronto: "Listo",
        aguardando_entregador: "Esperando repartidor",
        em_rota_coleta: "Ruta recolección",
        retirado: "Retirado",
        em_rota_entrega: "Ruta entrega",
        entregue: "Entregado",
        cancelado: "Cancelado",
      },
      empty: "vacío",
      itemsCount: "artículos",
      elapsed: "transcurrido",
    },
    map: {
      title: "Mapa",
      highlight: "Operativo",
      subtitle: "Geolocalización Live",
      activeDrivers: "repartidores",
      etaCongestion: "ETA estimado",
      efficiency: "Eficiencia logística",
      modeDark: "Modo oscuro",
      modeLight: "Modo claro",
      switchToken: "Cambiar token",
      mapboxGateTitle: "Conectar Mapbox",
      mapboxGateSub: "Pegue su public token para activar el mapa en vivo",
      mapboxGateStep1: "Acceda a mapbox.com/access-tokens",
      mapboxGateStep2: "Copie su Default public token (comienza con pk.)",
      mapboxGateStep3: "Pegue abajo — se guarda solo en este navegador",
      mapboxGateBtn: "Activar Mapa en Vivo",
    },
    scanner: {
      title: "Centro de Lectura",
      subtitle: "Escáner de Etiquetas en Tiempo Real",
      physicalScanner: "Lector Físico / Teclado",
      cameraScanner: "Cámara Web (Virtual)",
      readyScan: "Listo para lectura",
      helperText: "Apunte el escáner de códigos o digite el código del pedido (#4821) y presione Enter.",
      manualPlaceholder: "Digitar código manualmente (ej: #4820)...",
      quickSimulate: "Simular Lectura (Click rápido para leer)",
      scanComplete: "Lectura Exitosa",
      emptyOrders: "Ningún pedido activo para escanear.",
    },
    alerts: {
      title: "Alertas Operacionales",
      subtitle: "tiempo real",
      kitchenBottleneck: "Cuello de Botella en Cocina",
      driverIdle: "Repartidor Ocioso",
      regionCongested: "Región Itaim congestionada",
      reoptimizedRoute: "Ruta reoptimizada",
      highDemand: "Pico de pedidos previsto",
      allClearDesc: "Ningún retraso crítico o cuello de botella detectado.",
      actionRequired: "Acción inmediata requerida",
      iaOpsActive: "IA operativa activa",
      showIa: "Ver inteligencia ↗",
    },
  },
};
