export default function WorkspaceLoading() {
  return (
    <div
      className="workspace-page mx-auto w-full max-w-[1720px] space-y-6"
      aria-live="polite"
      aria-label="页面加载中"
    >
      <div className="h-28 animate-pulse rounded-3xl border border-stone-200/80 bg-white" />
      <div className="space-y-3.5">
        {[0, 1, 2].map((item) => (
          <div
            key={item}
            className="h-52 animate-pulse rounded-3xl border border-stone-200/80 bg-white"
          />
        ))}
      </div>
    </div>
  );
}
