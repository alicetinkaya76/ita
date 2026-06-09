interface SkeletonProps {
  variant?: 'text' | 'circle' | 'card' | 'rect';
  width?: string | number;
  height?: string | number;
  count?: number;
}

export default function Skeleton({ variant = 'text', width, height, count = 1 }: SkeletonProps) {
  const cls = `skel skel-${variant}`;
  const style = {
    width: width ?? (variant === 'circle' ? 40 : '100%'),
    height: height ?? (variant === 'text' ? 16 : variant === 'circle' ? 40 : variant === 'card' ? 120 : 40),
  };

  return (
    <>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className={cls} style={style} />
      ))}
    </>
  );
}
