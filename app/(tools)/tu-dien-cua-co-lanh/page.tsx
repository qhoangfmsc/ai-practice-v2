import DictionaryClient from "./DictionaryClient";

export default function Page() {
  return (
    <div className="flex flex-col h-full min-h-0">
      <h1 className="text-3xl font-bold tracking-tight text-zinc-900">
        Từ điển của Cô Lành
      </h1>
      <p className="mt-1 text-sm text-zinc-500">
        Nhập một từ tiếng Anh · Cô Lành sẽ giải nghĩa chi tiết
      </p>

      <div className="mt-4 flex-1 min-h-0">
        <DictionaryClient />
      </div>
    </div>
  );
}
