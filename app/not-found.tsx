import Link from 'next/link';
import Image from 'next/image';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <div className="text-center space-y-6 max-w-md">
        {/* 404 Image */}
        <div className="relative w-full h-64 min-h-[260px]">
          <Image
            src="/images/404.png"
            alt="404 - Página no encontrada"
            fill
            className="object-contain"
            priority
          />
        </div>

        {/* Text Content */}
        <div className="space-y-2">
          <h1 className="text-4xl font-bold text-foreground">404</h1>
          <p className="text-xl text-muted-foreground">
            Página no encontrada
          </p>
          <p className="text-sm text-muted-foreground">
            Lo sentimos, la página que buscas no existe o ha sido movida.
          </p>
        </div>

        {/* CTA Button */}
        <Link
          href="/"
          className="inline-block mt-6 px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium"
        >
          Volver al inicio
        </Link>
      </div>
    </div>
  );
}
