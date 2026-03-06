import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-background pb-24 md:pb-8">
      {/* Header */}
      <div className="gradient-hero text-white py-8">
        <div className="container">
          <Link href="/">
            <Button variant="ghost" className="text-white/80 hover:text-white hover:bg-white/10 mb-4 -ml-2">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver al inicio
            </Button>
          </Link>
          <h1 className="text-2xl md:text-3xl font-bold" style={{ fontFamily: "Poppins, sans-serif" }}>
            Política de Privacidad
          </h1>
          <p className="text-white/70 text-sm mt-1">Última actualización: marzo de 2026</p>
        </div>
      </div>

      {/* Content */}
      <div className="container py-8 md:py-12 max-w-3xl">
        <div className="prose prose-sm md:prose-base max-w-none space-y-8 text-foreground">

          <section>
            <h2 className="text-xl font-bold mb-3" style={{ fontFamily: "Poppins, sans-serif" }}>1. Responsable del Tratamiento</h2>
            <p className="text-muted-foreground leading-relaxed">
              Inteira (en adelante "la Empresa") es responsable del tratamiento de sus datos personales. Para cualquier consulta relacionada con el tratamiento de sus datos, puede contactarnos en{" "}
              <a href="mailto:privacidad@inteira.mx" className="text-primary hover:underline">privacidad@inteira.mx</a>.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3" style={{ fontFamily: "Poppins, sans-serif" }}>2. Datos Personales que Recabamos</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">
              Con fundamento en la Ley Federal de Protección de Datos Personales en Posesión de los Particulares (LFPDPPP) y su Reglamento, le informamos que recabamos los siguientes datos personales:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li><strong>Datos de identificación:</strong> nombre completo, correo electrónico, número de teléfono.</li>
              <li><strong>Datos de uso:</strong> historial de citas, calificaciones, preferencias de especialidad.</li>
              <li><strong>Datos financieros:</strong> historial de transacciones de créditos (no almacenamos datos de tarjeta de crédito).</li>
              <li><strong>Datos técnicos:</strong> dirección IP, tipo de navegador, sistema operativo, páginas visitadas.</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-3">
              <strong>Datos sensibles:</strong> En el caso de consultas con especialistas en salud mental, podría generarse información sensible. Dicha información es tratada con estricta confidencialidad y solo es accesible por el profesional correspondiente y el usuario.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3" style={{ fontFamily: "Poppins, sans-serif" }}>3. Finalidades del Tratamiento</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">Sus datos personales son utilizados para las siguientes finalidades:</p>
            <p className="text-muted-foreground font-medium mb-2">Finalidades primarias (necesarias para el servicio):</p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground mb-4">
              <li>Crear y gestionar su cuenta de usuario.</li>
              <li>Facilitar la conexión con profesionales y el agendamiento de citas.</li>
              <li>Procesar pagos y gestionar el sistema de créditos.</li>
              <li>Enviar confirmaciones y recordatorios de citas.</li>
              <li>Atender solicitudes de soporte técnico.</li>
            </ul>
            <p className="text-muted-foreground font-medium mb-2">Finalidades secundarias (puede oponerse):</p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>Envío de comunicaciones comerciales sobre nuevas especialidades o promociones.</li>
              <li>Realización de encuestas de satisfacción.</li>
              <li>Análisis estadísticos para mejorar la Plataforma.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3" style={{ fontFamily: "Poppins, sans-serif" }}>4. Transferencia de Datos</h2>
            <p className="text-muted-foreground leading-relaxed">
              Sus datos personales pueden ser compartidos con los profesionales registrados en la Plataforma, exclusivamente para la prestación del servicio contratado. No realizamos transferencias de datos a terceros con fines comerciales sin su consentimiento previo, salvo las excepciones previstas en el artículo 37 de la LFPDPPP.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3" style={{ fontFamily: "Poppins, sans-serif" }}>5. Derechos ARCO</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">
              Usted tiene derecho a Acceder, Rectificar, Cancelar u Oponerse (derechos ARCO) al tratamiento de sus datos personales. Para ejercer estos derechos, envíe su solicitud a{" "}
              <a href="mailto:privacidad@inteira.mx" className="text-primary hover:underline">privacidad@inteira.mx</a>{" "}
              indicando:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>Nombre completo y correo electrónico registrado.</li>
              <li>Descripción clara del derecho que desea ejercer.</li>
              <li>Copia de identificación oficial.</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-3">
              Responderemos a su solicitud en un plazo máximo de 20 días hábiles conforme a lo establecido en la LFPDPPP.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3" style={{ fontFamily: "Poppins, sans-serif" }}>6. Uso de Cookies</h2>
            <p className="text-muted-foreground leading-relaxed">
              La Plataforma utiliza cookies de sesión para mantener su autenticación activa. No utilizamos cookies de seguimiento de terceros con fines publicitarios. Puede configurar su navegador para rechazar cookies, aunque esto puede afectar el funcionamiento de la Plataforma.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3" style={{ fontFamily: "Poppins, sans-serif" }}>7. Seguridad de los Datos</h2>
            <p className="text-muted-foreground leading-relaxed">
              Implementamos medidas técnicas y organizativas para proteger sus datos personales contra acceso no autorizado, pérdida o divulgación. Las contraseñas se almacenan de forma cifrada y las comunicaciones se realizan a través de conexiones seguras (HTTPS).
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3" style={{ fontFamily: "Poppins, sans-serif" }}>8. Cambios a esta Política</h2>
            <p className="text-muted-foreground leading-relaxed">
              Nos reservamos el derecho de actualizar esta Política de Privacidad en cualquier momento. Los cambios serán publicados en esta página con la fecha de última actualización. Le recomendamos revisarla periódicamente.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3" style={{ fontFamily: "Poppins, sans-serif" }}>9. Autoridad Competente</h2>
            <p className="text-muted-foreground leading-relaxed">
              Si considera que su derecho a la protección de datos personales ha sido vulnerado, puede acudir al Instituto Nacional de Transparencia, Acceso a la Información y Protección de Datos Personales (INAI) en{" "}
              <a href="https://www.inai.org.mx" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">www.inai.org.mx</a>.
            </p>
          </section>

        </div>
      </div>
    </div>
  );
}
