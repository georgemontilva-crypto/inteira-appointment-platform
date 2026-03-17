import mysql from 'mysql2/promise';

const connection = await mysql.createConnection({
  host: process.env.DATABASE_URL?.split('@')[1]?.split('/')[0] || 'localhost',
  user: process.env.DATABASE_URL?.split('://')[1]?.split(':')[0] || 'root',
  password: process.env.DATABASE_URL?.split(':')[2]?.split('@')[0] || '',
  database: process.env.DATABASE_URL?.split('/')[3]?.split('?')[0] || 'inteira',
});

// ─── Especialidades correctas según inteira.mx ───────────────────────────────
const specialties = [
  {
    name: 'Psicología',
    description: 'Consultas con psicólogos certificados para bienestar mental y emocional',
    icon: 'Brain',
    imageUrl: 'https://inteira.mx/wp-content/uploads/2025/03/asesorias_Psicologia.png',
    color: '#607562',
  },
  {
    name: 'Emprendimiento',
    description: 'Asesoría especializada para emprendedores y startups en crecimiento',
    icon: 'Rocket',
    imageUrl: 'https://inteira.mx/wp-content/uploads/2025/03/asesorias_Emprendimiento.png',
    color: '#607562',
  },
  {
    name: 'Finanzas',
    description: 'Consultoría financiera personal y empresarial con expertos certificados',
    icon: 'TrendingUp',
    imageUrl: 'https://inteira.mx/wp-content/uploads/2025/03/asesorias_Finanzas.png',
    color: '#607562',
  },
  {
    name: 'Idiomas',
    description: 'Clases y asesorías de idiomas con profesores nativos y certificados',
    icon: 'Languages',
    imageUrl: 'https://inteira.mx/wp-content/uploads/2025/03/asesorias_Idiomas.png',
    color: '#607562',
  },
  {
    name: 'Imagen Personal',
    description: 'Consultoría de imagen, estilo y presencia personal con expertos',
    icon: 'Sparkles',
    imageUrl: 'https://inteira.mx/wp-content/uploads/2025/03/asesorias_Imagen-Personal.png',
    color: '#607562',
  },
  {
    name: 'Legal',
    description: 'Asesoría legal con abogados certificados en diversas áreas del derecho',
    icon: 'Scale',
    imageUrl: 'https://inteira.mx/wp-content/uploads/2025/03/asesorias_Legal.png',
    color: '#607562',
  },
  {
    name: 'Vocación',
    description: 'Orientación vocacional y desarrollo profesional con especialistas',
    icon: 'Compass',
    imageUrl: 'https://inteira.mx/wp-content/uploads/2025/03/asesorias_Vocacion.png',
    color: '#607562',
  },
];

// ─── Planes de suscripción correctos según el cliente ────────────────────────
const plans = [
  {
    name: 'Plan Básico',
    description: '980 créditos mensuales equivalentes a 4 asesorías básicas. Vigencia de 60 días. Ahorra 30% vs compra individual.',
    price: '980.00',
    currency: 'MXN',
    billingPeriod: 'monthly',
    maxAppointmentsPerMonth: 4,
    maxMinutesPerAppointment: 60,
    sortOrder: 1,
    features: JSON.stringify({
      credits: 980,
      validityDays: 60,
      specialties: 'all',
      support: 'email',
      savings: '30%',
      badge: null,
      community: false,
      priorityAccess: false,
    }),
  },
  {
    name: 'Plan Pro',
    description: '2,500 créditos mensuales equivalentes a 2 asesorías premium. Vigencia de 60 días. Acceso prioritario a expertos y comunidad exclusiva. Ahorra 52% vs compra individual.',
    price: '2500.00',
    currency: 'MXN',
    billingPeriod: 'monthly',
    maxAppointmentsPerMonth: 10,
    maxMinutesPerAppointment: 90,
    sortOrder: 2,
    features: JSON.stringify({
      credits: 2500,
      validityDays: 60,
      specialties: 'all',
      support: '24/7',
      savings: '52%',
      badge: 'popular',
      community: true,
      priorityAccess: true,
    }),
  },
  {
    name: 'Sesión Básica',
    description: 'Compra individual de una sesión básica de 60 min. Sin compromiso de suscripción mensual.',
    price: '350.00',
    currency: 'MXN',
    billingPeriod: 'monthly',
    maxAppointmentsPerMonth: 1,
    maxMinutesPerAppointment: 60,
    sortOrder: 3,
    features: JSON.stringify({
      credits: 350,
      validityDays: 30,
      specialties: 'all',
      support: 'email',
      savings: null,
      badge: null,
      community: false,
      priorityAccess: false,
      oneTime: true,
      sessionType: 'basic',
    }),
  },
  {
    name: 'Sesión Premium',
    description: 'Compra individual de una sesión premium de 90 min con expertos de alto nivel. Sin compromiso de suscripción mensual.',
    price: '1250.00',
    currency: 'MXN',
    billingPeriod: 'monthly',
    maxAppointmentsPerMonth: 1,
    maxMinutesPerAppointment: 90,
    sortOrder: 4,
    features: JSON.stringify({
      credits: 1250,
      validityDays: 30,
      specialties: 'all',
      support: 'prioritario',
      savings: null,
      badge: null,
      community: false,
      priorityAccess: true,
      oneTime: true,
      sessionType: 'premium',
    }),
  },
];

