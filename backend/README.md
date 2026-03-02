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
