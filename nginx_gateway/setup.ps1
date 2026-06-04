$ErrorActionPreference = 'Stop'

$NginxVersion = "1.26.1"
$NginxDir = "nginx-$NginxVersion"
$ZipFile = "$NginxDir.zip"
$DownloadUrl = "http://nginx.org/download/$ZipFile"
$BaseDir = "C:\Users\USER\Desktop\hacket\nginx_gateway"

Set-Location $BaseDir

Write-Host "Downloading Nginx $NginxVersion for Windows..."
if (-not (Test-Path $ZipFile)) {
    Invoke-WebRequest -Uri $DownloadUrl -OutFile $ZipFile
}

if (-not (Test-Path $NginxDir)) {
    Write-Host "Extracting Nginx..."
    Expand-Archive -Path $ZipFile -DestinationPath . -Force
}

$ConfDir = "$BaseDir\$NginxDir\conf"
$CertsDir = "$ConfDir\certs"

if (-not (Test-Path $CertsDir)) {
    New-Item -ItemType Directory -Path $CertsDir | Out-Null
}

Write-Host "Generating Self-Signed SSL Certificate using OpenSSL..."
$certPath = "$CertsDir\localhost.crt"
$keyPath = "$CertsDir\localhost.key"

if (-not (Test-Path $certPath) -or -not (Test-Path $keyPath)) {
    # Generate the certificate
    $opensslCmd = "openssl req -x509 -nodes -days 365 -newkey rsa:2048 -keyout `"$keyPath`" -out `"$certPath`" -subj `"/CN=localhost`""
    Invoke-Expression $opensslCmd
}

Write-Host "Creating nginx.conf..."
$NginxConf = @"
worker_processes  1;

events {
    worker_connections  1024;
}

http {
    include       mime.types;
    default_type  application/octet-stream;
    sendfile        on;
    keepalive_timeout  65;

    # HTTP Server - Enforce HTTPS redirection
    server {
        listen       80;
        server_name  localhost;

        # Redirect all HTTP requests to HTTPS
        return 301 https://`$host`$request_uri;
    }

    # HTTPS Server - TLS Termination and API Gateway
    server {
        listen       443 ssl;
        server_name  localhost;

        ssl_certificate      certs/localhost.crt;
        ssl_certificate_key  certs/localhost.key;

        ssl_session_cache    shared:SSL:1m;
        ssl_session_timeout  5m;

        ssl_ciphers  HIGH:!aNULL:!MD5;
        ssl_prefer_server_ciphers  on;

        # Proxy requests for /api/v1/* to the backend service
        location /api/v1/ {
            proxy_pass http://127.0.0.1:5000/api/v1/;
            
            # Preserve expected API path/origin
            proxy_set_header Host `$host;
            proxy_set_header X-Real-IP `$remote_addr;
            proxy_set_header X-Forwarded-For `$proxy_addrs;
            proxy_set_header X-Forwarded-Proto `$scheme;
            proxy_set_header Origin `$http_origin;
            
            # CORS headers if needed (usually handled by backend, but good to have proxy transparency)
            proxy_pass_request_headers on;
        }
    }
}
"@

Set-Content -Path "$ConfDir\nginx.conf" -Value $NginxConf -Encoding UTF8

Write-Host "Nginx configured successfully."
Write-Host "To start Nginx, run:"
Write-Host "cd $BaseDir\$NginxDir"
Write-Host "start nginx"
