/**
 * Helper cetak kuitansi resmi SIKUAT untuk Wali Murid & Kasir
 */

function terbilang(nilai: number): string {
  const angka = ["", "Satu", "Dua", "Tiga", "Empat", "Lima", "Enam", "Tujuh", "Delapan", "Sembilan", "Sepuluh", "Sebelas"];
  const count = Math.abs(Math.floor(nilai));

  if (count < 12) return angka[count] || "";
  if (count < 20) return terbilang(count - 10) + " Belas";
  if (count < 100) return (terbilang(Math.floor(count / 10)) + " Puluh " + terbilang(count % 10)).trim();
  if (count < 200) return ("Seratus " + terbilang(count - 100)).trim();
  if (count < 1000) return (terbilang(Math.floor(count / 100)) + " Ratus " + terbilang(count % 100)).trim();
  if (count < 2000) return ("Seribu " + terbilang(count - 1000)).trim();
  if (count < 1000000) return (terbilang(Math.floor(count / 1000)) + " Ribu " + terbilang(count % 1000)).trim();
  if (count < 1000000000) return (terbilang(Math.floor(count / 1000000)) + " Juta " + terbilang(count % 1000000)).trim();
  return count.toString();
}

export function formatTerbilang(amount: number): string {
  if (!amount || amount <= 0) return "# Nol Rupiah #";
  const words = terbilang(amount).trim();
  return `# ${words} Rupiah #`;
}

export function formatRupiah(value: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(value);
}

export interface SingleReceiptParams {
  receiptNo: string;
  dateStr?: string;
  payerName: string;
  studentName: string;
  studentNis: string;
  unitAndClass: string;
  paymentFor: string;
  paymentMethod: string;
  amount: number;
}

export interface BatchReceiptParams {
  receiptNo: string;
  dateStr?: string;
  payerName: string;
  studentName: string;
  studentNis: string;
  unitAndClass: string;
  paymentMethod: string;
  items: { name: string; amount: number }[];
  totalAmount: number;
}

