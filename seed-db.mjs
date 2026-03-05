import mysql from 'mysql2/promise';

const connection = await mysql.createConnection({
  host: process.env.DATABASE_URL?.split('@')[1]?.split('/')[0] || 'localhost',
  user: process.env.DATABASE_URL?.split('://')[1]?.split(':')[0] || 'root',
  password: process.env.DATABASE_URL?.split(':')[2]?.split('@')[0] || '',
  database: process.env.DATABASE_URL?.split('/')[3]?.split('?')[0] || 'inteira',
});

// Specialties
const specialties = [
  {
    name: 'Psicología',
    description: 'Asesorías psicológicas y terapia',
    color: '#7C3AED',
  },
  {
    name: 'Legal',
    description: 'Asesorías legales y consultoría jurídica',
    color: '#2563EB',
  },
  {
    name: 'Emprendimiento',
    description: 'Asesorías para emprendedores y startups',
    color: '#F97316',
  },
  {
    name: 'Finanzas',
    description: 'Asesorías financieras y planificación',
    color: '#10B981',
  },
  {
    name: 'Medicina General',
    description: 'Consultas médicas generales',
    color: '#EF4444',
  },
  {
    name: 'Nutrición',
    description: 'Asesorías nutricionales y dietéticas',
    color: '#EC4899',
  },
];

// Subscription Plans
const plans = [
  {
    name: 'Plan Básico',
    description: 'Acceso a 4 citas mensuales de 30 minutos',
    price: '99.00',
    currency: 'MXN',
    billingPeriod: 'monthly',
    maxAppointmentsPerMonth: 4,
    maxMinutesPerAppointment: 30,
    features: JSON.stringify({
      videoCall: true,
      recordingAllowed: false,
      prioritySupport: false,
    }),
  },
  {
    name: 'Plan Premium',
    description: 'Acceso a 8 citas mensuales de 45 minutos',
    price: '199.00',
    currency: 'MXN',
    billingPeriod: 'monthly',
    maxAppointmentsPerMonth: 8,
    maxMinutesPerAppointment: 45,
    features: JSON.stringify({
      videoCall: true,
      recordingAllowed: true,
      prioritySupport: true,
    }),
  },
  {
    name: 'Plan Pro',
    description: 'Acceso ilimitado a citas de 60 minutos',
    price: '399.00',
    currency: 'MXN',
    billingPeriod: 'monthly',
    maxAppointmentsPerMonth: null,
    maxMinutesPerAppointment: 60,
    features: JSON.stringify({
      videoCall: true,
      recordingAllowed: true,
      prioritySupport: true,
      dedicatedSupport: true,
    }),
  },
];

try {
  // Insert specialties
  console.log('Inserting specialties...');
  for (const specialty of specialties) {
    await connection.execute(
      'INSERT INTO specialties (name, description, color, createdAt, updatedAt) VALUES (?, ?, ?, NOW(), NOW())',
      [specialty.name, specialty.description, specialty.color]
    );
  }
  console.log('✓ Specialties inserted');

  // Insert subscription plans
  console.log('Inserting subscription plans...');
  for (const plan of plans) {
    await connection.execute(
      'INSERT INTO subscriptionPlans (name, description, price, currency, billingPeriod, maxAppointmentsPerMonth, maxMinutesPerAppointment, features, isActive, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, true, NOW(), NOW())',
      [
        plan.name,
        plan.description,
        plan.price,
        plan.currency,
        plan.billingPeriod,
        plan.maxAppointmentsPerMonth,
        plan.maxMinutesPerAppointment,
        plan.features,
      ]
    );
  }
  console.log('✓ Subscription plans inserted');

  console.log('✓ Database seeding completed successfully!');
} catch (error) {
  console.error('Error seeding database:', error);
  process.exit(1);
} finally {
  await connection.end();
}
