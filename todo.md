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

## Cambio de Colores (Solicitud del usuario)
- [x] Aplicar paleta exacta de inteira.mx: verde salvia #607562 como primario
- [x] Verde claro #93A295 como acento/secundario
- [x] Fondo blanco #FFFFFF
- [x] Texto oscuro #333333
- [x] Texto gris #666666
- [x] Footer verde salvia #607562 con texto blanco
- [x] Botones e iconos en verde #607562
- [x] Tarjetas de especialidades con gradientes verdes de inteira.mx

## Actualización de Especialidades e Imágenes (Solicitud del usuario)
- [x] Actualizar BD: 7 categorías correctas (Psicología, Emprendimiento, Finanzas, Idiomas, Imagen Personal, Legal, Vocación)
- [x] Obtener imágenes de inteira.mx para cada categoría
- [x] Referenciar imágenes directamente desde inteira.mx en las tarjetas
- [x] Eliminar todos los emojis de la interfaz
- [x] Actualizar tarjetas de especialidades con imágenes reales de inteira.mx

## Bugs (Reportados por usuario)
- [x] user.getSubscription retorna undefined cuando no hay suscripción activa (corregido: retorna null)

## Rediseño de tarjetas de especialidades
- [x] Iconos minimalistas lucide-react en verde de la marca sobre fondo redondeado
- [x] Layout de tarjeta: icono izquierda + nombre/descripción derecha + "Ver profesionales" (página /especialidades)
- [x] Tarjetas pequeñas con icono centrado en Home.tsx
- [x] Corregir bug: user.getSubscription retorna null cuando no hay suscripción activa

## Portal del Profesional y Registro (Solicitud del usuario)
- [x] Analizar formulario inteira.mx/registro-de-asesor y replicar campos exactos
- [x] Actualizar RegisterProfessional.tsx con todos los campos del formulario original
- [x] Portal del profesional: vista de citas agendadas (próximas y pasadas)
- [x] Portal del profesional: gestión de calendario de atención (días disponibles)
- [x] Portal del profesional: configuración de horarios por día (horas de inicio/fin)
- [x] Portal del profesional: edición de perfil público (foto, bio, tarifas)
- [x] Sistema de calificaciones: sección de reseñas debajo del perfil del profesional
- [x] Sistema de calificaciones: formulario para que el usuario califique (1-5 estrellas + comentario)
- [x] Distribución de calificaciones con barras por estrella
- [x] Recomendaciones: ordenar profesionales por calificación promedio en la lista
- [x] Tests unitarios para sistema de calificaciones (24/24 pasando)

## Actualización de Planes (Definidos por el cliente)
- [ ] Actualizar BD: Plan Básico $980 MXN/mes (980 créditos, 60 días, todas las especialidades, soporte email)
- [ ] Actualizar BD: Plan Pro $2,500 MXN/mes (2500 créditos, 60 días, acceso prioritario, soporte 24/7, comunidad exclusiva)
- [ ] Agregar BD: Sesión Básica $350 MXN (compra individual, 1 sesión)
- [ ] Agregar BD: Sesión Premium $1,250 MXN (compra individual, 1 sesión premium)
- [ ] Actualizar sección de planes en landing page con precios y beneficios exactos
- [ ] Mostrar badge "Más popular" en Plan Pro
- [ ] Configurar restricciones de acceso según plan activo del usuario
- [ ] Mostrar créditos disponibles en el dashboard del usuario

## Logos Oficiales (Solicitud del usuario)
- [x] Subir logo blanco (sobre fondo verde) al CDN
- [x] Subir logo verde (sobre fondo blanco) al CDN
- [x] Aplicar logo verde en navbar principal (fondo blanco)
- [x] Aplicar logo blanco en footer (fondo verde)
- [x] Actualizar sección de planes en landing page con precios MXN correctos

## Bugs Reportados
- [x] Error al hacer clic en "Ver planes disponibles" en el dashboard del usuario (ruta /planes faltaba en App.tsx, creada la página Plans.tsx con todos los planes y FAQ)

## Mejoras de Experiencia Móvil (Solicitud del usuario)
- [x] Navegación inferior fija tipo app nativa (MobileNav.tsx) con 5 ítems: Inicio, Explorar, CTA central, Mis citas, Perfil
- [x] Home.tsx: hero compacto con saludo personalizado, strip de estadísticas superpuesto
- [x] Home.tsx: carrusel horizontal de especialidades deslizable sin scrollbar visible
- [x] Home.tsx: carrusel horizontal de testimonios en móvil
- [x] Home.tsx: tarjetas de planes con layout compacto y feedback táctil (active:scale)
- [x] Home.tsx: footer compacto en 3 columnas para móvil
- [x] Home.tsx: navbar reducida a h-14 en móvil con botón "Entrar" compacto
- [x] Plans.tsx: FAQ con acordeón interactivo (expandir/colapsar)
- [x] Plans.tsx: tarjetas de planes con layout compacto para móvil
- [x] UserDashboard.tsx: header app-style con avatar, saludo y botón logout
- [x] UserDashboard.tsx: strip de estadísticas superpuesto al header
- [x] UserDashboard.tsx: acciones rápidas en grid 3 columnas (solo móvil)
- [x] UserDashboard.tsx: tarjetas de citas con feedback táctil
- [x] Specialties.tsx: tarjetas de lista compactas con flecha de navegación en móvil
- [x] index.css: clase .scrollbar-none para carruseles sin scrollbar
- [x] index.css: clase .mobile-safe-bottom para padding de nav inferior