try {
  // ── Especialidades ────────────────────────────────────────────────────────
  console.log('Actualizando especialidades...');
  // Upsert: actualizar si existe, insertar si no
  for (const specialty of specialties) {
    const [rows] = await connection.execute(
      'SELECT id FROM specialties WHERE name = ?',
      [specialty.name]
    );
    if (rows.length > 0) {
      await connection.execute(
        'UPDATE specialties SET description=?, icon=?, imageUrl=?, color=?, isActive=true, updatedAt=NOW() WHERE name=?',
        [specialty.description, specialty.icon, specialty.imageUrl, specialty.color, specialty.name]
      );
      console.log(`  ↻ Actualizada: ${specialty.name}`);
    } else {
      await connection.execute(
        'INSERT INTO specialties (name, description, icon, imageUrl, color, isActive, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, true, NOW(), NOW())',
        [specialty.name, specialty.description, specialty.icon, specialty.imageUrl, specialty.color]
      );
      console.log(`  + Insertada: ${specialty.name}`);
    }
  }
  console.log('✓ Especialidades actualizadas');

  // ── Planes de suscripción ─────────────────────────────────────────────────
  console.log('Actualizando planes de suscripción...');
  for (const plan of plans) {
    const [rows] = await connection.execute(
      'SELECT id FROM subscriptionPlans WHERE name = ?',
      [plan.name]
    );
    if (rows.length > 0) {
      await connection.execute(
        'UPDATE subscriptionPlans SET description=?, price=?, currency=?, billingPeriod=?, maxAppointmentsPerMonth=?, maxMinutesPerAppointment=?, features=?, sortOrder=?, isActive=true, updatedAt=NOW() WHERE name=?',
        [plan.description, plan.price, plan.currency, plan.billingPeriod, plan.maxAppointmentsPerMonth, plan.maxMinutesPerAppointment, plan.features, plan.sortOrder, plan.name]
      );
      console.log(`  ↻ Actualizado: ${plan.name}`);
    } else {
      await connection.execute(
        'INSERT INTO subscriptionPlans (name, description, price, currency, billingPeriod, maxAppointmentsPerMonth, maxMinutesPerAppointment, features, sortOrder, isActive, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, true, NOW(), NOW())',
        [plan.name, plan.description, plan.price, plan.currency, plan.billingPeriod, plan.maxAppointmentsPerMonth, plan.maxMinutesPerAppointment, plan.features, plan.sortOrder]
      );
      console.log(`  + Insertado: ${plan.name}`);
    }
  }
  console.log('✓ Planes actualizados');

  console.log('\n✅ Seed completado exitosamente!');
} catch (error) {
  console.error('Error en seed:', error);
  process.exit(1);
} finally {
  await connection.end();
}
