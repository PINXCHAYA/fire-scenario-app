# Deployment Ready Guide

## สถานะ
โปรเจกต์นี้พร้อม deploy ขึ้นเซิร์ฟเวอร์จริงได้ทันที แต่การ deploy จริงจำเป็นต้องมีสิทธิ์เข้าถึงเซิร์ฟเวอร์หรือบัญชีผู้ให้บริการของคุณก่อน

## แนะนำสำหรับงานพิพิธภัณฑ์
ถ้าจะรองรับผู้ใช้ประมาณ 100 คน ใช้ทางเลือกนี้จะเสถียรที่สุด
- VPS 2 vCPU / RAM 2-4 GB
- Ubuntu 22.04 LTS
- ติดตั้ง Docker + Docker Compose
- ใช้โดเมนหรือ IP ภายในงาน
- เปิด HTTPS ถ้าใช้งานผ่านอินเทอร์เน็ตจริง

## วิธี deploy ด้วย Docker
```bash
cp .env.example .env
# แก้ ADMIN_KEY ในไฟล์ .env

docker compose up -d --build
```

เปิดใช้งาน
- หน้าแบบทดสอบ: `http://YOUR_SERVER_IP:3000`
- หน้าแอดมิน: `http://YOUR_SERVER_IP:3000/admin`

## วิธี deploy แบบ Node.js + PM2
```bash
npm install
npm install -g pm2
cp .env.example .env
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

## Deploy หลัง Nginx
1. ติดตั้ง Nginx
2. วางไฟล์ `nginx.conf` ใน site config
3. reload nginx
```bash
sudo systemctl reload nginx
```

## สำรองข้อมูล
ไฟล์สำคัญคือ
- `data/fire_scenario.db`

ควรสำรองไฟล์นี้ทุกวัน หรือทุกช่วงพักรอบงาน

## เช็กลิสต์ก่อนวันงาน
- เปลี่ยน ADMIN_KEY
- ทดสอบเปิดพร้อมกันจากมือถือหลายเครื่อง
- ทดสอบ export Excel
- เตรียมปลั๊กไฟและอินเทอร์เน็ตสำรอง
- สำรองฐานข้อมูลก่อนเริ่มงานและหลังจบงาน
