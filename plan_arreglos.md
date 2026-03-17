# Plan de Arreglos Priorizados - Proyecto Inteira

Basado en la auditoría realizada, he estructurado las tareas pendientes en orden de prioridad. El enfoque es resolver primero los bloqueos críticos (base de datos), luego la funcionalidad core faltante, y finalmente las mejoras de experiencia de usuario.

## Prioridad 1: Correcciones Críticas de Base de Datos (Bloqueantes)
Estos errores impiden que la base de datos se inicialice correctamente con los datos semilla.

1. **Corregir esquema de `specialties`**: 
   - El script de seed intenta insertar en `imageUrl`, pero esta columna no existe en el esquema actual de Drizzle (aunque hay una migración antigua que la menciona).
   - **Acción**: Añadir `imageUrl` al esquema de Drizzle en `schema.ts` y generar la migración.
2. **Corregir esquema de `subscriptionPlans`**:
   - El script de seed intenta insertar en `sortOrder`, pero esta columna no existe.
   - **Acción**: Añadir `sortOrder` (int) al esquema de Drizzle en `schema.ts` y generar la migración.
3. **Actualizar Planes en BD**:
   - Asegurar que el script de seed inserte los planes correctos: Plan Básico ($980), Plan Pro ($2,500), Sesión Básica ($350) y Sesión Premium ($1,250).

## Prioridad 2: Lógica de Negocio Backend
Funcionalidad core que debe ejecutarse en el servidor para que el sistema sea confiable.

1. **Job de Expiración de Créditos**:
   - Crear un endpoint en el router de admin (ej. `admin.runCronJobs`) que llame a la función `expireTimedOutBatches()` de `credits.ts`.
   - Esto asegurará que los créditos venzan a los 60 días como dicta la regla de negocio.

## Prioridad 3: Integración de Archivos (S3)
Necesario para que los profesionales tengan perfiles completos.

1. **Endpoint de Subida a S3**:
   - Crear un endpoint en Express (fuera de tRPC o usando un procedimiento especial) para recibir archivos y subirlos a AWS S3.
2. **Actualizar Registro de Profesional**:
   - Modificar `RegisterProfessional.tsx` para incluir un input de archivo.
   - Subir la imagen a S3 y enviar la URL resultante al procedimiento `registerProfessional`.
3. **Mostrar Fotos**:
   - Actualizar las tarjetas en `ProfessionalsList` y `ProfessionalDashboard` para mostrar la foto real en lugar de un avatar genérico.

## Prioridad 4: Admin Dashboard y Videollamadas
Para que los administradores puedan operar la plataforma.

1. **Conectar KPIs Reales**:
   - El `AdminDashboard.tsx` actualmente tiene datos estáticos o parcialmente conectados. Hay que asegurar que use `getMetrics`, `getRecentAppointments`, etc.
2. **Gráficas y Listas**:
   - Conectar la gráfica de barras con `getAppointmentsByDay`.
   - Mostrar la lista real de citas recientes y el top 5 de profesionales.
3. **Videollamadas Jitsi (Alternativa rápida)**:
   - Como no tenemos credenciales de Zoom/Meet aún, implementaremos la generación automática de enlaces de Jitsi Meet (que es gratuito y no requiere API keys) al confirmar una cita.
   - Añadir botón "Unirse a videollamada" en los dashboards de usuario y profesional.

## Prioridad 5: Mejoras de UX y Funcionalidad Frontend
Detalles finales para pulir la experiencia del usuario.

1. **Búsqueda y Filtros**:
   - Añadir barra de búsqueda por nombre en `ProfessionalsList.tsx`.
2. **Alertas de Wallet**:
   - Mostrar un banner de alerta en `UserDashboard` cuando los créditos estén por vencer en menos de 10 días.
3. **Historial de Citas**:
   - Mostrar el nombre real del profesional en el historial en lugar de "Especialista #ID".
4. **Páginas Faltantes**:
   - Crear página `/perfil` para editar datos del usuario.
   - Crear página `/suscripcion` para gestionar el plan activo.

---
*Nota sobre Stripe y Emails: Estas integraciones requieren credenciales de producción (API Keys) proporcionadas por el cliente. Se dejarán preparadas a nivel de código, pero no se pueden probar completamente sin las llaves.*
