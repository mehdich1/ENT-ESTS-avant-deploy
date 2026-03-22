$USERNAME = "mehdiechchentili"
$TAG = "latest"

$services = @(
    @{name="ent-users-service";         path=".\services\users"},
    @{name="ent-courses-service";       path=".\services\courses"},
    @{name="ent-messaging-service";     path=".\services\messaging"},
    @{name="ent-calendar-service";      path=".\services\calendar"},
    @{name="ent-chat-service";          path=".\services\chat"},
    @{name="ent-exams-service";         path=".\services\exams"},
    @{name="ent-notifications-service"; path=".\services\notifications"},
    @{name="ent-frontend";              path=".\frontend"},
    @{name="ent-gateway";               path=".\gateway"}
)

Write-Host "Login Docker Hub..." -ForegroundColor Cyan
docker login

foreach ($svc in $services) {
    $image = "$USERNAME/$($svc.name):$TAG"
    Write-Host "`n[BUILD] $image" -ForegroundColor Yellow
    docker build -t $image $svc.path
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[ERREUR] Build echoue pour $image" -ForegroundColor Red
        exit 1
    }
    Write-Host "[PUSH] $image" -ForegroundColor Green
    docker push $image
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[ERREUR] Push echoue pour $image" -ForegroundColor Red
        exit 1
    }
    Write-Host "[OK] $image envoye sur Docker Hub" -ForegroundColor Green
}

Write-Host "`n=== Toutes les images sont sur Docker Hub ===" -ForegroundColor Cyan
Write-Host "Verifie sur : https://hub.docker.com/u/$USERNAME" -ForegroundColor Cyan