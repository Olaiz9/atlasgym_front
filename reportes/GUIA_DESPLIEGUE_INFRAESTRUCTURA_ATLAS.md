# ATLAS GYM — Guía de Arquitectura, Despliegue en la Nube y Seguridad

**Documento Técnico y Operativo para el Equipo de Desarrollo**  
*Autores:* Bruno Olaiz & Equipo de Desarrollo ATLAS  
*Fecha:* Septiembre 2026  
*Destino:* Atlas Gym (Desarrollo a medida exclusivo)  
*Versión:* 1.0.0  

---

## 1. Resumen Ejecutivo y Propósito
Este documento detalla la estrategia de infraestructura, despliegue continuo en la nube y medidas de seguridad para la puesta en producción del software de gestión y entrenamiento de **ATLAS GYM**.

A diferencia de un modelo genérico compartido con otros establecimientos, este sistema ha sido concebido como un **software exclusivo y dedicado para Atlas Gym**. Esto garantiza que el 100% de la capacidad de cómputo, memoria y base de datos pertenezcan únicamente al gimnasio, asegurando una velocidad de carga instantánea y la máxima privacidad en la información de alumnos y finanzas.

---

## 2. Arquitectura Tecnológica del Sistema

La solución se divide en tres capas desacopladas, lo que permite escalabilidad, mantenimiento independiente y alta tolerancia a fallos:

1. **Frontend (Capa de Presentación):**
   - **Framework:** Next.js 16 (App Router) + React 19.
   - **Estilos:** Tailwind CSS v4, componentes modernos Base UI / Shadcn, íconos Lucide React.
   - **Calidad:** 100% verificado bajo auditoría de React Doctor y suite de pruebas unitarias Vitest.
   - **Diseño Dual:** Portal de Administración (Alumnos, Pagos, Caja, Avisos, Planes) y Portal del Alumno (Entrenamiento interactivo en cortinas desplegables, registro de pesos/repeticiones, historial previo y videoteca técnica embebida).

2. **Backend (Capa de Negocio y Lógica de Datos):**
   - **Framework:** Java con **Spring Boot**.
   - **Persistencia:** **Spring Data JPA** (Hibernate).
   - **Seguridad:** Spring Security con autenticación basada en tokens **JWT (JSON Web Tokens)** y contraseñas cifradas en **BCrypt**.
   - **Lógica Automatizada:** Tareas programadas (`@Scheduled` Cron Jobs) para la generación y control mensual automático de cuotas de alumnos activos cada día 1 de mes.

3. **Base de Datos (Capa de Almacenamiento Relacional):**
   - **Motor:** **MySQL** (o PostgreSQL).
   - **Aislamiento:** Instancia de base de datos dedicada y privada para Atlas Gym con backups automáticos programados.

---

## 3. Alojamiento en la Nube (Cloud Hosting sin Computadora Dedicada)

### ¿Se necesita una computadora encendida en el gimnasio?
**No.** La aplicación estará alojada completamente en centros de datos profesionales en la nube (Vercel y Railway / Render), operando 24 horas al día, 365 días al año:

- **Independencia eléctrica:** Si en el gimnasio se corta la luz o se apaga la PC de recepción, los alumnos continúan accediendo a sus rutinas y estados de cuenta desde su celular con datos móviles (4G/5G).
- **Frontend en Vercel:**
  - Despliegue automático conectado a GitHub.
  - Distribución global con Edge Network CDN y compresión automática de activos.
  - Certificados SSL/TLS automáticos con renovación desatendida.
- **Backend y Base de Datos en Railway / Render:**
  - Servidores dedicados que compilan el `.jar` de Spring Boot automáticamente ante cada commit.
  - Contenedor de base de datos MySQL conectado por red privada interna (sin exposición al tráfico público de internet).

---

## 4. Dominio Oficial y Acceso Web

1. **Adquisición del Dominio:**
   - Adquisición del dominio institucional del gimnasio: **`atlasgym.com.ar`** (vía NIC Argentina) o alternativamente **`atlasgym.app`**.
2. **Asignación de DNS:**
   - El dominio principal o subdominio (`app.atlasgym.com.ar`) se conecta a Vercel mediante registros DNS estándar (CNAME / Alias).
3. **PWA (Progressive Web App):**
   - La aplicación web permite que cualquier alumno agregue el acceso directo en la pantalla de inicio de su teléfono (Android / iOS).
   - Funciona con ícono propio, pantalla completa y sensación de aplicación nativa, evitando el costo anual de publicación en tiendas oficiales (\$99 USD/año en Apple Developer).
4. **Punto de Contacto Físico (Recepción):**
   - Código QR impreso en el mostrador del gimnasio para que los nuevos miembros escaneen y accedan de inmediato a su panel personal.

---

## 5. Seguridad y Protección de Datos Sensibles

La seguridad del sistema se estructura en capas bajo estándares corporativos:

| Capa de Seguridad | Mecanismo de Protección | Beneficio para Atlas Gym |
| :--- | :--- | :--- |
| **Comunicaciones** | Cifrado HTTPS / TLS con certificados SSL bancarios | Tráfico encriptado de extremo a extremo; previene escuchas en redes WiFi abiertas. |
| **Contraseñas** | Hashing criptográfico unidireccional con **BCrypt** | Las contraseñas nunca se almacenan en texto plano; son irrecuperables ante accesos no autorizados. |
| **Autenticación** | Tokens JWT con expiración temporal | Sesiones seguras y sin estado en el servidor. |
| **Autorización (RBAC)** | Control estricto de roles (`ADMIN` vs `ALUMNO`) | Los alumnos no pueden consultar finanzas ni datos privados de otros socios. |
| **Base de Datos** | Consultas parametrizadas nativas de JPA | Inmunidad total contra ataques de Inyección SQL. |
| **Resguardo** | Copias de seguridad automáticas periódicas | Capacidad de recuperación inmediata ante incidentes o borrados accidentales. |

---

## 6. Monitoreo, Soporte y Resolución de Errores

El equipo técnico tiene control y visibilidad en tiempo real desde la consola web:

1. **Logs en Vivo (Telemetría en tiempo real):**
   - Acceso inmediato a la consola de ejecución de Vercel y Railway para identificar excepciones, tiempos de respuesta y líneas de código exactas.
2. **Reinicio de Emergencia en 1 Clic:**
   - Si el backend experimentara sobrecarga o bloqueos de conexión, un botón de reinicio restablece el servicio en menos de 10 segundos.
3. **Rollback Instantáneo (Función de Respaldo Seguro):**
   - Si una nueva versión introdujera algún error imprevisto, se puede revertir la producción a la versión anterior estable con un solo clic en segundos.
4. **Actualizaciones sin Caída de Servicio (Zero-Downtime Deployments):**
   - Las nuevas versiones se compilan en segundo plano y sustituyen a la anterior únicamente cuando están listas y saludables.

---

## 7. Costos Estimados de Infraestructura

- **Fase Inicial / Pruebas:** **\$0 USD / mes** (Capas gratuitas de Vercel y créditos iniciales de Railway).
- **Fase de Producción Estable (Gimnasio en Operación Completa):**
  - Dominio anual (`.com.ar`): ~\$10 USD / año.
  - Vercel (Frontend): Plan Hobby Gratuito o Pro (\$20 USD/mes solo si supera un tráfico masivo).
  - Railway / Render (Spring Boot + MySQL dedicado): **\$5 a \$7 USD / mes**.
- **Costo mensual aproximado:** Prácticamente insignificante para la estructura de costos de un gimnasio comercial.
