import ChatClient from "./ChatClient";

export default function Page() {
  return (
    <div className="flex flex-col h-[calc(100vh-200px)] min-h-[400px]">
      <h1 className="text-3xl font-bold tracking-tight text-zinc-900">
        Cô Kiều Giá Xăng
      </h1>
      <p className="mt-1 text-sm text-zinc-500">
        Tra cứu giá xăng từ PVOIL và gửi thẳng lên Discord "khóc" chung luôn.
      </p>

      <div className="mt-4 flex-1 min-h-0 overflow-hidden">
        <ChatClient />
      </div>
    </div>
  );
}