const COMMON_PRINT_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
  @page { size: A4 portrait; margin: 12mm; }
  * { box-sizing: border-box; }
  body {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
    color: #0f172a;
    background: #fff;
    padding: 0;
    margin: 0;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .receipt-container {
    max-width: 680px;
    margin: 0 auto;
    border: 2px solid #0f172a;
    border-radius: 12px;
    padding: 24px;
    background: #ffffff;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  }
  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 2.5px solid #0f172a;
    padding-bottom: 12px;
    margin-bottom: 12px;
  }
  .org-title {
    font-size: 16px;
    font-weight: 900;
    text-transform: uppercase;
    color: #0f172a;
    letter-spacing: -0.3px;
    line-height: 1.2;
  }
  .system-title {
    font-size: 11px;
    font-weight: 800;
    color: #b45309;
    margin-top: 2px;
  }
  .address {
    font-size: 9px;
    color: #64748b;
    margin-top: 2px;
  }
  .header-badge-box {
    text-align: right;
  }
  .badge-lunas {
    display: inline-block;
    padding: 4px 10px;
    border-radius: 6px;
    font-size: 11px;
    font-weight: 900;
    letter-spacing: 1px;
    text-transform: uppercase;
    background: #ecfdf5;
    color: #047857;
    border: 1.5px solid #10b981;
  }
  .kw-number {
    font-family: monospace;
    font-size: 11px;
    font-weight: 700;
    color: #334155;
    margin-top: 4px;
  }
  .kw-date {
    font-size: 9.5px;
    color: #64748b;
    margin-top: 2px;
  }
  .doc-title-wrap {
    text-align: center;
    margin: 12px 0 16px 0;
  }
  .doc-title {
    font-size: 13px;
    font-weight: 900;
    text-transform: uppercase;
    letter-spacing: 1.5px;
    color: #0f172a;
    display: inline-block;
    border-bottom: 2px solid #4f46e5;
    padding-bottom: 2px;
  }
  .data-table {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 16px;
    background: #f8fafc;
    border: 1px solid #cbd5e1;
    border-radius: 8px;
    overflow: hidden;
  }
  .data-table tr {
    border-bottom: 1px dashed #e2e8f0;
  }
  .data-table tr:last-child {
    border-bottom: none;
  }
  .data-table td {
    padding: 7px 12px;
    font-size: 11px;
    line-height: 1.4;
  }
  .label-col {
    width: 160px;
    font-weight: 600;
    color: #475569;
  }
  .colon-col {
    width: 12px;
    color: #94a3b8;
    text-align: center;
  }
  .val-col {
    font-weight: 700;
    color: #0f172a;
  }
  .highlight-val {
    color: #047857;
  }
  .items-list-table {
    width: 100%;
    border-collapse: collapse;
    margin-top: 4px;
  }
  .items-list-table th {
    background: #e2e8f0;
    padding: 5px 8px;
    font-size: 10px;
    font-weight: 700;
    text-align: left;
    color: #334155;
  }
  .items-list-table td {
    padding: 6px 8px;
    font-size: 10.5px;
    border-bottom: 1px solid #e2e8f0;
  }
  .terbilang-box {
    background: #fffbeb;
    border: 1px solid #fde68a;
    border-radius: 6px;
    padding: 6px 10px;
    font-size: 10.5px;
    font-weight: 700;
    font-style: italic;
    color: #92400e;
    margin-bottom: 14px;
  }
  .amount-banner {
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: linear-gradient(135deg, #064e3b 0%, #047857 100%);
    color: #ffffff;
    padding: 12px 16px;
    border-radius: 8px;
    margin-bottom: 18px;
  }
  .amount-desc {
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    opacity: 0.9;
  }
  .amount-method {
    font-size: 11px;
    font-weight: 600;
    margin-top: 2px;
    color: #a7f3d0;
  }
  .amount-value {
    font-family: monospace;
    font-size: 20px;
    font-weight: 900;
    color: #ffffff;
    letter-spacing: -0.5px;
  }
  .footer-signatures {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    padding-top: 10px;
    border-top: 1px solid #cbd5e1;
    margin-top: 10px;
  }
  .notice-text {
    font-size: 9px;
    color: #64748b;
    max-width: 320px;
    line-height: 1.4;
  }
  .signature-block {
    text-align: center;
    width: 180px;
  }
  .sig-role {
    font-size: 9.5px;
    color: #64748b;
    margin-bottom: 42px;
  }
  .sig-name {
    font-size: 10.5px;
    font-weight: 800;
    color: #0f172a;
    border-top: 1px solid #0f172a;
    padding-top: 4px;
  }
  @media print {
    body { background: #fff; }
    .receipt-container {
      box-shadow: none;
      border: 1.5px solid #000;
      max-width: 100%;
    }
  }
`;

export function printOfficialReceipt(params: SingleReceiptParams): void {
  const printWindow = window.open("", "_blank");
  if (!printWindow) return;

  const dateNow = params.dateStr || new Date().toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }) + " WIB";

  const terbilangStr = formatTerbilang(params.amount);
  const amountStr = formatRupiah(params.amount);

  printWindow.document.write(`
    <!DOCTYPE html>
    <html lang="id">
      <head>
        <meta charset="UTF-8" />
        <title>Kwitansi Pembayaran Resmi - ${params.studentName} (${params.receiptNo})</title>
        <style>${COMMON_PRINT_CSS}</style>
      </head>
      <body>
        <div class="receipt-container">
          <!-- Kop Surat -->
          <div class="header">
            <div>
              <div class="org-title">Yayasan Al Uswah Terpadu</div>
              <div class="system-title">SISTEM INFORMASI KEUANGAN AL USWAH TERPADU (SIKUAT)</div>
              <div class="address">Jl. Al Uswah Terpadu • Telp: (031) 8900-123 • Email: sikuat@aluswah.sch.id</div>
            </div>
            <div class="header-badge-box">
              <div class="badge-lunas">LUNAS / SAH</div>
              <div class="kw-number">No: ${params.receiptNo}</div>
              <div class="kw-date">${dateNow}</div>
            </div>
          </div>

          <!-- Judul Dokumen -->
          <div class="doc-title-wrap">
            <span class="doc-title">KUITANSI BUKTI PEMBAYARAN RESMI</span>
          </div>

          <!-- Rincian Data -->
          <table class="data-table">
            <tr>
              <td class="label-col">Telah Diterima Dari</td>
              <td class="colon-col">:</td>
              <td class="val-col">${params.payerName || "Wali Murid"}</td>
            </tr>
            <tr>
              <td class="label-col">Nama Siswa / NIS</td>
              <td class="colon-col">:</td>
              <td class="val-col">${params.studentName} <span style="color:#6366f1;">(${params.studentNis})</span></td>
            </tr>
            <tr>
              <td class="label-col">Unit Sekolah & Kelas</td>
              <td class="colon-col">:</td>
              <td class="val-col">${params.unitAndClass}</td>
            </tr>
            <tr>
              <td class="label-col">Guna Pembayaran</td>
              <td class="colon-col">:</td>
              <td class="val-col highlight-val">${params.paymentFor}</td>
            </tr>
            <tr>
              <td class="label-col">Metode Pembayaran</td>
              <td class="colon-col">:</td>
              <td class="val-col">${params.paymentMethod}</td>
            </tr>
          </table>

          <!-- Terbilang -->
          <div class="terbilang-box">
            Terbilang: ${terbilangStr}
          </div>

          <!-- Banner Jumlah Pembayaran -->
          <div class="amount-banner">
            <div>
              <div class="amount-desc">Jumlah Nominal Diterima Lunas</div>
              <div class="amount-method">Metode: ${params.paymentMethod}</div>
            </div>
            <div class="amount-value">${amountStr}</div>
          </div>

          <!-- Tanda Tangan & Keterangan -->
          <div class="footer-signatures">
            <div class="notice-text">
              <strong style="color: #0f172a;">Catatan Bukti Pembayaran:</strong><br/>
              • Simpan dokumen kuitansi ini atau screenshot halaman sebagai bukti pembayaran resmi.<br/>
              • Dokumen ini sah dan diterbitkan secara digital oleh Sistem Keuangan SIKUAT Al Uswah Terpadu.
            </div>
            <div class="signature-block">
              <div class="sig-role">Pengesahan Kasir Keuangan</div>
              <div class="sig-name">Yayasan Al Uswah Terpadu</div>
            </div>
          </div>
        </div>

        <script>
          window.onload = function() {
            window.print();
          };
        </script>
      </body>
    </html>
  `);
  printWindow.document.close();
}

export function printBatchReceipt(params: BatchReceiptParams): void {
  const printWindow = window.open("", "_blank");
  if (!printWindow) return;

  const dateNow = params.dateStr || new Date().toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }) + " WIB";

  const terbilangStr = formatTerbilang(params.totalAmount);
  const amountStr = formatRupiah(params.totalAmount);

  const itemsRows = params.items
    .map(
      (item, idx) => `
      <tr>
        <td style="width: 30px; text-align: center;">${idx + 1}</td>
        <td><strong>${item.name}</strong></td>
        <td style="text-align: right; font-family: monospace; font-weight: 700;">${formatRupiah(item.amount)}</td>
      </tr>
    `
    )
    .join("");

  printWindow.document.write(`
    <!DOCTYPE html>
    <html lang="id">
      <head>
        <meta charset="UTF-8" />
        <title>Kwitansi Pembayaran Resmi - ${params.studentName} (${params.receiptNo})</title>
        <style>${COMMON_PRINT_CSS}</style>
      </head>
      <body>
        <div class="receipt-container">
          <!-- Kop Surat -->
          <div class="header">
            <div>
              <div class="org-title">Yayasan Al Uswah Terpadu</div>
              <div class="system-title">SISTEM INFORMASI KEUANGAN AL USWAH TERPADU (SIKUAT)</div>
              <div class="address">Jl. Al Uswah Terpadu • Telp: (031) 8900-123 • Email: sikuat@aluswah.sch.id</div>
            </div>
            <div class="header-badge-box">
              <div class="badge-lunas">LUNAS / SAH</div>
              <div class="kw-number">No: ${params.receiptNo}</div>
              <div class="kw-date">${dateNow}</div>
            </div>
          </div>

          <!-- Judul Dokumen -->
          <div class="doc-title-wrap">
            <span class="doc-title">KUITANSI BUKTI PEMBAYARAN RESMI</span>
          </div>

          <!-- Rincian Data Siswa -->
          <table class="data-table" style="margin-bottom: 10px;">
            <tr>
              <td class="label-col">Telah Diterima Dari</td>
              <td class="colon-col">:</td>
              <td class="val-col">${params.payerName || "Wali Murid"}</td>
            </tr>
            <tr>
              <td class="label-col">Nama Siswa / NIS</td>
              <td class="colon-col">:</td>
              <td class="val-col">${params.studentName} <span style="color:#6366f1;">(${params.studentNis})</span></td>
            </tr>
            <tr>
              <td class="label-col">Unit Sekolah & Kelas</td>
              <td class="colon-col">:</td>
              <td class="val-col">${params.unitAndClass}</td>
            </tr>
            <tr>
              <td class="label-col">Metode Pembayaran</td>
              <td class="colon-col">:</td>
              <td class="val-col">${params.paymentMethod}</td>
            </tr>
          </table>

          <!-- Tabel Rincian Item Tagihan -->
          <div style="margin-bottom: 12px;">
            <div style="font-size: 10.5px; font-weight: 700; color: #475569; margin-bottom: 4px; text-transform: uppercase;">
              Rincian Item Pembayaran:
            </div>
            <table class="items-list-table">
              <thead>
                <tr>
                  <th style="width: 30px; text-align: center;">No</th>
                  <th>Uraian Pembayaran</th>
                  <th style="text-align: right; width: 140px;">Jumlah Nominal</th>
                </tr>
              </thead>
              <tbody>
                ${itemsRows}
              </tbody>
            </table>
          </div>

          <!-- Terbilang -->
          <div class="terbilang-box">
            Terbilang: ${terbilangStr}
          </div>

          <!-- Banner Total Pembayaran -->
          <div class="amount-banner">
            <div>
              <div class="amount-desc">Total Nominal Diterima Lunas</div>
              <div class="amount-method">Metode: ${params.paymentMethod}</div>
            </div>
            <div class="amount-value">${amountStr}</div>
          </div>

          <!-- Tanda Tangan & Keterangan -->
          <div class="footer-signatures">
            <div class="notice-text">
              <strong style="color: #0f172a;">Catatan Bukti Pembayaran:</strong><br/>
              • Simpan dokumen kuitansi ini atau screenshot halaman sebagai bukti pembayaran resmi.<br/>
              • Dokumen ini sah dan diterbitkan secara digital oleh Sistem Keuangan SIKUAT Al Uswah Terpadu.
            </div>
            <div class="signature-block">
              <div class="sig-role">Pengesahan Kasir Keuangan</div>
              <div class="sig-name">Yayasan Al Uswah Terpadu</div>
            </div>
          </div>
        </div>

        <script>
          window.onload = function() {
            window.print();
          };
        </script>
      </body>
    </html>
  `);
  printWindow.document.close();
}
