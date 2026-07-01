import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function TermsOfService() {
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
            Términos de Uso
          </h1>
          <p className="text-white/70 text-sm mt-1">Última actualización: 31 de marzo de 2026</p>
        </div>
      </div>

      {/* Content */}
      <div className="container py-8 md:py-12 max-w-3xl">
        <div className="prose prose-sm md:prose-base max-w-none space-y-8 text-foreground">

          <section>
            <h2 className="text-xl font-bold mb-3" style={{ fontFamily: "Poppins, sans-serif" }}>1. Naturaleza y Objeto de la Plataforma</h2>
            <p className="text-muted-foreground leading-relaxed">
              INTEIRA es una plataforma tecnológica que actúa exclusivamente como intermediaria entre usuarios y profesionales independientes. INTEIRA no es prestadora directa de servicios profesionales (médicos, psicológicos, legales, financieros, de coaching ni de ninguna otra índole). Los servicios son prestados por los profesionales registrados, quienes actúan de forma autónoma e independiente. La relación contractual en materia de prestación del servicio se establece directamente entre el usuario y el profesional.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3" style={{ fontFamily: "Poppins, sans-serif" }}>2. Exención de Responsabilidad</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">
              <strong>Responsabilidad del profesional:</strong> Cada profesional es el único responsable del contenido, calidad, exactitud, legalidad y pertinencia de los servicios que presta a través de la Plataforma. INTEIRA no supervisa, valida ni garantiza las recomendaciones, diagnósticos, asesorías ni cualquier otro resultado derivado de las sesiones.
            </p>
            <p className="text-muted-foreground leading-relaxed mb-3">
              <strong>Responsabilidad del usuario:</strong> El usuario es responsable de las decisiones que tome con base en los servicios recibidos a través de la Plataforma. El uso de los servicios no sustituye atención médica, psicológica, legal o financiera de emergencia.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              <strong>Limitación general:</strong> INTEIRA no será responsable por daños directos, indirectos, incidentales, especiales, consecuentes ni punitivos derivados del uso o la imposibilidad de uso de la Plataforma o de los servicios prestados por los profesionales.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3" style={{ fontFamily: "Poppins, sans-serif" }}>3. Registro de Usuarios</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">
              Para acceder a los servicios de la Plataforma, el usuario deberá ser mayor de 18 años y proporcionar información completa, veraz y actualizada durante el proceso de registro. El usuario es el único responsable de mantener la confidencialidad de sus credenciales de acceso y de todas las actividades realizadas bajo su cuenta.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              INTEIRA se reserva el derecho de suspender o cancelar cuentas que incumplan estos Términos o que presenten información falsa o incompleta.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3" style={{ fontFamily: "Poppins, sans-serif" }}>4. Registro de Profesionales</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">
              Los profesionales que deseen registrarse en la Plataforma deberán contar con credenciales válidas y vigentes para el ejercicio de su actividad profesional conforme a la legislación mexicana aplicable. Al registrarse, el profesional declara y garantiza que la información proporcionada —incluyendo títulos, cédulas, certificaciones y experiencia— es veraz, completa y actualizada.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              El profesional es el único responsable por cualquier inexactitud u omisión en la información proporcionada, así como por las consecuencias legales que pudieran derivarse de ello. INTEIRA podrá, a su sola discreción, verificar las credenciales presentadas y rechazar o suspender registros que no cumplan con los requisitos establecidos.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3" style={{ fontFamily: "Poppins, sans-serif" }}>5. Contratación de Servicios</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">
              Los usuarios pueden contratar los servicios de la Plataforma mediante dos modalidades: (i) membresía con renovación periódica, o (ii) compra individual de sesiones. En ambos casos, la contratación se realiza a través de un sistema de créditos con las siguientes condiciones:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground mb-3">
              <li>Los créditos tienen una equivalencia de 1 peso mexicano (MXN) por 1 crédito.</li>
              <li>Los créditos adquiridos tienen una validez de 60 días naturales a partir de la fecha de compra.</li>
              <li>El consumo de créditos se realiza bajo la política FIFO (primero en entrar, primero en salir).</li>
              <li>Una sesión básica tiene un costo de 350 créditos; una sesión premium de 1,500 créditos.</li>
              <li>Los créditos no son transferibles ni canjeables por efectivo.</li>
              <li>Al cancelar una suscripción activa, los créditos acumulados expiran de forma inmediata.</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed">
              Para ejercer sus derechos ARCO en relación con la información de su contratación, puede contactarnos en{" "}
              <a href="mailto:info@inteira.mx" className="text-primary hover:underline">info@inteira.mx</a>{" "}
              o al teléfono <a href="tel:+525560593846" className="text-primary hover:underline">+52 (55) 6059-3846</a>.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3" style={{ fontFamily: "Poppins, sans-serif" }}>6. Pagos y Política de Cancelación</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">
              Todos los pagos dentro de la Plataforma se procesan exclusivamente a través de Stripe. INTEIRA no acepta depósitos bancarios, transferencias directas ni ningún otro medio de pago fuera de los habilitados en la Plataforma. Cualquier solicitud de pago por medios alternativos deberá ser reportada de inmediato a INTEIRA.
            </p>
            <p className="text-muted-foreground leading-relaxed mb-2">Política de cancelación de citas:</p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li><strong>Cancelación con más de 4 horas de anticipación:</strong> reembolso total de los créditos utilizados a la wallet del usuario.</li>
              <li><strong>Cancelación con 4 horas o menos de anticipación:</strong> pérdida total de los créditos correspondientes a la sesión.</li>
              <li>Las cancelaciones realizadas por el profesional siempre generan reembolso total al usuario, independientemente del tiempo de anticipación.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3" style={{ fontFamily: "Poppins, sans-serif" }}>7. Obligaciones de los Usuarios</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">Al utilizar la Plataforma, el usuario se compromete a:</p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>Mantener una conducta apropiada, respetuosa y profesional en todas sus interacciones dentro de la Plataforma.</li>
              <li>No realizar pagos directos a los profesionales fuera de la Plataforma por servicios contratados a través de ella.</li>
              <li>No utilizar la Plataforma para fines ilegales, fraudulentos o no autorizados.</li>
              <li>No acosar, intimidar ni discriminar a otros usuarios o profesionales.</li>
              <li>No compartir información falsa, engañosa o que infrinja derechos de terceros.</li>
              <li>Respetar los derechos de propiedad intelectual de la Plataforma y sus contenidos.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3" style={{ fontFamily: "Poppins, sans-serif" }}>8. Obligaciones de los Profesionales</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">Los profesionales registrados en la Plataforma se comprometen a:</p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>Prestar sus servicios con el máximo nivel de profesionalismo, ética y cumplimiento de la normativa aplicable a su actividad.</li>
              <li>No establecer contacto directo con los usuarios fuera de la Plataforma para continuar, sustituir o complementar los servicios contratados a través de ella, salvo autorización expresa de INTEIRA.</li>
              <li>Mantener actualizadas sus credenciales y perfil profesional en la Plataforma.</li>
              <li>Cumplir con los horarios y compromisos acordados con los usuarios.</li>
              <li>No solicitar ni aceptar pagos directos de usuarios por servicios gestionados a través de la Plataforma.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3" style={{ fontFamily: "Poppins, sans-serif" }}>9. Propiedad Intelectual</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">
              Todos los derechos de propiedad intelectual sobre la Plataforma, incluyendo su diseño, código fuente, logotipos, marcas, textos y cualquier otro elemento, son propiedad exclusiva de INTEIRA o de sus licenciantes. Queda expresamente prohibida su reproducción, distribución, modificación o uso no autorizado.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              INTEIRA otorga al usuario una licencia limitada, no exclusiva, no transferible y revocable para acceder y utilizar la Plataforma exclusivamente con fines personales y no comerciales, de conformidad con estos Términos.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3" style={{ fontFamily: "Poppins, sans-serif" }}>10. Contenido de los Usuarios</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">
              El usuario conserva la titularidad de los derechos sobre el contenido que genere o comparta a través de la Plataforma (incluyendo reseñas, comentarios y notas de sesión). Al publicar dicho contenido, el usuario otorga a INTEIRA una licencia mundial, no exclusiva, libre de regalías, sublicenciable y transferible para usar, reproducir, distribuir, preparar obras derivadas y exhibir dicho contenido en el contexto de la operación de la Plataforma.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              El usuario declara y garantiza que cuenta con todos los derechos necesarios para otorgar dicha licencia y que el contenido no infringe derechos de terceros ni disposiciones legales aplicables.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3" style={{ fontFamily: "Poppins, sans-serif" }}>11. Prohibiciones y Restricciones</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">Queda estrictamente prohibido:</p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>Realizar ingeniería inversa, descompilar o desensamblar cualquier parte de la Plataforma.</li>
              <li>Acceder a la Plataforma mediante medios automatizados (bots, scrapers, crawlers) sin autorización expresa.</li>
              <li>Intentar acceder a sistemas, cuentas o datos de otros usuarios sin autorización.</li>
              <li>Transmitir virus, malware o cualquier código dañino a través de la Plataforma.</li>
              <li>Utilizar la Plataforma para actividades que violen derechos de terceros o disposiciones legales.</li>
              <li>Crear cuentas múltiples o falsas para eludir restricciones o suspensiones.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3" style={{ fontFamily: "Poppins, sans-serif" }}>12. Limitación de Responsabilidad</h2>
            <p className="text-muted-foreground leading-relaxed">
              En la máxima medida permitida por la ley, INTEIRA no será responsable por daños directos, indirectos, incidentales, especiales, consecuentes ni punitivos, incluyendo —sin limitación— pérdida de datos, pérdida de ingresos, pérdida de oportunidades de negocio o daños a la reputación, derivados de: (i) el uso o la imposibilidad de uso de la Plataforma; (ii) los servicios prestados por los profesionales; (iii) errores u omisiones en el contenido de la Plataforma; o (iv) accesos no autorizados a los sistemas de INTEIRA. La responsabilidad total de INTEIRA frente al usuario, en cualquier caso, no excederá el importe pagado por el usuario en los 3 meses anteriores al evento que dio origen al reclamo.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3" style={{ fontFamily: "Poppins, sans-serif" }}>13. Indemnización</h2>
            <p className="text-muted-foreground leading-relaxed">
              El usuario acepta indemnizar, defender y mantener indemne a INTEIRA, sus directivos, empleados, agentes y socios comerciales frente a cualquier reclamación, demanda, daño, pérdida, costo o gasto (incluyendo honorarios legales razonables) que surja de o esté relacionado con: (i) el incumplimiento de estos Términos; (ii) el uso indebido de la Plataforma; (iii) la infracción de derechos de terceros; o (iv) cualquier contenido que el usuario publique o transmita a través de la Plataforma.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3" style={{ fontFamily: "Poppins, sans-serif" }}>14. Modificaciones</h2>
            <p className="text-muted-foreground leading-relaxed">
              INTEIRA se reserva el derecho de modificar estos Términos en cualquier momento. Los cambios entrarán en vigor al momento de su publicación en la Plataforma. En caso de modificaciones sustanciales, se notificará a los usuarios registrados por los medios disponibles. El uso continuado de la Plataforma después de la publicación de los cambios constituye la aceptación de los nuevos términos.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3" style={{ fontFamily: "Poppins, sans-serif" }}>15. Resolución de Disputas</h2>
            <p className="text-muted-foreground leading-relaxed">
              Ante cualquier disputa o controversia derivada de estos Términos o del uso de la Plataforma, las partes acuerdan intentar en primera instancia una resolución amistosa mediante contacto directo con INTEIRA. En caso de no llegar a un acuerdo en un plazo de 30 días naturales, la disputa se someterá a los tribunales competentes de conformidad con lo establecido en la cláusula de legislación aplicable.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3" style={{ fontFamily: "Poppins, sans-serif" }}>16. Legislación Aplicable</h2>
            <p className="text-muted-foreground leading-relaxed">
              Estos Términos se rigen e interpretan de conformidad con las leyes de los Estados Unidos Mexicanos, incluyendo la Ley Federal de Protección de Datos Personales en Posesión de los Particulares (LFPDPPP) y demás normativa aplicable. Para la resolución de cualquier controversia derivada de estos Términos, las partes se someten expresamente a la jurisdicción de los tribunales competentes de la Ciudad de México, renunciando a cualquier otro fuero que pudiera corresponderles por razón de su domicilio presente o futuro.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3" style={{ fontFamily: "Poppins, sans-serif" }}>17. Contacto</h2>
            <p className="text-muted-foreground leading-relaxed">
              Para cualquier consulta relacionada con estos Términos de Uso, puede contactarnos en:{" "}
              <a href="mailto:info@inteira.mx" className="text-primary hover:underline">info@inteira.mx</a>
              {" "}| Teléfono:{" "}
              <a href="tel:+525560593846" className="text-primary hover:underline">+52 (55) 6059-3846</a>
            </p>
          </section>

        </div>
      </div>
    </div>
  );
}
