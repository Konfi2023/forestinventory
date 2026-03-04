export default function StandardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex-1 overflow-auto bg-slate-50 h-full w-full relative">
      <div className="p-4 md:p-8 max-w-[1600px] mx-auto min-h-full">
        {children}
      </div>
    </div>
  );
}