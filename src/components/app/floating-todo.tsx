"use client";

import { useCallback, useEffect, useState, useRef } from "react";
import {
  Bell,
  CheckCircle2,
  Circle,
  Clock,
  ListTodo,
  Radio,
  Sparkles,
  X,
  CheckCheck,
} from "lucide-react";

export type TodoItem = {
  id: string;
  time: string;
  priority: "P0·紧急" | "P1·重点" | "P2·常规";
  source: string;
  title: string;
  content: string;
  done: boolean;
};

// Initial tasks (starts at 2 tasks)
const INITIAL_TODOS: TodoItem[] = [
  {
    id: "todo-1",
    time: "10:15",
    priority: "P0·紧急",
    source: "抖音线索",
    title: "核验抖音潜客购车咨询",
    content: "潜客在《底盘维修最容易漏掉的三笔钱》询问高尔夫整备详情，需及时跟进回复。",
    done: false,
  },
  {
    id: "todo-2",
    time: "11:30",
    priority: "P1·重点",
    source: "质检联动",
    title: "重大车况异常话术复核",
    content: "质检台完成 V001 (汉兰达) 纵梁修复判定，需在客户报告生成前复核风险解释条目。",
    done: false,
  },
];

// Scheduled realistic business events to simulate dynamic real-time increment (1, 2, 3, 4...)
const SCHEDULED_TASKS: Omit<TodoItem, "id" | "done">[] = [
  {
    time: "刚刚",
    priority: "P1·重点",
    source: "小红书",
    title: "同城推荐潜客私信回访",
    content: "小红书笔记《十万元家用二手车怎么选》触发推流，潜客赵*航询问电池健康度与检测标准。",
  },
  {
    time: "刚刚",
    priority: "P0·紧急",
    source: "展厅排期",
    title: "晚间直播选车报告打印",
    content: "快手 19:30 车况讲解直播，需提前打印 V002 与 V003 官方认证全系采样报告。",
  },
  {
    time: "刚刚",
    priority: "P2·常规",
    source: "客户跟进",
    title: "高意向客户深度回访",
    content: "客户李*海已通过链接连续 3 次查看检测报告，系统判定意向度高，建议指派顾问致电。",
  },
  {
    time: "刚刚",
    priority: "P1·重点",
    source: "视频号",
    title: "发布晚间车况避坑科普",
    content: "《老铁们，这台底盘托底你能看出来吗》已完成初剪，建议于晚间黄金时段发布推流。",
  },
];

