export function ThanksLogo({ className = "" }: { className?: string }) {
  return (
    <picture>
      <source srcSet="/thanks-io-logo.webp" type="image/webp" />
      <img
        className={className}
        src="/thanks-io-logo.png"
        width={140}
        height={40}
        alt="thanks.io"
        decoding="async"
      />
    </picture>
  );
}
