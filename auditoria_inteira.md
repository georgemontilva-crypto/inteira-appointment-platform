# Informe de Auditoría: Proyecto Inteira Appointment Platform

## 1. Resumen Ejecutivo

He realizado una auditoría exhaustiva del repositorio `inteira-appointment-platform`. El proyecto es una plataforma de telemedicina y agendamiento de citas profesionales para **inteira.mx**. Está construido con un stack moderno (React, Vite, tRPC, Drizzle ORM, MySQL/TiDB) y cuenta con una arquitectura robusta que soporta tres roles principales: usuarios, profesionales y administradores.

El proyecto se encuentra en una fase avanzada de desarrollo, con la mayor parte de la funcionalidad core implementada, pero requiere completar integraciones clave (Stripe, S3, APIs de videollamadas) y finalizar algunas tareas de UI/UX pendientes según el archivo `todo.md`.

## 2. Arquitectura y Stack Tecnológico

El proyecto utiliza una arquitectura monolítica moderna con separación clara entre cliente y servidor, comunicados a través de tRPC para garantizar tipado estricto de extremo a extremo.

*   **Frontend**: React 19, Vite, TailwindCSS, shadcn/ui, wouter (enrutamiento), React Query.
*   **Backend**: Node.js (Express), tRPC, Drizzle ORM.
*   **Base de Datos**: MySQL (optimizado para TiDB Cloud con connection pooling).
*   **Integraciones**: Preparado para Stripe (pagos), AWS S3 (almacenamiento de documentos/fotos), Resend (emails), Zoom/Google Meet (videollamadas).

## 3. Estado Actual del Proyecto

Basado en la revisión del código y el archivo `todo.md`, el proyecto tiene el siguiente estado:

### 3.1. Funcionalidades Completadas
*   **Base de Datos**: Esquema completo con 13 tablas, incluyendo el nuevo sistema de wallet de créditos (`creditBatches`, `creditTransactions`).
*   **Autenticación**: Sistema de roles (usuario, profesional, admin) funcional.
*   **Gestión de Citas**: Flujo completo de agendamiento, validación de disponibilidad (4 horas de anticipación), cancelación y marcado como completado.
*   **Sistema de Créditos (Wallet)**: Implementación robusta con política FIFO de 60 días, consumo de créditos por sesión (350 básica / 1250 premium) y reembolsos automáticos al cancelar.
*   **Frontend Core**: Landing page, dashboards para los tres roles, catálogo de especialidades, perfiles de profesionales y sistema de reseñas.
*   **Diseño**: Adaptado a la paleta de colores de inteira.mx (verde salvia #607562) y optimizado para experiencia móvil (navegación inferior, carruseles sin scrollbar).

### 3.2. Problemas Detectados (Bugs/Errores)
Durante la auditoría, se encontraron registros de errores recientes en la base de datos (`.manus/db/db-query-error-*.json`):
1.  **Error en tabla `specialties`**: Intento de insertar en la columna `imageUrl` que no existe en el esquema actual (fue eliminada o no migrada correctamente, aunque aparece en una migración antigua).
2.  **Error en tabla `subscriptionPlans`**: Intento de insertar en la columna `sortOrder` que no existe en el esquema.

## 4. Tareas Pendientes para "Terminar" el Proyecto

Para llevar el proyecto a producción, se deben completar las siguientes tareas críticas:

### 4.1. Integraciones Externas (Crítico)
*   **Stripe**: Configurar webhooks y checkout para la compra de planes y sesiones individuales. Actualmente, las funciones de compra en `routers.ts` simulan el éxito sin procesar el pago real.
*   **Videollamadas**: Configurar credenciales reales de Zoom OAuth y Google Meet API. Actualmente, el sistema genera enlaces simulados o usa un fallback si no hay credenciales.
*   **Email**: Configurar el proveedor SMTP (Resend) con credenciales reales. Actualmente, los correos se registran en la consola en modo desarrollo.
*   **AWS S3**: Implementar la subida de fotos de perfil de profesionales y documentos.

### 4.2. Backend y Base de Datos
*   **Job de Expiración de Créditos**: Implementar un cron job o endpoint admin para ejecutar `expireTimedOutBatches()` y limpiar créditos vencidos.
*   **Actualización de Planes**: Modificar la base de datos para reflejar los nuevos planes (Plan Básico $980, Plan Pro $2,500, Sesión Básica $350, Sesión Premium $1,250). *Nota: Hay que corregir el script SQL que falla por la columna `sortOrder`*.
*   **Métricas Admin**: Conectar el `AdminDashboard` con los procedimientos tRPC reales (`getMetrics`, `getRecentAppointments`, etc.) que ya están implementados en `db.ts` pero no completamente integrados en la UI.

### 4.3. Frontend (UI/UX)
*   **Búsqueda y Filtros**: Implementar barra de búsqueda en la lista de profesionales (`ProfessionalsList`).
*   **Gestión de Perfil**: Crear páginas `/perfil` para editar datos del usuario y `/suscripcion` para gestionar el plan activo (con integración a Stripe).
*   **Alertas de Wallet**: Mostrar banner en el dashboard cuando los créditos estén por vencer (< 10 días).
*   **Mejoras Visuales**: Mostrar la foto real del profesional (una vez implementado S3) y su nombre real en el historial de citas.

## 5. Próximos Pasos Recomendados

Para continuar y terminar el proyecto, sugiero el siguiente plan de acción:

1.  **Corregir Esquema de BD**: Arreglar las discrepancias entre los scripts de inserción de datos y el esquema actual de Drizzle (columnas `imageUrl` y `sortOrder`).
2.  **Implementar S3**: Configurar la subida de imágenes para que los profesionales puedan tener fotos de perfil reales.
3.  **Finalizar Admin Dashboard**: Conectar los gráficos y KPIs del panel de administración con los datos reales del backend.
4.  **Integrar Stripe**: Es el paso más importante para la monetización. Requiere las claves API del cliente.
5.  **Integrar APIs de Video y Email**: Configurar credenciales de producción para Zoom/Meet y Resend.

¿Por cuál de estas áreas te gustaría que empecemos a trabajar?
