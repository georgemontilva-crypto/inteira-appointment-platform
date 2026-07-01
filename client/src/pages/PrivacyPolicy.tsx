import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-background pb-24 md:pb-8">
      {/* Header */}
      <div className="gradient-hero text-white py-8">
        <div className="container">
          <a href="https://inteira.mx/">
            <Button variant="ghost" className="text-white/80 hover:text-white hover:bg-white/10 mb-4 -ml-2">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver al inicio
            </Button>
          </a>
          <h1 className="text-2xl md:text-3xl font-bold" style={{ fontFamily: "Poppins, sans-serif" }}>
            Aviso de Privacidad
          </h1>
          <p className="text-white/70 text-sm mt-1">Última actualización: 13 de abril de 2026</p>
        </div>
      </div>

      {/* Content */}
      <div className="container py-8 md:py-12 max-w-3xl">
        <div className="prose prose-sm md:prose-base max-w-none space-y-8 text-foreground">

          <section>
            <h2 className="text-xl font-bold mb-3" style={{ fontFamily: "Poppins, sans-serif" }}>1. Identidad del Responsable</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">
              En cumplimiento con la Ley Federal de Protección de Datos Personales en Posesión de los Particulares (LFPDPPP) y su Reglamento, le informamos que el responsable del tratamiento de sus datos personales es:
            </p>
            <ul className="list-none pl-0 space-y-1 text-muted-foreground">
              <li><strong>Razón social:</strong> INTEIRA SOLUCIONES INTEGRALES S.C.</li>
              <li><strong>Domicilio:</strong> Espacio Santa Fe, Carretera México-Toluca 5420, Ciudad de México, C.P. 05349</li>
              <li><strong>Correo electrónico:</strong>{" "}
                <a href="mailto:info@inteira.mx" className="text-primary hover:underline">info@inteira.mx</a>
              </li>
              <li><strong>Teléfono:</strong>{" "}
                <a href="tel:+525560593846" className="text-primary hover:underline">+52 (55) 6059-3846</a>
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3" style={{ fontFamily: "Poppins, sans-serif" }}>2. Datos Personales Recabados</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">
              Recabamos las siguientes categorías de datos personales:
            </p>
            <p className="text-muted-foreground font-medium mb-2">Para usuarios:</p>
            <ul className="list-disc pl-6 space-y-1 text-muted-foreground mb-4">
              <li><strong>Identificación:</strong> nombre completo, fecha de nacimiento, género.</li>
              <li><strong>Contacto:</strong> correo electrónico, número de teléfono.</li>
              <li><strong>Autenticación:</strong> nombre de usuario, contraseña cifrada.</li>
              <li><strong>Patrimoniales:</strong> historial de transacciones de créditos (no almacenamos datos de tarjeta de crédito; los pagos son procesados por Stripe).</li>
              <li><strong>Uso de plataforma:</strong> historial de citas, calificaciones, preferencias de especialidad, notas de sesión.</li>
            </ul>
            <p className="text-muted-foreground font-medium mb-2">Para profesionales (además de los anteriores):</p>
            <ul className="list-disc pl-6 space-y-1 text-muted-foreground">
              <li><strong>Académicos y profesionales:</strong> título, cédula profesional, certificaciones, años de experiencia, especialidad.</li>
              <li><strong>Fiscales y bancarios:</strong> RFC, CLABE interbancaria, datos bancarios para pago de comisiones.</li>
              <li><strong>Identidad oficial:</strong> copia de identificación oficial para verificación de identidad.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3" style={{ fontFamily: "Poppins, sans-serif" }}>3. Datos Personales Sensibles</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">
              <strong>INTEIRA no recaba datos personales sensibles de forma directa.</strong> Sin embargo, en el contexto de las sesiones con profesionales de salud, psicología u otras áreas, los usuarios pueden compartir voluntariamente información de carácter sensible (relativa a su salud física o mental, vida afectiva, entre otros).
            </p>
            <p className="text-muted-foreground leading-relaxed mb-3">
              Dicha información es compartida únicamente con el profesional con quien el usuario agenda la sesión, quien está sujeto a sus propias obligaciones de confidencialidad profesional y legal. <strong>INTEIRA no graba, transcribe ni almacena el contenido de las sesiones.</strong>
            </p>
            <p className="text-muted-foreground leading-relaxed">
              Al utilizar los servicios de profesionales de salud a través de la Plataforma, el usuario otorga su consentimiento expreso para el tratamiento de la información que decida compartir en el contexto de dichas sesiones, en los términos descritos en este Aviso.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3" style={{ fontFamily: "Poppins, sans-serif" }}>4. Finalidades del Tratamiento</h2>
            <p className="text-muted-foreground font-medium mb-2">Finalidades primarias (necesarias para la prestación del servicio):</p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground mb-4">
              <li>Creación, gestión y administración de su cuenta de usuario o perfil profesional.</li>
              <li>Verificación de identidad y validación de credenciales profesionales.</li>
              <li>Facilitación del agendamiento, gestión y seguimiento de citas.</li>
              <li>Procesamiento de pagos y administración del sistema de créditos.</li>
              <li>Envío de confirmaciones, recordatorios y notificaciones relacionadas con su cuenta y citas.</li>
              <li>Atención de solicitudes de soporte técnico y resolución de disputas.</li>
              <li>Cumplimiento de obligaciones legales y requerimientos de autoridades competentes.</li>
            </ul>
            <p className="text-muted-foreground font-medium mb-2">Finalidades secundarias (no necesarias para el servicio — puede oponerse):</p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>Envío de newsletters, comunicaciones comerciales y promociones sobre nuevas especialidades u ofertas.</li>
              <li>Realización de encuestas de satisfacción y estudios de mercado.</li>
              <li>Elaboración de estadísticas e informes anónimos para mejorar la Plataforma.</li>
              <li>Personalización de la experiencia del usuario en la Plataforma.</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-3">
              Si no desea que sus datos sean utilizados para las finalidades secundarias, puede manifestarlo enviando un correo a{" "}
              <a href="mailto:info@inteira.mx" className="text-primary hover:underline">info@inteira.mx</a>.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3" style={{ fontFamily: "Poppins, sans-serif" }}>5. Transferencia de Datos</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">
              Sus datos personales podrán ser transferidos a las siguientes categorías de destinatarios:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li><strong>Profesionales de la plataforma:</strong> únicamente los datos necesarios para la prestación del servicio contratado (nombre, datos de contacto en la plataforma, notas de sesión).</li>
              <li><strong>Stripe:</strong> para el procesamiento seguro de pagos. Stripe cuenta con certificación PCI DSS.</li>
              <li><strong>Proveedores de infraestructura en la nube:</strong> (AWS, Google Cloud u otros) para el almacenamiento y procesamiento de datos en el marco de la operación de la Plataforma.</li>
              <li><strong>Autoridades competentes:</strong> cuando así lo requiera la legislación aplicable o una orden judicial.</li>
              <li><strong>Agencias de marketing y análisis:</strong> únicamente con su consentimiento previo y expreso, para el desarrollo de actividades de marketing digital.</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-3">
              No realizamos transferencias de datos a terceros con fines comerciales distintos a los señalados, sin su consentimiento previo, salvo las excepciones previstas en el artículo 37 de la LFPDPPP.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3" style={{ fontFamily: "Poppins, sans-serif" }}>6. Medios para Ejercer los Derechos ARCO</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">
              Usted tiene derecho a Acceder, Rectificar, Cancelar u Oponerse (derechos ARCO) al tratamiento de sus datos personales, así como a la portabilidad de sus datos y a revocar su consentimiento. Para ejercer estos derechos, envíe su solicitud al correo{" "}
              <a href="mailto:info@inteira.mx" className="text-primary hover:underline">info@inteira.mx</a>{" "}
              incluyendo:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground mb-3">
              <li>Nombre completo y correo electrónico registrado en la Plataforma.</li>
              <li>Copia de identificación oficial vigente para acreditar su identidad.</li>
              <li>Descripción clara y específica de los datos personales respecto de los que desea ejercer algún derecho.</li>
              <li>Tipo de derecho que desea ejercer (Acceso, Rectificación, Cancelación u Oposición).</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed">
              Daremos respuesta a su solicitud en un plazo máximo de <strong>20 días hábiles</strong> contados a partir de su recepción, conforme a lo establecido en la LFPDPPP. El ejercicio de los derechos ARCO es <strong>gratuito</strong>.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3" style={{ fontFamily: "Poppins, sans-serif" }}>7. Uso de Cookies</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">
              La Plataforma utiliza cookies y tecnologías similares para los siguientes fines:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li><strong>Funcionamiento:</strong> cookies de sesión esenciales para mantener su autenticación activa y garantizar el correcto funcionamiento de la Plataforma.</li>
              <li><strong>Análisis:</strong> cookies analíticas para comprender cómo los usuarios interactúan con la Plataforma y mejorar su funcionamiento.</li>
              <li><strong>Preferencias:</strong> cookies para recordar sus configuraciones y preferencias dentro de la Plataforma.</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-3">
              Puede configurar su navegador para rechazar o eliminar cookies, aunque esto podría afectar la funcionalidad de la Plataforma. No utilizamos cookies de seguimiento de terceros con fines publicitarios sin su consentimiento.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3" style={{ fontFamily: "Poppins, sans-serif" }}>8. Seguridad de los Datos</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">
              INTEIRA implementa medidas técnicas, administrativas y físicas para proteger sus datos personales contra acceso no autorizado, pérdida, alteración o divulgación indebida, incluyendo:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>Cifrado de contraseñas mediante algoritmos de hash seguros.</li>
              <li>Comunicaciones protegidas mediante TLS/HTTPS.</li>
              <li>Controles de acceso basados en roles para el personal de INTEIRA.</li>
              <li>Monitoreo continuo de accesos y actividades sospechosas.</li>
              <li>Procesamiento de pagos a través de Stripe, que cuenta con certificación PCI DSS (Payment Card Industry Data Security Standard).</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3" style={{ fontFamily: "Poppins, sans-serif" }}>9. Cambios a este Aviso</h2>
            <p className="text-muted-foreground leading-relaxed">
              Nos reservamos el derecho de actualizar este Aviso de Privacidad en cualquier momento para reflejar cambios en nuestras prácticas de tratamiento de datos, en la legislación aplicable o en los servicios ofrecidos. Los cambios serán publicados en esta página con la fecha de última actualización correspondiente. En caso de modificaciones sustanciales, notificaremos a los usuarios registrados a través de un aviso visible en la Plataforma o mediante correo electrónico.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3" style={{ fontFamily: "Poppins, sans-serif" }}>10. Autoridad Competente</h2>
            <p className="text-muted-foreground leading-relaxed">
              Si considera que su derecho a la protección de datos personales ha sido vulnerado por alguna conducta de INTEIRA, o que en el tratamiento de sus datos personales existe alguna violación a las disposiciones previstas en la LFPDPPP, puede acudir al Instituto Nacional de Transparencia, Acceso a la Información y Protección de Datos Personales (INAI) en{" "}
              <a href="https://www.inai.org.mx" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">www.inai.org.mx</a>.
            </p>
          </section>

        </div>
      </div>
    </div>
  );
}
