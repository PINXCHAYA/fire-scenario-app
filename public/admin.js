const adminKeyInput = document.getElementById('adminKey');
const loadAdminBtn = document.getElementById('loadAdminBtn');
const exportBtn = document.getElementById('exportBtn');
const summaryGrid = document.getElementById('summaryGrid');
const latestRows = document.getElementById('latestRows');
const attemptRows = document.getElementById('attemptRows');

function getHeaders() {
  return { 'x-admin-key': adminKeyInput.value.trim() };
}

loadAdminBtn.addEventListener('click', loadAdminData);
exportBtn.addEventListener('click', () => {
  const key = adminKeyInput.value.trim();
  if (!key) {
    alert('กรุณาใส่ Admin Key');
    return;
  }
  window.open(`/api/admin/export.xlsx?key=${encodeURIComponent(key)}`, '_blank');
});

async function loadAdminData() {
  const key = adminKeyInput.value.trim();
  if (!key) {
    alert('กรุณาใส่ Admin Key');
    return;
  }

  const [summaryRes, attemptsRes] = await Promise.all([
    fetch('/api/admin/summary', { headers: getHeaders() }),
    fetch('/api/admin/attempts?limit=100', { headers: getHeaders() })
  ]);

  if (!summaryRes.ok || !attemptsRes.ok) {
    alert('โหลดข้อมูลไม่สำเร็จ ตรวจสอบ Admin Key');
    return;
  }

  const summary = await summaryRes.json();
  const attempts = await attemptsRes.json();

  summaryGrid.innerHTML = [
    ['ผู้ทำทั้งหมด', summary.totalParticipants],
    ['รอดแล้ว', summary.survivors],
    ['เกือบตุยแล้ว', summary.nearMiss],
    ['คะแนนเฉลี่ย', summary.averageScore]
  ].map(([label, value]) => `
    <div class="admin-stat">
      <div>${label}</div>
      <strong>${value}</strong>
    </div>
  `).join('');

  latestRows.innerHTML = summary.latest.map((row) => `
    <tr>
      <td>${escapeHtml(row.participant_name)}</td>
      <td>${row.total_score}</td>
      <td>${escapeHtml(row.result_label)}</td>
      <td>${new Date(row.created_at).toLocaleString('th-TH')}</td>
    </tr>
  `).join('');

  attemptRows.innerHTML = attempts.map((row) => `
    <tr>
      <td>${escapeHtml(row.participant_name)}</td>
      <td>${escapeHtml(row.rank1_choice || '')}</td>
      <td>${escapeHtml(row.rank2_choice || '')}</td>
      <td>${escapeHtml(row.rank3_choice || '')}</td>
      <td>${row.total_score}</td>
      <td>${escapeHtml(row.result_label)}</td>
      <td>${new Date(row.created_at).toLocaleString('th-TH')}</td>
    </tr>
  `).join('');
}

function escapeHtml(str) {
  return String(str)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}
