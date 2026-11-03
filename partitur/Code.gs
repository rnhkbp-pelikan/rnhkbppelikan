// Google Apps Script: menerima PDF dari website admin dan menyimpannya ke Google Drive.
// Hanya admin Supabase yang boleh mengunggah (token login diverifikasi ke Supabase).

const SUPABASE_URL = 'https://didowuqjuxipzfqdngnq.supabase.co';
const SUPABASE_KEY = 'sb_publishable_dpLZqudFvFqxtTO8UNjNEg_M9e93YpW';
const FOLDER_ID = '1SST1PpRQ9ZnRLbY-eLRK1ICr1isQ2EN4'; // bagian akhir URL folder Drive

function doPost(e) {
  try {
    const req = JSON.parse(e.postData.contents);
    if (!isAdmin_(req.token)) return out_({ ok: false, error: 'Tidak berwenang. Login ulang sebagai admin.' });
    if (!req.data) return out_({ ok: false, error: 'Data PDF kosong.' });
    const name = String(req.name || 'partitur').replace(/[\\/:*?"<>|]+/g, ' ').trim().slice(0, 100) || 'partitur';
    const blob = Utilities.newBlob(Utilities.base64Decode(req.data), 'application/pdf', name + '.pdf');
    const file = DriveApp.getFolderById(FOLDER_ID).createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    return out_({ ok: true, id: file.getId(), url: 'https://drive.google.com/file/d/' + file.getId() + '/view' });
  } catch (err) {
    return out_({ ok: false, error: String(err) });
  }
}

function doGet() { return ContentService.createTextOutput('Uploader aktif.'); }

function isAdmin_(token) {
  if (!token) return false;
  const headers = { apikey: SUPABASE_KEY, Authorization: 'Bearer ' + token };
  const u = UrlFetchApp.fetch(SUPABASE_URL + '/auth/v1/user', { headers: headers, muteHttpExceptions: true });
  if (u.getResponseCode() !== 200) return false;
  const id = JSON.parse(u.getContentText()).id;
  const a = UrlFetchApp.fetch(SUPABASE_URL + '/rest/v1/admins?select=user_id&user_id=eq.' + id, { headers: headers, muteHttpExceptions: true });
  return a.getResponseCode() === 200 && JSON.parse(a.getContentText()).length > 0;
}

function out_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
