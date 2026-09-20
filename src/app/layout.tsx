import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "九宫立序 · 车诚万家",
  description: "汽车数字营销与消费者决策辅助系统",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>
        <script
          dangerouslySetInnerHTML={{
            __html: 'document.addEventListener("touchstart",function(){},{passive:true});',
          }}
        />
        {children}
      </body>
    </html>
  );
}
