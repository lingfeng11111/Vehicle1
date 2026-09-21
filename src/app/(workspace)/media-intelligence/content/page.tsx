"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { ArrowLeft, ArrowRight, Clock3, Eye, Images, MessageCircle, Play, Search } from "lucide-react";
import { MEDIA_POSTS, type MediaPost } from "@/data/media-sandbox";

export default function MediaContentPage() {
  const [selected, setSelected] = useState<MediaPost>(MEDIA_POSTS[0]);
  const [platform, setPlatform] = useState("全部");
  const [query, setQuery] = useState("");
  const filtered = MEDIA_POSTS.filter((post) => (platform === "全部" || post.platform === platform) && post.title.includes(query));
  function choosePlatform(next: string) { setPlatform(next); const first = MEDIA_POSTS.find((post) => next === "全部" || post.platform === next); if (first) setSelected(first); }
  return <main className="workspace-page bg-dashboard-surface"><div className="mx-auto w-full max-w-[1720px] 2xl:max-w-[1880px]">
    <div className="flex flex-wrap items-end justify-between gap-4"><div><Link href="/media-intelligence" className="inline-flex items-center gap-1 text-sm text-dashboard-muted hover:text-dashboard-red"><ArrowLeft className="size-4" />返回运营总览</Link><h2 className="mt-4 text-2xl font-semibold tracking-[-.04em]">内容库</h2><p className="mt-1 text-sm text-dashboard-muted">选择内容，查看表现并进入单条复盘。</p></div><div className="relative w-full sm:w-72"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-dashboard-muted" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索标题或主题" className="h-10 w-full rounded-xl border border-dashboard-line bg-white pl-10 pr-3 text-sm outline-none focus:border-dashboard-red" /></div></div>
    <div className="mt-5 flex gap-2 overflow-x-auto pb-1">{["全部","抖音","快手","小红书","视频号"].map((item) => <button key={item} onClick={() => choosePlatform(item)} className={`shrink-0 rounded-full px-4 py-2 text-xs font-medium ${platform === item ? "bg-dashboard-red text-white" : "border border-dashboard-line bg-white text-dashboard-muted"}`}>{item}</button>)}</div>
    <div className="mt-4 grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 content-start gap-4">
        {filtered.length === 0 ? (
          <div className="col-span-full rounded-2xl border border-dashed border-dashboard-line bg-white p-12 text-center text-sm text-dashboard-muted">
            暂无符合条件的内容视频
          </div>
        ) : (
          filtered.map((post, index) => (
            <button
              key={post.id}
              onClick={() => setSelected(post)}
              className={`self-start overflow-hidden rounded-[18px] border bg-white text-left shadow-[0_7px_20px_rgba(28,35,40,.04)] transition-all hover:-translate-y-0.5 ${selected.id === post.id ? "border-dashboard-red shadow-[0_10px_26px_rgba(179,38,48,.1)] ring-1 ring-dashboard-red" : "border-dashboard-line"}`}
            >
              <Thumbnail post={post} index={index} />
              <div className="p-4">
                <div className="flex items-center justify-between text-[10px] text-dashboard-muted">
                  <span className="rounded-md bg-dashboard-surface px-2 py-1 font-medium">{post.type}</span>
                  <span>{post.publishedAt}</span>
                </div>
                <h3 className="mt-3 min-h-12 font-semibold leading-6 line-clamp-2 text-dashboard-ink">{post.title}</h3>
                <div className="mt-4 grid grid-cols-3 border-t border-dashboard-line pt-3 text-center text-[11px]">
                  <ContentMetric label="播放" value={post.views >= 10000 ? `${(post.views / 10000).toFixed(1)}万` : post.views.toLocaleString()} />
                  <ContentMetric label="完播" value={`${post.completion}%`} />
                  <ContentMetric label="线索" value={post.leads} accent />
                </div>
              </div>
            </button>
          ))
        )}
      </section>
      <aside className="h-fit rounded-[20px] border border-dashboard-line bg-white p-5 shadow-[0_8px_24px_rgba(28,35,40,.05)] xl:sticky xl:top-24">
        <div className="text-[10px] font-semibold tracking-[.13em] text-dashboard-red">内容详情</div>
        <h3 className="mt-3 text-xl font-semibold leading-8">{selected.title}</h3>
        <div className="mt-4 flex items-center gap-3 text-xs text-dashboard-muted">
          <span>{selected.platform}</span>
          <span>·</span>
          <span>{selected.type}</span>
          <span>·</span>
          <span>{selected.publishedAt}</span>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-2">
          <DetailStat icon={<Eye />} label="播放量" value={selected.views.toLocaleString()} />
          <DetailStat icon={<Clock3 />} label="完播率" value={`${selected.completion}%`} />
          <DetailStat icon={<MessageCircle />} label="咨询" value={selected.consultations} />
          <DetailStat icon={<ArrowRight />} label="有效线索" value={selected.leads} />
        </div>
        <div className="mt-5 border-t border-dashboard-line pt-4">
          <div className="text-xs font-medium">表现判断</div>
          <p className="mt-2 text-sm leading-6 text-dashboard-muted">该内容的完播与咨询表现高于账号近期均值，适合复用“问题切入—事实解释—行动引导”的结构。</p>
        </div>
        <button className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-dashboard-red px-4 py-3 text-sm font-medium text-white transition-opacity hover:opacity-90">
          <Play className="size-4" />开始复盘内容
        </button>
      </aside>
    </div>
  </div></main>;
}

function Thumbnail({ post, index }: { post: MediaPost; index: number }) {
  const cover = post.coverUrl ?? "/v001-photos/cover.jpg";
  const isImagePost = post.type === "图文笔记";
  return <div className="relative aspect-[16/10] overflow-hidden bg-stone-200">
    {post.mediaUrl ? (
      <video src={post.mediaUrl} autoPlay loop muted playsInline className="h-full w-full object-cover" />
    ) : (
      <Image src={cover} alt={post.title} fill sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw" className="object-cover" />
    )}
    <div className="absolute inset-0 bg-[linear-gradient(0deg,rgba(31,38,42,.5),transparent)]" />
    <div className="absolute left-4 top-4 rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-medium text-dashboard-ink shadow-sm">{post.platform}{isImagePost ? " · 图文" : ""}</div>
    <div className="absolute bottom-3 left-4 text-white">
      <div className="text-[10px] text-white/70">内容封面 · 0{index + 1}</div>
      <div className="mt-0.5 text-sm font-semibold">{post.topic}</div>
    </div>
  </div>;
}
function ContentMetric({ label, value, accent }: { label: string; value: string | number; accent?: boolean }) { return <span className="border-r border-dashboard-line text-dashboard-muted last:border-r-0"><strong className={`block font-semibold ${accent ? "text-dashboard-red" : "text-dashboard-ink"}`}>{value}</strong>{label}</span>; }
function DetailStat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | number }) { return <div className="rounded-xl bg-dashboard-surface p-3"><span className="text-dashboard-red [&_svg]:size-4">{icon}</span><strong className="mt-3 block text-lg">{value}</strong><span className="text-[10px] text-dashboard-muted">{label}</span></div>; }
