import { model } from "@/app/services/aiService";
import { streamText, convertToModelMessages, stepCountIs, type UIMessage } from "ai";
import { z } from "zod";
import * as cheerio from "cheerio";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const SYSTEM_PROMPT = `
Bạn là "Cô Kiều Giá Xăng", một chuyên gia tư vấn xăng dầu cực kỳ xéo xắt, nhây, hay cà khịa nhưng làm việc rất tận tâm.
Tính cách:
- Luôn tỏ ra "sang chảnh", am hiểu thị trường nhưng hay chê bai người ít tiền.
- Hay "kháy đểm" người dùng bằng tiếng Việt (vd: "Tiền ít mà đòi đổ RON 95 à", "Đi cúp bình xăng 1 lit thì quan tâm chi giá",...)
- Luôn sử dụng Tool để giải quyết chứ không đoán bừa.

Nhiệm vụ:
1. Trả lời câu hỏi về giá xăng bằng cách gọi tool get_fuel_prices để tra cứu số liệu.
2. Nếu người dùng nhờ gửi báo cáo hoặc thông báo, hãy sử dụng tool send_discord_report. BẠN CHỈ ĐƯỢC PHÉP GỬI DISCORD KHI NGƯỜI DÙNG ĐÃ CUNG CẤP DISCORD WEBHOOK URL, VÀ YÊU CẦU BẠN GỬI.
Nội dung gửi Discord phải do bạn biên soạn lại thật "nhây" nhưng đầy đủ thông tin giá vừa tra cứu.

Lưu ý: Bạn được cấu hình để có thể gọi nhiều công cụ liên tiếp (Chain of Thought). Mọi thông tin giá cả PHẢI ĐƯỢC LẤY CHÍNH XÁC TỪ get_fuel_prices. Hãy luôn phân tích kỹ yêu cầu để gọi đúng công cụ. Cứ lấy giá xăng xong giải thích cho user.

Sau khi trả kết quả giá xăng:
- Nếu user ĐÃ cấu hình Discord Webhook URL (sẽ được ghi rõ ở dưới): Hãy hỏi nhây nhây kiểu "Muốn chị gửi lên Discord cho cả lớp xem không? 😏". Nếu user đồng ý thì gọi send_discord_report.
- Nếu user CHƯA cấu hình Discord Webhook URL: Hãy nhắc nhở kiểu nhây như "Chị chưa thấy em cấu hình Discord URL để gửi gì hết trơn á! Bấm vào icon ⚙️ ở ô chat mà nhập vô đi nè 😤". KHÔNG ĐƯỢC gọi tool send_discord_report khi chưa có webhook.

Dùng tiếng Việt hoàn toàn hoặc chêm vài từ tiếng Anh cho sành điệu nhé.
`.trim();

export async function POST(req: Request) {
  try {
    const body = await req.json();
    console.log("=== RAW BODY KEYS ===", Object.keys(body));
    console.log("=== discordWebhook ===", body.discordWebhook);
    
    const { messages = [], discordWebhook } = body as {
      messages?: UIMessage[];
      discordWebhook?: string;
    };

    const context = await convertToModelMessages(messages);

    const result = await streamText({
      model,
      system: SYSTEM_PROMPT + (discordWebhook ? `\nUser's Discord Webhook provided: ${discordWebhook}` : `\nNote: The user HAS NOT provided a Discord Webhook. You cannot send to Discord until they input it in the UI.`),
      messages: context,
      stopWhen: stepCountIs(5),
      tools: {
        get_fuel_prices: {
          description: "Tra cứu bảng giá xăng dầu mới nhất từ PVOIL.",
          // Phiên bản SDK này yêu cầu `inputSchema` thay vì `parameters`
          inputSchema: z.object({
            location: z.string().describe("Vị trí tra cứu (ví dụ: 'việt nam', 'hà nội', 'toàn quốc', ...)"),
          }),
          execute: async () => {
             console.log("Called get_fuel_prices tool");
             try {
                const res = await fetch("https://www.pvoil.com.vn/tin-gia-xang-dau", { next: { revalidate: 3600 } });
                if (!res.ok) throw new Error("PVOIL website error");
                const html = await res.text();
                const $ = cheerio.load(html);
                const prices: Record<string, string> = {};
                $('table tbody tr').each((i, el) => {
                   const row = $(el).find('td').map((_, td) => $(td).text().trim()).get();
                   if (row.length >= 3) {
                      const name = row[1];
                      const price = row[2];
                      if (name && price && !name.toLowerCase().includes('tên')) {
                         prices[name] = price;
                      }
                   }
                });
                return { success: true, prices };
             } catch (err: unknown) {
                const errorMessage = err instanceof Error ? err.message : "Failed to fetch prices from PVOIL";
                return { success: false, error: errorMessage };
             }
          }
        },
        send_discord_report: {
          description: "Gửi báo cáo giá xăng vào kênh Discord của lớp thông qua Discord Webhook.",
          inputSchema: z.object({
            content: z.string().describe("Nội dung tin nhắn báo cáo"),
          }),
          execute: async ({ content }: { content: string }) => {
            console.log("Called send_discord_report tool with payload:", content);
            if (!discordWebhook) {
              return { success: false, error: "Missing Discord Webhook URL. Please ask the user to provide it in the UI." };
            }
            try {
              const res = await fetch(discordWebhook, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ content }),
              });
              if (!res.ok) {
                 return { success: false, error: "Discord Webhook returned status " + res.status };
              }
              return { success: true, message: "Đã 'ting ting' lên Discord thành công!" };
            } catch (err: unknown) {
              const errorMessage = err instanceof Error ? err.message : "Network error sending to Discord";
              return { success: false, error: errorMessage };
            }
          }
        }
      }
    });

    // Sử dụng UIMessageStream thay vì TextStream để có thể xem được Tool invocations ở Client
    return result.toUIMessageStreamResponse();
  } catch (err) {
    console.error("Chat error:", err);
    return new Response("Invalid request.", { status: 400 });
  }
}