export function FloatingTodo() {
  const [todos, setTodos] = useState<TodoItem[]>(INITIAL_TODOS);
  const [isOpen, setIsOpen] = useState(false);
  const [incomingToast, setIncomingToast] = useState<string | null>(null);
  const [badgePing, setBadgePing] = useState(false);
  const scheduledIndexRef = useRef(0);

  const spawnNextTask = useCallback(() => {
    if (scheduledIndexRef.current >= SCHEDULED_TASKS.length) return;
    const taskDef = SCHEDULED_TASKS[scheduledIndexRef.current];
    scheduledIndexRef.current += 1;

    const newTask: TodoItem = {
      ...taskDef,
      id: `todo-dyn-${Date.now()}`,
      done: false,
    };

    setTodos((prev) => [newTask, ...prev]);
    setBadgePing(true);
    setTimeout(() => setBadgePing(false), 2000);

    // Show temporary floating hint toast near the button
    setIncomingToast(`新待办 +1: ${newTask.title}`);
    setTimeout(() => {
      setIncomingToast(null);
    }, 4000);
  }, []);

  // Dynamic Rule: incrementally spawn tasks over time (e.g. 10s, 28s, 52s, 78s) to demonstrate live generation!
  useEffect(() => {
    const timers = [
      setTimeout(spawnNextTask, 10000),
      setTimeout(spawnNextTask, 28000),
      setTimeout(spawnNextTask, 52000),
      setTimeout(spawnNextTask, 78000),
    ];

    return () => timers.forEach(clearTimeout);
  }, [spawnNextTask]);

  function toggleTodo(id: string) {
    setTodos((prev) =>
      prev.map((item) => (item.id === id ? { ...item, done: !item.done } : item))
    );
  }

  function markAllRead() {
    setTodos((prev) => prev.map((item) => ({ ...item, done: true })));
  }

  const pendingCount = todos.filter((item) => !item.done).length;

  return (
    <aside aria-label="今日运营待办" className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-40 flex flex-col items-end">

      {/* Dynamic Pop-up Toast when a new task arrives */}
      {incomingToast && !isOpen && (
        <div className="mb-2.5 flex items-center gap-2 rounded-2xl border border-red-200 bg-white/95 px-4 py-2.5 text-xs font-medium text-stone-800 shadow-xl shadow-red-900/10 backdrop-blur-md animate-in fade-in slide-in-from-bottom-3 duration-300">
          <span className="flex size-2 rounded-full bg-red-600 animate-ping" />
          <Sparkles className="size-3.5 text-red-600" />
          <span className="max-w-[220px] truncate">{incomingToast}</span>
        </div>
      )}

      {/* Floating Widget Toggle Pill */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`group relative flex h-12 items-center gap-2.5 rounded-full px-4 text-xs font-semibold shadow-[0_8px_24px_rgba(28,35,40,.12)] transition-all duration-300 hover:scale-105 active:scale-95 ${
          isOpen
            ? "bg-stone-900 text-white shadow-stone-900/20"
            : "bg-white text-stone-800 border border-stone-200 hover:border-red-400"
        }`}
      >
        <div className="relative flex items-center justify-center">
          <ListTodo className={`size-4 transition-colors ${isOpen ? "text-red-400" : "text-red-600"}`} />
          {/* Animated red badge indicator */}
          {pendingCount > 0 && (
            <span
              className={`absolute -right-1.5 -top-1.5 flex size-2.5 ${
                badgePing ? "scale-125" : ""
              }`}
            >
              <span className="absolute size-full animate-ping rounded-full bg-red-400 opacity-75" />
              <span className="relative size-2.5 rounded-full bg-red-600" />
            </span>
          )}
        </div>

        <span>今日待办</span>

        {/* Counter Badge */}
        {pendingCount > 0 ? (
          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1.5 text-[10px] font-bold text-white transition-all">
            {pendingCount}
          </span>
        ) : (
          <span className="flex size-4 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
            <CheckCheck className="size-2.5" />
          </span>
        )}
      </button>

      {/* Floating Pop-over Panel */}
      {isOpen && (
        <div className="absolute bottom-16 right-0 w-[380px] max-w-[calc(100vw-32px)] overflow-hidden rounded-3xl border border-stone-200 bg-white/98 shadow-[0_20px_50px_rgba(0,0,0,0.14)] backdrop-blur-xl animate-in fade-in zoom-in-95 duration-200">

          {/* Panel Header */}
          <div className="flex items-center justify-between border-b border-stone-100 bg-[#faf8f5]/80 px-5 py-3.5">
            <div className="flex items-center gap-2">
              <div className="flex size-7 items-center justify-center rounded-lg bg-red-50 text-red-600">
                <ListTodo className="size-4" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="text-sm font-bold text-stone-900">今日运营待办</h3>
                  <span className="flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700 border border-emerald-200/70">
                    <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    实时调度中
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1">
              {pendingCount > 0 && (
                <button
                  type="button"
                  onClick={markAllRead}
                  className="rounded-lg px-2 py-1 text-[11px] text-stone-400 hover:bg-stone-100 hover:text-stone-700 transition"
                  title="全部标为已完成"
                >
                  一键完成
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="flex size-7 items-center justify-center rounded-lg text-stone-400 hover:bg-stone-100 hover:text-stone-700 transition"
              >
                <X className="size-4" />
              </button>
            </div>
          </div>

          {/* Pending / Total Status Bar */}
          <div className="flex items-center justify-between bg-stone-50/60 px-5 py-2 border-b border-stone-100 text-[11px] text-stone-500">
            <span>
              待处理任务：<strong className="font-semibold text-red-600">{pendingCount}</strong> 项
            </span>
            <span>
              已完成：{todos.length - pendingCount}/{todos.length}
            </span>
          </div>

          {/* Task Scroll List */}
          <div className="max-h-[380px] overflow-y-auto p-3.5 space-y-2 divide-y divide-stone-100/60">
            {todos.length === 0 ? (
              <div className="py-10 text-center text-xs text-stone-400">
                今日暂无待办事项，全网监控平稳运行中
              </div>
            ) : (
              todos.map((item) => (
                <div
                  key={item.id}
                  onClick={() => toggleTodo(item.id)}
                  className={`group pt-2.5 first:pt-0 flex items-start gap-3 rounded-2xl p-2.5 transition cursor-pointer ${
                    item.done
                      ? "opacity-50 hover:opacity-75 bg-transparent"
                      : "hover:bg-[#faf8f5]"
                  }`}
                >
                  <button
                    type="button"
                    className="mt-0.5 shrink-0 text-stone-300 group-hover:text-red-600 transition"
                  >
                    {item.done ? (
                      <CheckCircle2 className="size-4 text-emerald-500" />
                    ) : (
                      <Circle className="size-4" />
                    )}
                  </button>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`rounded px-1.5 py-0.5 text-[10px] font-medium border ${
                            item.done
                              ? "bg-stone-100 text-stone-400 border-stone-200"
                              : item.priority.startsWith("P0")
                              ? "bg-red-50 text-red-600 border-red-200"
                              : item.priority.startsWith("P1")
                              ? "bg-amber-50 text-amber-700 border-amber-200"
                              : "bg-stone-100 text-stone-600 border-stone-200"
                          }`}
                        >
                          {item.priority}
                        </span>
                        <span className="text-[10px] text-stone-400 font-medium">
                          {item.source}
                        </span>
                      </div>
                      <span className="text-[10px] text-stone-400 tabular-nums flex items-center gap-1">
                        <Clock className="size-2.5" />
                        {item.time}
                      </span>
                    </div>

                    <h4
                      className={`mt-1 text-xs font-semibold ${
                        item.done ? "line-through text-stone-400" : "text-stone-900"
                      }`}
                    >
                      {item.title}
                    </h4>

                    <p
                      className={`mt-0.5 text-[11px] leading-4 ${
                        item.done ? "line-through text-stone-300" : "text-stone-500"
                      }`}
                    >
                      {item.content}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer Dispatch Rule note */}
          <div className="border-t border-stone-100 bg-[#faf8f5] px-4 py-2.5 text-center text-[10px] text-stone-400">
            全网舆情监控与车辆质检工况联动 · 任务自适应增量派发
          </div>
        </div>
      )}
    </aside>
  );
}
