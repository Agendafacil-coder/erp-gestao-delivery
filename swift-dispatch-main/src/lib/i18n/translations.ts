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
  /** Rótulos do menu lateral — chaves alinhadas a NavKey em lib/roles.ts */
  nav: {
    central: string;
    kanban: string;
    mapa: string;
    kds: string;
    tracking: string;
    entregador: string;
    whatsapp: string;
    analytics: string;
    relatorios: string;
    financeiro: string;
    automacoes: string;
    auditoria: string;
    cardapio: string;
    clientes: string;
    configs: string;
    sistema: string;
    groupOperacao: string;
    groupGestao: string;
    groupSistema: string;
    sidebarTagline: string;
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
    dispatchReportTitle: string;
    dispatchReportSub: string;
    dispatchSavings: string;
    dispatchTimeSaved: string;
    dispatchKmSaved: string;
    dispatchRoutesTitle: string;
    dispatchOrdersAssigned: string;
    dispatchReportFooter: string;
    footerMapLink: string;
    footerKanbanLink: string;
    manualOrderBtn: string;
    manualOrderBtnHint: string;
    manualOrderTitle: string;
    manualOrderDesc: string;
    manualOrderCustomer: string;
    manualOrderPhone: string;
    manualOrderChannel: string;
    manualOrderAddress: string;
    manualOrderStreet: string;
    manualOrderNumber: string;
    manualOrderComplement: string;
    manualOrderNeighborhood: string;
    manualOrderAddressValidation: string;
    manualOrderMenu: string;
    manualOrderMenuSearch: string;
    manualOrderMenuNoResults: string;
    manualOrderMenuEmpty: string;
    manualOrderCart: string;
    manualOrderCartEmpty: string;
    manualOrderLineNotes: string;
    manualOrderOrderNotes: string;
    manualOrderTotal: string;
    manualOrderSubmit: string;
    manualOrderValidation: string;
    manualOrderNoItems: string;
    manualOrderSuccess: string;
  };
  kanban: {
    title: string;
    highlight: string;
    subtitle: string;
    columns: {
      novo: string;
      confirmado: string;
      em_preparo: string;
      pronto: string;
      aguardando_entregador: string;
      em_rota_entrega: string;
      entregue: string;
      cancelado: string;
    };
    /** Rótulos curtos nos cabeçalhos das colunas (cabe na tela sem scroll) */
    columnsShort: {
      novo: string;
      confirmado: string;
      em_preparo: string;
      pronto: string;
      aguardando_entregador: string;
      em_rota_entrega: string;
      entregue: string;
      cancelado: string;
    };
    empty: string;
    itemsCount: string;
    elapsed: string;
  };
  kds: {
    monitorLabel: string;
    title: string;
    highlight: string;
    subtitle: string;
    filterAll: string;
    filterToStart: string;
    filterInPrep: string;
    statCritical: string;
    statAvgPrep: string;
    statReadyToday: string;
    statCapacity: string;
    emptyTitle: string;
    emptyDesc: string;
    productsLabel: string;
    entryAt: string;
    elapsedMin: string;
    slaDelayed: string;
    slaRemaining: string;
    prepTimeLimit: string;
    prepTimeExpired: string;
    prepTimeRemainingPrefix: string;
    startPrep: string;
    markReady: string;
    reportIssue: string;
    pauseOrder: string;
    issueTitle: string;
    issueMissing: string;
    issueBurned: string;
    issueWrong: string;
    issueOverload: string;
    cancel: string;
    obsPrefix: string;
    noItems: string;
    itemsFallback: string;
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
    actionsTitle: string;
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
      central: "Painel ADM",
      kanban: "Fluxo de Pedidos",
      mapa: "Mapa ao vivo",
      kds: "Cozinha",
      tracking: "Rastreio",
      entregador: "Entregadores",
      whatsapp: "Whatsapp",
      analytics: "Indicadores",
      relatorios: "Relatórios",
      financeiro: "Gestão",
      automacoes: "Automações",
      auditoria: "Auditoria",
      cardapio: "Cardápio",
      clientes: "Clientes",
      configs: "Configurações",
      sistema: "Sistema",
      groupOperacao: "Operação",
      groupGestao: "Gestão",
      groupSistema: "Sistema",
      sidebarTagline: "Gestão de delivery",
    },
    central: {
      title: "Painel",
      highlight: "do negócio",
      subtitle: "Operação e financeiro em tempo real",
      scanBtn: "Escanear Etiqueta",
      dispatchBtn: "Despacho automático",
      calculating: "Calculando rotas...",
      dispatchReportTitle: "Resultado do despacho",
      dispatchReportSub: "Sugestões de alocação para o turno atual",
      dispatchSavings: "Economia",
      dispatchTimeSaved: "Tempo",
      dispatchKmSaved: "Distância",
      dispatchRoutesTitle: "Rotas sugeridas",
      dispatchOrdersAssigned: "pedidos alocados",
      dispatchReportFooter: "{pct}% dos pedidos abertos receberam sugestão de entregador.",
      footerMapLink: "Abrir mapa completo",
      footerKanbanLink: "Ir ao Kanban",
      manualOrderBtn: "Novo pedido",
      manualOrderBtnHint: "Balcão ou telefone",
      manualOrderTitle: "Novo pedido manual",
      manualOrderDesc: "Registre um pedido na operação sem integração externa.",
      manualOrderCustomer: "Cliente",
      manualOrderPhone: "Telefone (opcional)",
      manualOrderChannel: "Canal",
      manualOrderAddress: "Endereço de entrega",
      manualOrderStreet: "Rua",
      manualOrderNumber: "Número",
      manualOrderComplement: "Complemento (opcional)",
      manualOrderNeighborhood: "Bairro",
      manualOrderAddressValidation: "Informe rua, número e bairro.",
      manualOrderMenu: "Itens do cardápio",
      manualOrderMenuSearch: "Buscar item no cardápio…",
      manualOrderMenuNoResults: "Nenhum item encontrado para essa busca.",
      manualOrderMenuEmpty: "Nenhum produto disponível no cardápio.",
      manualOrderCart: "Pedido",
      manualOrderCartEmpty: "Adicione itens do cardápio acima.",
      manualOrderLineNotes: "Observações do item",
      manualOrderOrderNotes: "Observações do pedido (opcional)",
      manualOrderTotal: "Total",
      manualOrderSubmit: "Criar pedido",
      manualOrderValidation: "Informe o nome do cliente.",
      manualOrderNoItems: "Selecione ao menos um item do cardápio.",
      manualOrderSuccess: "Pedido criado",
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
        confirmado: "Confirmado",
        em_preparo: "Em preparo",
        pronto: "Pronto retirada/entrega",
        aguardando_entregador: "Aguardando entregador",
        em_rota_entrega: "Saiu para entrega",
        entregue: "Finalizado",
        cancelado: "Cancelado",
      },
      columnsShort: {
        novo: "Novo",
        confirmado: "Confirm.",
        em_preparo: "Preparo",
        pronto: "Pronto",
        aguardando_entregador: "Aguard. ent.",
        em_rota_entrega: "Em rota",
        entregue: "Finalizado",
        cancelado: "Cancel.",
      },
      empty: "vazio",
      itemsCount: "itens",
      elapsed: "decorrido",
    },
    kds: {
      monitorLabel: "Monitor cozinha · KDS",
      title: "Painel",
      highlight: "da cozinha",
      subtitle: "Fila de produção",
      filterAll: "Todos",
      filterToStart: "A iniciar",
      filterInPrep: "Em preparo",
      statCritical: "Críticos / atraso",
      statAvgPrep: "Tempo médio prep",
      statReadyToday: "Finalizados hoje",
      statCapacity: "Na fila agora",
      emptyTitle: "Nenhum pedido na fila",
      emptyDesc:
        "Excelente trabalho! Todos os pedidos ativos já foram preparados ou despachados para logística.",
      productsLabel: "Produtos do pedido",
      entryAt: "Entrada",
      elapsedMin: "decorrido",
      slaDelayed: "Atraso",
      slaRemaining: "restantes",
      prepTimeLimit: "Prazo de preparo",
      prepTimeExpired: "Tempo esgotado",
      prepTimeRemainingPrefix: "Faltam",
      startPrep: "Iniciar preparo",
      markReady: "Finalizar preparo",
      reportIssue: "Reportar problema",
      pauseOrder: "Pausar pedido",
      issueTitle: "Selecione o problema operacional:",
      issueMissing: "Falta insumo",
      issueBurned: "Prato queimado",
      issueWrong: "Erro na comanda",
      issueOverload: "Sobrecarga",
      cancel: "Cancelar",
      obsPrefix: "Obs:",
      noItems: "Sem itens detalhados",
      itemsFallback: "itens no pedido",
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
      quickSimulate: "Ler comanda (clique na lista)",
      scanComplete: "Leitura Efetuada",
      emptyOrders: "Nenhum pedido ativo para ser escaneado.",
    },
    alerts: {
      title: "Ações recomendadas",
      subtitle: "Prioridades do turno",
      actionsTitle: "Ações recomendadas",
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
      central: "Operations hub",
      kanban: "Order flow",
      mapa: "Live map",
      kds: "Kitchen",
      tracking: "Tracking",
      entregador: "Drivers",
      whatsapp: "WhatsApp",
      analytics: "Metrics",
      relatorios: "Reports",
      financeiro: "Management",
      automacoes: "Automations",
      auditoria: "Activity log",
      cardapio: "Menu",
      clientes: "Customers",
      configs: "Settings",
      sistema: "System",
      groupOperacao: "Operations",
      groupGestao: "Management",
      groupSistema: "System",
      sidebarTagline: "Delivery management",
    },
    central: {
      title: "Operations",
      highlight: "Center",
      subtitle: "Control Tower",
      scanBtn: "Scan Ticket",
      dispatchBtn: "Auto dispatch",
      calculating: "Calculating routes...",
      dispatchReportTitle: "Dispatch result",
      dispatchReportSub: "Allocation suggestions for the current shift",
      dispatchSavings: "Savings",
      dispatchTimeSaved: "Time",
      dispatchKmSaved: "Distance",
      dispatchRoutesTitle: "Suggested routes",
      dispatchOrdersAssigned: "orders allocated",
      dispatchReportFooter: "{pct}% of open orders received a driver suggestion.",
      footerMapLink: "Open full map",
      footerKanbanLink: "Go to Kanban",
      manualOrderBtn: "New order",
      manualOrderBtnHint: "Counter or phone",
      manualOrderTitle: "Manual new order",
      manualOrderDesc: "Register an order without an external integration.",
      manualOrderCustomer: "Customer",
      manualOrderPhone: "Phone (optional)",
      manualOrderChannel: "Channel",
      manualOrderAddress: "Delivery address",
      manualOrderStreet: "Street",
      manualOrderNumber: "Number",
      manualOrderComplement: "Complement (optional)",
      manualOrderNeighborhood: "Neighborhood",
      manualOrderAddressValidation: "Enter street, number, and neighborhood.",
      manualOrderMenu: "Menu items",
      manualOrderMenuSearch: "Search menu items…",
      manualOrderMenuNoResults: "No items match your search.",
      manualOrderMenuEmpty: "No products available on the menu.",
      manualOrderCart: "Order",
      manualOrderCartEmpty: "Add menu items above.",
      manualOrderLineNotes: "Item notes",
      manualOrderOrderNotes: "Order notes (optional)",
      manualOrderTotal: "Total",
      manualOrderSubmit: "Create order",
      manualOrderValidation: "Enter the customer name.",
      manualOrderNoItems: "Select at least one menu item.",
      manualOrderSuccess: "Order created",
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
        confirmado: "Confirmed",
        em_preparo: "In preparation",
        pronto: "Ready for pickup/delivery",
        aguardando_entregador: "Awaiting driver",
        em_rota_entrega: "Out for delivery",
        entregue: "Finalizado",
        cancelado: "Canceled",
      },
      columnsShort: {
        novo: "New",
        confirmado: "Confirm.",
        em_preparo: "Prep.",
        pronto: "Ready",
        aguardando_entregador: "Await driver",
        em_rota_entrega: "En route",
        entregue: "Finalizado",
        cancelado: "Canceled",
      },
      empty: "empty",
      itemsCount: "items",
      elapsed: "elapsed",
    },
    kds: {
      monitorLabel: "Kitchen monitor · KDS",
      title: "Kitchen",
      highlight: "display",
      subtitle: "Production queue",
      filterAll: "All",
      filterToStart: "To start",
      filterInPrep: "In preparation",
      statCritical: "Critical / delayed",
      statAvgPrep: "Avg prep time",
      statReadyToday: "Ready today",
      statCapacity: "In queue now",
      emptyTitle: "No orders in queue",
      emptyDesc:
        "Great work! All active orders have been prepared or dispatched to logistics.",
      productsLabel: "Order items",
      entryAt: "Received",
      elapsedMin: "elapsed",
      slaDelayed: "Late",
      slaRemaining: "left",
      prepTimeLimit: "Prep time limit",
      prepTimeExpired: "Time exceeded",
      prepTimeRemainingPrefix: "Remaining",
      startPrep: "Start kitchen prep",
      markReady: "Finish prep",
      reportIssue: "Report issue",
      pauseOrder: "Pause order",
      issueTitle: "Select the operational issue:",
      issueMissing: "Missing ingredient",
      issueBurned: "Burnt dish",
      issueWrong: "Ticket error",
      issueOverload: "Overload",
      cancel: "Cancel",
      obsPrefix: "Note:",
      noItems: "No detailed items",
      itemsFallback: "items in order",
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
      quickSimulate: "Read ticket (click list row)",
      scanComplete: "Scan Success",
      emptyOrders: "No active orders to be scanned.",
    },
    alerts: {
      title: "Recommended actions",
      subtitle: "Shift priorities",
      actionsTitle: "Recommended actions",
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
      central: "Panel operativo",
      kanban: "Flujo de pedidos",
      mapa: "Mapa en vivo",
      kds: "Cocina",
      tracking: "Seguimiento",
      entregador: "Repartidores",
      whatsapp: "WhatsApp",
      analytics: "Indicadores",
      relatorios: "Informes",
      financeiro: "Gestión",
      automacoes: "Automatizaciones",
      auditoria: "Historial",
      cardapio: "Menú",
      clientes: "Clientes",
      configs: "Configuración",
      sistema: "Sistema",
      groupOperacao: "Operación",
      groupGestao: "Gestión",
      groupSistema: "Sistema",
      sidebarTagline: "Gestión de delivery",
    },
    central: {
      title: "Central",
      highlight: "Operativa",
      subtitle: "Torre de Control",
      scanBtn: "Escanear Etiqueta",
      dispatchBtn: "Despacho automático",
      calculating: "Calculando rutas...",
      dispatchReportTitle: "Resultado del despacho",
      dispatchReportSub: "Sugerencias de asignación para el turno actual",
      dispatchSavings: "Ahorro",
      dispatchTimeSaved: "Tiempo",
      dispatchKmSaved: "Distancia",
      dispatchRoutesTitle: "Rutas sugeridas",
      dispatchOrdersAssigned: "pedidos asignados",
      dispatchReportFooter: "{pct}% de los pedidos abiertos recibieron sugerencia de repartidor.",
      footerMapLink: "Abrir mapa completo",
      footerKanbanLink: "Ir al Kanban",
      manualOrderBtn: "Nuevo pedido",
      manualOrderBtnHint: "Mostrador o teléfono",
      manualOrderTitle: "Nuevo pedido manual",
      manualOrderDesc: "Registre un pedido sin integración externa.",
      manualOrderCustomer: "Cliente",
      manualOrderPhone: "Teléfono (opcional)",
      manualOrderChannel: "Canal",
      manualOrderAddress: "Dirección de entrega",
      manualOrderStreet: "Calle",
      manualOrderNumber: "Número",
      manualOrderComplement: "Complemento (opcional)",
      manualOrderNeighborhood: "Barrio",
      manualOrderAddressValidation: "Indique calle, número y barrio.",
      manualOrderMenu: "Ítems del menú",
      manualOrderMenuSearch: "Buscar ítem en el menú…",
      manualOrderMenuNoResults: "Ningún ítem coincide con la búsqueda.",
      manualOrderMenuEmpty: "No hay productos disponibles en el menú.",
      manualOrderCart: "Pedido",
      manualOrderCartEmpty: "Agregue ítems del menú arriba.",
      manualOrderLineNotes: "Observaciones del ítem",
      manualOrderOrderNotes: "Observaciones del pedido (opcional)",
      manualOrderTotal: "Total",
      manualOrderSubmit: "Crear pedido",
      manualOrderValidation: "Indique el nombre del cliente.",
      manualOrderNoItems: "Seleccione al menos un ítem del menú.",
      manualOrderSuccess: "Pedido creado",
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
        confirmado: "Confirmado",
        em_preparo: "En preparación",
        pronto: "Listo retiro/entrega",
        aguardando_entregador: "Esperando repartidor",
        em_rota_entrega: "En camino",
        entregue: "Finalizado",
        cancelado: "Cancelado",
      },
      columnsShort: {
        novo: "Nuevo",
        confirmado: "Confirm.",
        em_preparo: "Preparo",
        pronto: "Listo",
        aguardando_entregador: "Esp. rep.",
        em_rota_entrega: "En ruta",
        entregue: "Finalizado",
        cancelado: "Cancel.",
      },
      empty: "vacío",
      itemsCount: "artículos",
      elapsed: "transcurrido",
    },
    kds: {
      monitorLabel: "Monitor cocina · KDS",
      title: "Panel",
      highlight: "de cocina",
      subtitle: "Fila de producción",
      filterAll: "Todos",
      filterToStart: "Por iniciar",
      filterInPrep: "En preparación",
      statCritical: "Críticos / retraso",
      statAvgPrep: "Tiempo medio prep",
      statReadyToday: "Listos hoy",
      statCapacity: "En cola ahora",
      emptyTitle: "Ningún pedido en cola",
      emptyDesc:
        "¡Excelente trabajo! Todos los pedidos activos ya fueron preparados o despachados a logística.",
      productsLabel: "Productos del pedido",
      entryAt: "Entrada",
      elapsedMin: "transcurrido",
      slaDelayed: "Retraso",
      slaRemaining: "restantes",
      prepTimeLimit: "Plazo de preparación",
      prepTimeExpired: "Tiempo agotado",
      prepTimeRemainingPrefix: "Faltan",
      startPrep: "Iniciar preparación cocina",
      markReady: "Finalizar preparación",
      reportIssue: "Reportar problema",
      pauseOrder: "Pausar pedido",
      issueTitle: "Seleccione el problema operativo:",
      issueMissing: "Falta insumo",
      issueBurned: "Plato quemado",
      issueWrong: "Error en comanda",
      issueOverload: "Sobrecarga",
      cancel: "Cancelar",
      obsPrefix: "Obs:",
      noItems: "Sin ítems detallados",
      itemsFallback: "ítems en el pedido",
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
      quickSimulate: "Leer comanda (clic en la lista)",
      scanComplete: "Lectura Exitosa",
      emptyOrders: "Ningún pedido activo para escanear.",
    },
    alerts: {
      title: "Acciones recomendadas",
      subtitle: "Prioridades del turno",
      actionsTitle: "Acciones recomendadas",
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
