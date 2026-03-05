# Genesis Ranking Backend

## Requisitos
- Java 17
- Maven
- Banco de dados:
  - padrao: H2 local (nao precisa instalar nada)
  - opcional: MySQL 8 (ou Docker)

## Subir banco local (opcional)
```bash
docker compose up -d
```

## Variaveis de ambiente
Os valores abaixo tem defaults no `application.yml`:
- `DB_URL`, `DB_DRIVER`, `DB_USER`, `DB_PASS`
- `JWT_SECRET` (minimo 32 caracteres)
- `BOOTSTRAP_ADMIN_USER`, `BOOTSTRAP_ADMIN_PASS`
- `INSTAGRAM_ACCESS_TOKEN`, `INSTAGRAM_USER_ID` (feed de midias sociais)
- `INSTAGRAM_USERNAME` (padrao: `genesis_esportes`)
- `INSTAGRAM_WEB_BASE_URL` (padrao: `https://www.instagram.com`)
- `INSTAGRAM_FEED_LIMIT` (padrao 10)

### Feed Instagram (ultimos posts)
Para liberar os ultimos posts em `/api/public/social/instagram`, configure:
```bash
set INSTAGRAM_ACCESS_TOKEN=SEU_TOKEN_VALIDO
set INSTAGRAM_USER_ID=SEU_USER_ID_INSTAGRAM
```

Sem token, o backend tenta fallback publico por `INSTAGRAM_USERNAME`. Esse fallback depende da disponibilidade publica do Instagram e pode sofrer bloqueios (401/429) por limite externo.

### Exemplo para MySQL
```bash
set DB_URL=jdbc:mysql://localhost:3306/genesis_ranking?useSSL=false&serverTimezone=UTC&allowPublicKeyRetrieval=true
set DB_DRIVER=com.mysql.cj.jdbc.Driver
set DB_USER=root
set DB_PASS=
```

## Rodar o backend
```bash
mvn spring-boot:run
```

## Login inicial
Usuario e senha padrao:
- `admin` / `admin123`

## Endpoints principais
- `POST /api/auth/login`
- `GET /api/ranking?eventId=&mode=`
- `GET /api/ranking/teams?eventId=`
- `POST /api/admin/import/local-storage?replace=true`
- `GET /api/public/social/instagram?limit=10`
- `GET /api/public/social/instagram?limit=10&refresh=true` (ignora cache)
  - headers de resposta: `X-Instagram-Feed-Updated-At` e `X-Instagram-Feed-Status`
- `GET /api/admin/social/instagram/cache?limit=10` (cache persistido, admin)
- `POST /api/admin/social/instagram/sync?limit=10` (forca sincronizacao e grava cache, admin)
- `DELETE /api/admin/social/instagram/cache` (limpa cache persistido, admin)
