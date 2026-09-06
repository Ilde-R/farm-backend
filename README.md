# Granja Acuicola Backend

Backend de una plataforma para la gestion y monitoreo de granjas acuicolas. Centraliza usuarios, dispositivos IoT, lecturas de sensores, alertas y datos operativos de la granja.

## Que hace este backend

- Gestiona autenticacion, usuarios y tenants.
- Administra dispositivos IoT y sus claves de acceso.
- Recibe lecturas de presion mediante WebSocket.
- Detecta desconexiones de blowers y notifica el evento `device_offline`.
- Detecta lecturas fuera del umbral configurado y registra alertas.
- Envia estados y lecturas al frontend en tiempo real.
- Guarda historicos de lecturas para graficas y reportes.
- Gestiona informacion de tanques, lotes y movimientos acuicolas.
- Usa PostgreSQL como base de datos mediante Prisma ORM.

## Modulos principales

- `auth`: registro, inicio de sesion, JWT y refresh tokens.
- `users`: usuarios y perfiles por tenant.
- `iot`: aprovisionamiento, configuracion y revocacion de dispositivos.
- `sensors`: lecturas, alertas y comunicacion WebSocket.
- `prisma`: conexion y acceso a PostgreSQL.

## Requisitos

- Node.js 22 LTS o superior.
- npm.
- PostgreSQL accesible desde el proyecto.
- Docker Desktop, opcional.

## Instalacion local

1. Instala las dependencias:

```bash
npm install
```

2. Crea un archivo `.env` en la raiz del proyecto:

```env
PORT=8001
DATABASE_URL="postgresql://usuario:password@localhost:5432/granja?schema=public"
JWT_SECRET="una-clave-secreta-larga"
```

3. Genera el cliente de Prisma:

```bash
npx prisma generate
```

4. Sincroniza la base de datos en desarrollo:

```bash
npx prisma db push
```

5. Inicia el backend:

```bash
npm run start:dev
```

La API quedara disponible en:

```text
http://localhost:8001
```

Documentacion:

```text
http://localhost:8001/api-swagger
http://localhost:8001/docs
```

## WebSocket

Desarrollo:

```text
ws://localhost:8001?token=JWT_TOKEN
ws://localhost:8001?key=DEVICE_KEY
```

El backend usa WebSocket para recibir lecturas de los dispositivos y comunicar al frontend eventos como:

- `pressure_reading`
- `device_online`
- `device_offline`
- `reading_ack`
- `device_config_update`

## Docker

Para iniciar el entorno de desarrollo:

```bash
docker compose up --build
```

El backend queda disponible en `http://localhost:8001`.

## Comandos utiles

```bash
npm run build
npm run test
npm run test:e2e
npm run lint
```

No subas archivos `.env`, contrasenas, URLs de base de datos, JWT secrets ni device keys al repositorio.
