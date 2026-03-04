import { generateRecurringTasks } from "@/lib/scheduler";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  // 1. Sicherheit: Prüfen ob der Aufrufer den Schlüssel hat
  const authHeader = request.headers.get("authorization");
  
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    // 2. Den Generator starten (aus src/lib/scheduler.ts)
    await generateRecurringTasks();
    
    return NextResponse.json({ success: true, message: "Tasks generated" });
  } catch (error) {
    console.error("Cron Error:", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}