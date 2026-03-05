# Plataforma de Telemedicina Inteira - TODO

## Backend - Base de Datos y APIs
- [x] Esquema de base de datos (11 tablas: users, professionals, specialties, plans, subscriptions, availability, appointments, reviews, documents, emailLogs, payments)
- [x] Autenticación con 3 roles: usuario, profesional, admin
- [x] APIs de usuarios (perfil, suscripción, citas)
- [x] APIs de profesionales (registro, perfil, disponibilidad, citas, aprobación)
- [x] APIs de especialidades (listar, crear)
- [x] APIs de planes de suscripción (listar, crear)
- [x] Sistema de disponibilidad con validación de 4 horas de anticipación
- [x] Router de citas (scheduleAppointment, cancelAppointment, completeAppointment, getAvailableSlots)
- [x] Router de admin (aprobar/rechazar profesionales, gestionar especialidades y planes)
- [x] Datos iniciales: 6 especialidades, 3 planes de suscripción

## Integraciones Backend
- [x] Videollamadas Zoom/Google Meet (generación de links - modo simulado)
- [x] Sistema de emails automáticos (confirmación, recordatorio 24h, 1h - logueados en consola)
- [ ] Stripe: checkout de suscripciones (pendiente de claves del usuario)
- [ ] Stripe: webhooks para activar/cancelar suscripciones
- [ ] Zoom API real (requiere credenciales Zoom OAuth)
- [ ] Google Meet API real (requiere credenciales Google OAuth)
- [ ] Email SMTP real (requiere proveedor: SendGrid, Mailgun, etc.)

## Frontend - Landing Page
- [x] Navbar con logo inteira y navegación
- [x] Hero section con CTA y estadísticas
- [x] Sección de especialidades (carrusel)
- [x] Sección de planes de suscripción
- [x] Sección de cómo funciona
- [x] Footer

## Frontend - Autenticación
- [x] Botón de login/registro (OAuth)
- [x] Registro de profesional (formulario completo)
- [x] Pantalla de confirmación de solicitud enviada

## Frontend - Usuario
- [x] Dashboard del usuario con estadísticas
- [x] Catálogo de especialidades
- [x] Lista de profesionales por especialidad
- [x] Perfil detallado del profesional con reseñas
- [x] Flujo de agendamiento con calendario interactivo
- [x] Selector de hora disponible (slots de 60 min)
- [x] Selección de plataforma de videollamada (Zoom/Meet)
- [x] Confirmación de cita con resumen
- [x] Historial de citas
- [ ] Gestión de suscripción con Stripe (pendiente)

## Frontend - Profesional
- [x] Dashboard del profesional con estadísticas
- [x] Gestión de perfil
- [x] Configuración de disponibilidad (días y horarios)
- [x] Lista de citas agendadas (próximas e historial)
- [x] Marcar cita como completada
- [x] Botón para unirse a videollamada
- [ ] Subida de documentos/certificados (pendiente UI de S3)

## Frontend - Administración
- [x] Dashboard de administración con métricas
- [x] Lista de profesionales pendientes de aprobación
- [x] Aprobar/rechazar profesional con motivo
- [x] Gestión de especialidades (listar y crear)
- [x] Gestión de planes de suscripción (listar y crear)

## Estilos Visuales
- [x] Paleta de colores inteira.mx (morado #7C3AED, azul #2563EB, naranja #F97316)
- [x] Tipografía Poppins + Inter
- [x] Gradientes de marca (gradient-brand, gradient-hero)
- [x] Componentes UI consistentes (shadcn/ui)
- [x] Diseño responsivo móvil/desktop
- [x] Animaciones y micro-interacciones

## Optimización para 300+ usuarios
- [x] Connection pooling con mysql2
- [x] TiDB Cloud como base de datos (escala horizontalmente)
- [x] React Query para caché inteligente del lado cliente
- [x] Code splitting automático con Vite
- [x] Lazy loading de componentes

## Pruebas
- [x] Tests unitarios de appointment-utils (16 tests)
- [x] Tests de auth.logout (1 test)
- [x] Total: 17/17 tests pasando

## Pendiente (requiere configuración externa)
- [ ] Stripe: compartir planes y claves API (sk_test_... y pk_test_...)
- [ ] Zoom: credenciales de API para links reales de reunión
- [ ] Google Meet: credenciales OAuth para links reales
- [ ] Email SMTP: proveedor de email para envíos reales
