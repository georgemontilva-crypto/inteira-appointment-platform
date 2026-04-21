export const APP_VERSION = '1.3.0';

export const CHANGELOG = [
  {
    version: '1.3.0',
    date: '2026-04-20',
    changes: [
      'App de escritorio para Windows y Mac (Electron)',
      'Pantalla de bienvenida personalizada en la app de escritorio',
      'Sistema de banners de eventos gestionable desde el admin',
      'Rediseño de sección de planes con alineación mejorada',
      'Botones de planes redirigen a registro si no hay sesión activa',
      'Upload de archivos permitido en registro de especialistas sin cuenta previa',
      'Registro de especialistas sin necesidad de cuenta previa',
      'Pantalla de selección de tipo de cuenta al registrarse',
      'Nuevo logo y branding en emails y páginas de autenticación',
    ]
  },
  {
    version: '1.2.0',
    date: '2026-04-16',
    changes: [
      'Nuevo sistema de registro con selección de tipo de cuenta',
      'Carrusel de especialidades con imágenes en la landing',
      'Códigos de descuento y tarjetas prepago',
      'Precios especiales para usuarios con membresía activa',
      'Mejoras de seguridad en flujo de créditos',
      'Rediseño del panel del profesional con tabs y métricas',
      'Sistema de retiros con comprobante adjunto por email',
      'Gestión de especialidades con íconos desde el admin',
    ]
  },
  {
    version: '1.1.0',
    date: '2026-04-13',
    changes: [
      'Auditoría completa de seguridad — SQL injection, logs sensibles, transacciones atómicas',
      'Fix crítico: sesiones premium pagaban igual que básicas al profesional',
      'Endpoint de rechazo de retiro con email al profesional',
      'Notificación de rechazo con motivo al profesional revocado',
      'Agrupación de profesionales por especialidad en el admin',
      'Filtros de búsqueda en especialidades',
    ]
  },
  {
    version: '1.0.0',
    date: '2026-04-08',
    changes: [
      'Lanzamiento inicial de Inteira',
      'Sistema de citas con videollamada integrada (Daily.co)',
      'Wallet de créditos con pagos Stripe',
      'Panel de administración completo',
      'Autenticación Google OAuth y Email OTP',
      'Panel del profesional con disponibilidad y ganancias',
    ]
  },
];
