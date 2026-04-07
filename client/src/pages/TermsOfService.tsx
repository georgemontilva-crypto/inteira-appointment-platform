import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function TermsOfService() {
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
            Términos de Uso
          </h1>
          <p className="text-white/70 text-sm mt-1">Última actualización: marzo de 2026</p>
        </div>
      </div>

      {/* Content */}
      <div className="container py-8 md:py-12 max-w-3xl">
        <div className="prose prose-sm md:prose-base max-w-none space-y-8 text-foreground">

          <section>
            <h2 className="text-xl font-bold mb-3" style={{ fontFamily: "Poppins, sans-serif" }}>1. Aceptación de los Términos</h2>
            <p className="text-muted-foreground leading-relaxed">
              Al acceder y utilizar la plataforma Inteira (en adelante "la Plataforma"), disponible en inteira.mx, usted acepta quedar vinculado por estos Términos de Uso. Si no está de acuerdo con alguna parte de estos términos, no podrá acceder a la Plataforma.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3" style={{ fontFamily: "Poppins, sans-serif" }}>2. Descripción del Servicio</h2>
            <p className="text-muted-foreground leading-relaxed">
              Inteira es una plataforma digital que facilita la conexión entre usuarios y profesionales independientes en áreas como psicología, asesoría legal, finanzas y emprendimiento. Inteira actúa como intermediario tecnológico y no es responsable de la calidad, exactitud o legalidad de los servicios prestados por los profesionales.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3" style={{ fontFamily: "Poppins, sans-serif" }}>3. Registro y Cuenta</h2>
            <p className="text-muted-foreground leading-relaxed">
              Para utilizar los servicios de la Plataforma, deberá crear una cuenta proporcionando información veraz y actualizada. Usted es responsable de mantener la confidencialidad de sus credenciales de acceso y de todas las actividades realizadas bajo su cuenta.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3" style={{ fontFamily: "Poppins, sans-serif" }}>4. Sistema de Créditos y Pagos</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">
              La Plataforma opera mediante un sistema de créditos con las siguientes condiciones:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>Los créditos tienen una equivalencia de 1 peso mexicano (MXN) por 1 crédito.</li>
              <li>Los créditos adquiridos tienen una vigencia de 60 días naturales a partir de la fecha de compra.</li>
              <li>El consumo de créditos se realiza bajo la política FIFO (primero en entrar, primero en salir).</li>
              <li>Una sesión básica tiene un costo de 350 créditos; una sesión premium de 1,500 créditos.</li>
              <li>Los créditos no son transferibles ni canjeables por efectivo.</li>
              <li>Al cancelar una suscripción activa, los créditos acumulados expiran de forma inmediata.</li>
              <li>Los créditos correspondientes a citas canceladas con más de 4 horas de anticipación serán reembolsados a la wallet del usuario.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3" style={{ fontFamily: "Poppins, sans-serif" }}>5. Cancelaciones y Reembolsos</h2>
            <p className="text-muted-foreground leading-relaxed">
              Las citas pueden cancelarse con al menos 4 horas de anticipación para recibir el reembolso de créditos. Cancelaciones realizadas con menos de 4 horas de anticipación no generan reembolso. Los pagos en efectivo o con tarjeta no son reembolsables una vez procesados, salvo en los casos previstos por la Ley Federal de Protección al Consumidor (PROFECO).
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3" style={{ fontFamily: "Poppins, sans-serif" }}>6. Conducta del Usuario</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">
              Al utilizar la Plataforma, usted se compromete a:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>No utilizar la Plataforma para fines ilegales o no autorizados.</li>
              <li>No acosar, intimidar o discriminar a otros usuarios o profesionales.</li>
              <li>No compartir información falsa o engañosa.</li>
              <li>Respetar los derechos de propiedad intelectual de la Plataforma y sus contenidos.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3" style={{ fontFamily: "Poppins, sans-serif" }}>7. Limitación de Responsabilidad</h2>
            <p className="text-muted-foreground leading-relaxed">
              Inteira no garantiza la disponibilidad ininterrumpida de la Plataforma ni la idoneidad de los profesionales registrados. En ningún caso Inteira será responsable por daños indirectos, incidentales o consecuentes derivados del uso o la imposibilidad de uso de la Plataforma.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3" style={{ fontFamily: "Poppins, sans-serif" }}>8. Modificaciones</h2>
            <p className="text-muted-foreground leading-relaxed">
              Inteira se reserva el derecho de modificar estos Términos en cualquier momento. Los cambios entrarán en vigor al momento de su publicación en la Plataforma. El uso continuado de la Plataforma después de dichos cambios constituye su aceptación de los nuevos términos.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3" style={{ fontFamily: "Poppins, sans-serif" }}>9. Legislación Aplicable</h2>
            <p className="text-muted-foreground leading-relaxed">
              Estos Términos se rigen por las leyes de los Estados Unidos Mexicanos. Cualquier controversia derivada de estos Términos será sometida a la jurisdicción de los tribunales competentes de la Ciudad de México, renunciando las partes a cualquier otro fuero que pudiera corresponderles.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3" style={{ fontFamily: "Poppins, sans-serif" }}>10. Contacto</h2>
            <p className="text-muted-foreground leading-relaxed">
              Para cualquier consulta relacionada con estos Términos, puede contactarnos en:{" "}
              <a href="mailto:soporte@inteira.mx" className="text-primary hover:underline">soporte@inteira.mx</a>
            </p>
          </section>

        </div>
      </div>
    </div>
  );
}
