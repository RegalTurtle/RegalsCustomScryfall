type CommanderImage = { name: string; image: string };

/** Multiple commanders share the same footprint as one full card. */
export default function CommanderStack({ images }: { images: CommanderImage[] }) {
  const spread = images.length > 1 ? 14 : 0;
  return (
    <div className="pointer-events-none relative aspect-[5/7] w-full">
      {images.map((card, index) => {
        const offset = images.length > 1 ? index * spread / (images.length - 1) : 0;
        return (
          <img key={`${card.name}-${index}`} src={card.image} alt={card.name} draggable={false}
            className="pointer-events-auto absolute block object-contain"
            style={{ width: `${100 - spread}%`, height: `${100 - spread}%`, left: `${offset}%`, top: `${spread - offset}%`, zIndex: images.length - index }} />
        );
      })}
    </div>
  );
}
