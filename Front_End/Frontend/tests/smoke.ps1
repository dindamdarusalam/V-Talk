$ErrorActionPreference = "Stop"

$backend = Invoke-WebRequest -UseBasicParsing "http://127.0.0.1:8000/api/v1/health"
if ($backend.StatusCode -ne 200) {
  throw "Backend health check gagal."
}

Write-Output "Backend aktif. Jalankan 'npm install' lalu 'npm run dev' untuk smoke test frontend Next.js."
