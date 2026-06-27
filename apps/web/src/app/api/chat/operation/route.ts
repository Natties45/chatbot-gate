import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { message } = await req.json();
    
    // Simulate AI delay
    await new Promise(r => setTimeout(r, 1500));

    // Simple mock responses based on input length or keywords
    let responseText = 'จากการวิเคราะห์ข้อมูลเบื้องต้น ระบบทำงานปกติดีครับ มีส่วนไหนให้ตรวจสอบเพิ่มเติมไหมครับ?';
    
    if (message?.toLowerCase().includes('log') || (message?.length || 0) > 50) {
      responseText = 'จาก Log ที่ส่งมา พบว่าเกิดปัญหา Database Connection Pool Exhaustion ครับ สาเหตุหลักมาจากมี Long-running transactions ค้างอยู่ในระบบ\n\nแนะนำให้ดำเนินการดังนี้:\n1. ตรวจสอบ Active Connections\n2. Kill transaction ที่ทำงานนานเกิน 5 นาที\n3. ปรับเพิ่ม Max Size ของ Connection Pool ชั่วคราวครับ';
    } else if (message?.toLowerCase().includes('error')) {
      responseText = 'พบ Error Code ดังกล่าวในระบบ มักเกิดจากการตั้งค่า Permission ไม่ถูกต้อง รบกวนตรวจสอบสิทธิ์ของ Directory ที่เกี่ยวข้องครับ';
    }

    return NextResponse.json({ text: responseText });
  } catch (error) {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
