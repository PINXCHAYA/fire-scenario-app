# Mini Decision Task: Fire Scenario

เว็บแอปสำหรับพิพิธภัณฑ์ ใช้ทำแบบทดสอบหลังรับชม พร้อมบันทึกผลลัพธ์ผู้เข้าชม เก็บข้อมูลลง SQLite และ export เป็น Excel ได้

## เวอร์ชันนี้เพิ่มอะไร
- ธีมหน้าตาตาม mockup ที่ส่งมา
- หน้าแบบทดสอบมือถือแนวตั้งพร้อม timer 20 วินาที
- ซ่อน choice ที่เลือกไปแล้วอัตโนมัติ
- เก็บข้อมูลผู้ทำ คะแนน เวลา และผลลัพธ์
- หน้า Admin Dashboard
- export Excel ได้
- พร้อม deploy ด้วย Docker, PM2, Nginx

## วิธีติดตั้งแบบเร็ว
```bash
npm install
npm start
```

เปิดใช้งาน
```bash
http://localhost:3000
```

หน้า Admin
```bash
http://localhost:3000/admin
```

## ตัวแปรแนะนำก่อนขึ้น production
```bash
cp .env.example .env
```

แก้ `ADMIN_KEY` ให้เป็นค่าจริงก่อนใช้งาน

## Deploy
ดูไฟล์ `DEPLOY.md`


## อัปเดตธีมตาม mockup
- เปลี่ยนฟอนต์เป็น Kanit
- หน้า 1 ใช้ `public/assets/home.png`
- หน้า 2 ใช้ `public/assets/action-1.png`
- หน้า 3 ใช้ `public/assets/action-2.png`
- หน้า 4 และ 8 ใช้ `public/assets/rule-result.png`
- หน้า 5-7 รองรับวิดีโอ `public/assets/action-3.mp4`

หมายเหตุ: ในไฟล์ชุดนี้ยังไม่มีวิดีโอ `action-3.mp4` ที่ผู้ใช้ระบุแนบมา ดังนั้นระบบจะใช้ภาพ `rule-result.png` เป็นพื้นหลังสำรองสำหรับหน้า 5-7 จนกว่าจะใส่วิดีโอไฟล์นี้เพิ่มเข้าไป
