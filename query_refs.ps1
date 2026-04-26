$svcKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZua3VpZXJtaHJwZmpycm5sdWduIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjEwNjIyNSwiZXhwIjoyMDcxNjgyMjI1fQ.M2hj4_JKHDOrPcGMLqmXrbgcfBq3zXxk5phAPsJhwZk"
$headers = @{ "apikey" = $svcKey; "Authorization" = "Bearer $svcKey" }

# Erhan'ın UUID'leri
$erhanTL = "c75e2b9a-aeda-415d-bbfd-b7c90e6e54e1"
$erhanAgent = "9bd6f7bc-0041-4c8c-8c48-c4726b7ed008"

# Patronun 5 aylık listesindeki tüm ref numaraları
$refs = @(
  # Ekim 2025
  "81333","87007","72821","76567","66667","59564","87200","87204","87207","87209","68400",
  # Kasim 2025
  "86737","86912","41790","37149","87448","87428","87478","23568","87408","87381","81814","55654","40473","87519","18119",
  # Aralik 2025
  "87685","87622","86675","87761","83418","81689","11660","87878","68222","84846","10333",
  # Ocak 2026
  "85494","87667","37100","9960","74431","88102","82131","84697","82672","85269","65527","12015","74702","88086","65569","80935","88286","83615","88306","85340","85044","71420",
  # Subat 2026
  "87990","88380","11020","86552","48222","86045","9074","84559","66166","88672","88705"
)

$refList = ($refs | ForEach-Object { "ref_no.eq.$_" }) -join ","
$selectFields = "ref_no,user_id,rent_amount,monthly_rent_amount,deal_type,collaboration_with,only_listing_fee,landlord_paid_date,client_paid_date"
$url = "https://vnkuiermhrpfjrrnlugn.supabase.co/rest/v1/revenue?or=($refList)&select=$selectFields&order=ref_no"

$r = Invoke-WebRequest $url -Headers $headers -UseBasicParsing
$data = $r.Content | ConvertFrom-Json

Write-Host "=== TOPLAM BULUNAN KAYIT: $($data.Count) / $($refs.Count) ===" -ForegroundColor Cyan

# Profilleri de çek
$profileUrl = "https://vnkuiermhrpfjrrnlugn.supabase.co/rest/v1/profiles?select=user_id,full_name,role"
$pr = Invoke-WebRequest $profileUrl -Headers $headers -UseBasicParsing
$profiles = $pr.Content | ConvertFrom-Json
$profileMap = @{}
foreach ($p in $profiles) { $profileMap[$p.user_id] = $p }

Write-Host ""
Write-Host "=== REF NO BAZLI DETAY ===" -ForegroundColor Yellow
Write-Host ("{0,-10} {1,-12} {2,-30} {3,-8} {4,-20} {5}" -f "REF_NO","KIRA","AGENT","ERHAN?","COLLAB","AY")
Write-Host ("-" * 110)

foreach ($d in $data | Sort-Object { [int]$_.ref_no }) {
  $agent = if ($profileMap[$d.user_id]) { $profileMap[$d.user_id].full_name } else { "UNKNOWN" }
  $isErhan = if ($d.user_id -eq $erhanTL -or $d.user_id -eq $erhanAgent) { "*** ERHAN ***" } else { "" }
  $kira = if ($d.deal_type -eq "shortlet" -and $d.monthly_rent_amount) { $d.monthly_rent_amount } else { $d.rent_amount }
  $ay = if ($d.client_paid_date) { $d.client_paid_date.Substring(0,7) } elseif ($d.landlord_paid_date) { $d.landlord_paid_date.Substring(0,7) } else { "PENDING" }
  Write-Host ("{0,-10} {1,-12} {2,-30} {3,-14} {4,-20} {5}" -f $d.ref_no, $kira, $agent, $isErhan, $d.collaboration_with, $ay)
}

Write-Host ""
Write-Host "=== ERHAN'A AIT KAYITLAR ===" -ForegroundColor Red
$erhanDeals = $data | Where-Object { $_.user_id -eq $erhanTL -or $_.user_id -eq $erhanAgent }
if ($erhanDeals.Count -eq 0) {
  Write-Host "Patronun listesinde Erhan'a ait HİÇ deal yok!" -ForegroundColor Red
} else {
  Write-Host "Erhan'a ait deal sayisi: $($erhanDeals.Count)" -ForegroundColor Green
  $erhanDeals | Select-Object ref_no, user_id, rent_amount | Format-Table
}

Write-Host ""
Write-Host "=== PATRONUN LİSTESİNDE OLMAYAN (DB'DE EKSIK) REF NUMARALARI ===" -ForegroundColor Magenta
$foundRefs = $data | ForEach-Object { $_.ref_no }
$missing = $refs | Where-Object { $_ -notin $foundRefs }
if ($missing.Count -eq 0) { Write-Host "Tümü bulundu." } else { $missing -join ", " }
