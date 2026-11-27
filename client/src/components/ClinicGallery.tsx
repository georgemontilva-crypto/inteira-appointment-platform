import { useEffect, useState } from "react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from "@/components/ui/carousel";
import { Button } from "@/components/ui/button";
import { MapPin, Navigation, X } from "lucide-react";

export interface ClinicPublic {
  name: string | null;
  address: string;
  city: string | null;
  state: string | null;
  photos: string[];
  mapsUrl: string | null;
}

/**
 * Consultorio en el perfil público: carrusel de fotos, dirección y botón
 * "Cómo llegar" con el enlace de Maps.
 *
 * Tocar una foto la abre a pantalla completa; en el carrusel se pasa con el
 * dedo o con las flechas, y los puntos dicen en cuál vas.
 */
export function ClinicGallery({ clinic, modalityLabel }: { clinic: ClinicPublic; modalityLabel: string }) {
  const [api, setApi] = useState<CarouselApi>();
  const [actual, setActual] = useState(0);
  const [ampliada, setAmpliada] = useState<string | null>(null);

  useEffect(() => {
    if (!api) return;
    const alCambiar = () => setActual(api.selectedScrollSnap());
    alCambiar();
    api.on("select", alCambiar);
    return () => {
      api.off("select", alCambiar);
    };
  }, [api]);

  useEffect(() => {
    if (!ampliada) return;
    const alTeclear = (e: KeyboardEvent) => e.key === "Escape" && setAmpliada(null);
    window.addEventListener("keydown", alTeclear);
    return () => window.removeEventListener("keydown", alTeclear);
  }, [ampliada]);

  const direccion = [clinic.address, clinic.city, clinic.state].filter(Boolean).join(", ");

  return (
    <section className="rounded-2xl border border-border bg-card overflow-hidden">
      {clinic.photos.length > 0 && (
        <div className="relative">
          <Carousel setApi={setApi} opts={{ loop: clinic.photos.length > 1 }}>
            <CarouselContent className="-ml-0">
              {clinic.photos.map((src, i) => (
                <CarouselItem key={src} className="pl-0">
                  <button
                    type="button"
                    onClick={() => setAmpliada(src)}
                    className="block w-full aspect-[16/10] bg-muted"
                    aria-label={`Ver foto ${i + 1} del consultorio`}
                  >
                    <img
                      src={src}
                      alt={`Consultorio, foto ${i + 1} de ${clinic.photos.length}`}
                      className="w-full h-full object-cover"
                      loading={i === 0 ? "eager" : "lazy"}
                    />
                  </button>
                </CarouselItem>
              ))}
            </CarouselContent>
            {clinic.photos.length > 1 && (
              <>
                <CarouselPrevious className="left-3 bg-white/90 hover:bg-white border-0 shadow-md hidden sm:flex" />
                <CarouselNext className="right-3 bg-white/90 hover:bg-white border-0 shadow-md hidden sm:flex" />
              </>
            )}
          </Carousel>

          <span className="absolute top-3 left-3 rounded-full bg-black/55 text-white text-[11px] font-semibold px-2.5 py-1 backdrop-blur-sm">
            {modalityLabel}
          </span>

          {clinic.photos.length > 1 && (
            <div className="absolute bottom-3 inset-x-0 flex justify-center gap-1.5">
              {clinic.photos.map((src, i) => (
                <button
                  key={src}
                  type="button"
                  onClick={() => api?.scrollTo(i)}
                  aria-label={`Ir a la foto ${i + 1}`}
                  className={`h-1.5 rounded-full transition-all ${
                    i === actual ? "w-5 bg-white" : "w-1.5 bg-white/60"
                  }`}
                />
              ))}
            </div>
          )}
        </div>
      )}

      <div className="p-4 sm:p-5 space-y-3">
        <div className="flex items-start gap-2.5">
          <MapPin className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
          <div className="min-w-0">
            <p className="font-semibold leading-tight">{clinic.name || "Consultorio"}</p>
            <p className="text-sm text-muted-foreground leading-snug mt-0.5">{direccion}</p>
          </div>
        </div>
        {clinic.mapsUrl && (
          <Button asChild variant="outline" className="w-full h-11">
            <a href={clinic.mapsUrl} target="_blank" rel="noopener noreferrer">
              <Navigation className="w-4 h-4 mr-2" />
              Cómo llegar
            </a>
          </Button>
        )}
      </div>

      {ampliada && (
        <div
          className="fixed inset-0 z-[80] bg-black/90 flex items-center justify-center p-4"
          onClick={() => setAmpliada(null)}
          role="dialog"
          aria-label="Foto del consultorio"
        >
          <button
            onClick={() => setAmpliada(null)}
            aria-label="Cerrar"
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/15 text-white flex items-center justify-center hover:bg-white/25"
          >
            <X className="w-5 h-5" />
          </button>
          <img src={ampliada} alt="Consultorio" className="max-w-full max-h-full object-contain rounded-lg" />
        </div>
      )}
    </section>
  );
}
