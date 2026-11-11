import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/**
 * Campo de contraseña con el "ojito" para ver lo que se escribió.
 *
 * Sin esto la gente se equivoca al teclear y no tiene forma de darse cuenta,
 * que es la causa más común de "mi contraseña no funciona" al registrarse.
 *
 * Acepta `className` para poder usarse igual donde el formulario trae sus
 * propios estilos de input (Login) y donde se usa el Input de shadcn.
 */
export function PasswordInput({
  className,
  wrapperClassName,
  ...props
}: Omit<React.ComponentProps<typeof Input>, "type"> & {
  wrapperClassName?: string;
}) {
  const [visible, setVisible] = useState(false);

  return (
    <div className={cn("relative", wrapperClassName)}>
      <Input
        {...props}
        type={visible ? "text" : "password"}
        className={cn("pr-11", className)}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? "Ocultar contraseña" : "Mostrar contraseña"}
        aria-pressed={visible}
        tabIndex={-1}
        className="absolute right-0 top-0 h-full px-3 flex items-center text-muted-foreground hover:text-foreground transition-colors"
      >
        {visible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
      </button>
    </div>
  );
}
