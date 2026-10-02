# NetCortex — Guía de uso paso a paso

Guía práctica para dominar cada sección de la aplicación y sacarle el máximo
rendimiento en tu día a día. Los nombres de botones y pantallas están en inglés
(tal como aparecen en la app); las explicaciones en español.

**Índice**

1. [Primer arranque](#1-primer-arranque)
2. [Console — el panel de control](#2-console--el-panel-de-control)
3. [Cases — el corazón de la herramienta](#3-cases--el-corazón-de-la-herramienta)
4. [Analyzer — pega un log y diagnostica](#4-analyzer--pega-un-log-y-diagnostica)
5. [Error KB — tu base de errores con memoria](#5-error-kb--tu-base-de-errores-con-memoria)
6. [Commands — la chuleta multi-vendor](#6-commands--la-chuleta-multi-vendor)
7. [Playbooks — tu metodología ejecutable](#7-playbooks--tu-metodología-ejecutable)
8. [Changes — gestión de cambios con rollback](#8-changes--gestión-de-cambios-con-rollback)
9. [AI Assistant — IA sobre TU experiencia](#9-ai-assistant--ia-sobre-tu-experiencia)
10. [Search — búsqueda global](#10-search--búsqueda-global)
11. [Settings — configuración y datos](#11-settings--configuración-y-datos)
12. [Flujos de trabajo recomendados](#12-flujos-de-trabajo-recomendados)
13. [Mantenimiento y despliegue](#13-mantenimiento-y-despliegue)

---

## 1. Primer arranque

1. Abre la aplicación (`http://localhost:3000` en desarrollo, o la URL de tu
   servidor/Docker en producción).
2. La primera vez verás **FIRST-RUN INITIALIZATION**: crea tu contraseña
   (mínimo 8 caracteres). Se guarda cifrada (bcrypt) en la base de datos local.
   **No hay recuperación**: si la pierdes, tendrás que borrar `data/netcortex.db`
   y empezar de cero (por eso, haz backups — ver §11 y §13).
3. A partir de ahí, siempre entrarás por **Login → Unlock**. La sesión dura 30 días.

La base de datos arranca ya sembrada con:

- 5 vendors (Cisco, Juniper, FortiGate, Palo Alto, Check Point)
- 19 tecnologías clasificadas (BGP, OSPF, IPsec, NAT…)
- 12 entradas de Error KB clásicas (proposals IKE, PSK, BGP, OSPF…)
- 17 tareas de comandos multi-vendor
- 2 playbooks de ejemplo (VPN caída, BGP flapeando)

Todo el contenido semilla es **editable**: adáptalo a tu experiencia real.

---

## 2. Console — el panel de control

Es la pantalla de entrada. De un vistazo:

| Elemento | Qué te dice |
|---|---|
| **OPEN / IN PROGRESS / RESOLVED** | Casos por estado. "Resolved" incluye los cerrados. |
| **AVG TTR** | Tiempo medio de resolución histórico (time-to-repair). |
| **ERROR KB** | Nº de patrones catalogados + cambios activos. |
| **Open cases** | Tus casos abiertos ordenados por severidad (P1 arriba). |
| **Upcoming changes** | Cambios en draft/approved/scheduled, por fecha de ventana. |
| **Recent error detections** | Los últimos patrones de error detectados en logs, con enlace al caso y a la entrada KB. |

**Uso eficiente**: entra aquí primero cada día. Si hay algo en *Upcoming
changes* sin rollback plan escrito, hazlo **antes** de la ventana de cambio.

Acciones rápidas siempre disponibles arriba a la derecha: **+ New case** y
**Paste log**.

---

## 3. Cases — el corazón de la herramienta

### 3.1 Crear un caso

`Cases → + New case`. Hay dos modos (pestañas superiores):

**Quick capture** — durante la incidencia, captura en caliente:

1. **Title***: describe el síntoma, no la causa ("Site-12 VPN down after ISP
   change", no "proposal mismatch").
2. Severity (P1–P4), Client, Vendors (chips clicables), Technologies, Tags
   (separadas por comas; se crean al vuelo).
3. **Initial log** (opcional): al guardar, se analiza contra el Error KB y los
   patrones coincidentes se **enlazan automáticamente** a la caja Errors del caso.
4. Create case → aterrizas en el detalle.

**Post-mortem** — para registrar incidencias pasadas de memoria:

- Añade **Status** final, **Root cause**, **Solution**, **Opened at / Resolved
  at** (el TTR se calcula de estas fechas) y se crea un evento de resolución en
  el timeline automáticamente.

> Consejo: registra también los casos "de hace meses". El valor del TTR medio y
> del ranking de causas crece con cada caso resuelto que documentas.

### 3.2 El timeline (pestaña Timeline)

Es un registro cronológico de la investigación. Usa la barra inferior para
añadir eventos **mientras trabajas** — sin fricción:

| Botón | Para qué | Detalle |
|---|---|---|
| `+ note` | Hipótesis, contexto, llamadas | Markdown |
| `+ command` | **El más usado**: comando + output | El output queda plegado; botón copy en el comando |
| `+ log` | Pegar un trozo de log | Se analiza contra el KB y enlaza errores automáticamente |
| `+ status` | Cambiar estado con contexto | open / in progress / resolved / closed |
| `+ resolution` | Causa raíz + fix aplicado | Pone el caso en RESOLVED automáticamente |

Cada evento muestra hora, tipo, device label y vendor. Los eventos se pueden
borrar (✕ al pasar el ratón).

### 3.3 Analysis (pestaña)

Tres bloques editables en Markdown con botón *edit*:

- **Symptom** — lo reportado/observado.
- **Root cause** — lo que estaba roto realmente. **Este campo es oro**: es lo
  que la búsqueda y la IA recuperarán en el futuro.
- **Solution** — cómo lo arreglaste (comandos aplicados, verificación).

### 3.4 Errors (pestaña)

Errores del Error KB vinculados a este caso:

- Los `+ log` del timeline añaden coincidencias automáticamente (nota
  "auto-linked").
- Puedes enlazar manualmente: *Link an error manually*.
- **El paso clave**: cuando resuelvas, usa **MARK ACTUAL CAUSE** para señalar qué
  causa fue la real. Cada confirmación **incrementa la evidencia** de esa causa
  y reordena el ranking global (ver §5).

### 3.5 Files (pestaña)

Capturas pegadas asociadas al caso: configs **pre/post**, logs, outputs.
Pega el contenido (no hay subida de ficheros: es texto). Ideal para auditoría
post-cambio y post-mortems.

### 3.6 Listado y filtros

`Cases` admite: texto libre, status, severidad, vendor, cliente y tecnología.
El orden prioriza abiertos → in progress → resueltos, y dentro, más recientes.

---

## 4. Analyzer — pega un log y diagnostica

`Analyzer` (o botón **Paste log** en Console).

1. **Pega el log** completo (syslog, debug, event log…).
2. El **vendor se auto-detecta** por el contenido (badge "auto-detected");
   puedes sobreescribirlo — tu elección manual manda.
3. **Analyze** → para cada patrón conocido que coincide:
   - Las líneas exactas con número de línea.
   - El **meaning** de la entrada KB.
   - **Likely causes rankeadas por TU evidencia** (barras de frecuencia =
   causas que tú confirmaste en casos reales).
   - Los casos relacionados.
4. Dos salidas:
   - **Create case from log** → nuevo caso con el log precargado (se analiza al
     guardar).
   - **Ask AI about this log** → salta al asistente IA con el log listo (ver §9).

**Uso eficiente**: es tu primera parada ante un log desconocido. Si el analyzer
no reconoce nada, probablemente has encontrado un error nuevo para tu KB (§5).

---

## 5. Error KB — tu base de errores con memoria

Cada entrada = un patrón de log conocido:

| Campo | Uso |
|---|---|
| **Pattern** | Texto exacto (substring, case-insensitive) o **regex** |
| **Vendor scope** | `multi-vendor` o un vendor concreto |
| **Meaning** | Qué significa realmente ese mensaje |
| **Causes** | Causas posibles, cada una con **verify** (comandos por vendor) y **fix** |
| **frequency** | Nº de veces que marcaste esa causa como real en casos resueltos |

`Error KB → + New error` para crear; cada entrada tiene su página editable
(entradas, causas, enlaces a KB del fabricante).

**El ciclo virtuoso** (esto es lo que hace única a la herramienta):

```
log nuevo → Analyzer detecta → caso → resuelves → MARK ACTUAL CAUSE
    ↑                                                      │
    └──── el ranking de causas mejora ←────────────────────┘
```

Con el tiempo, ante un "No proposal chosen" la app te dirá: *"en tu experiencia,
el 70% de las veces fue selector mismatch"* — porque son **tus** datos.

**Consejos**:

- Patrones exactos para mensajes de log literales; regex solo cuando la línea
  varía (ej. `dead ?timer expired`).
- No dupliques patrones multi-vendor y vendor-específico con el mismo texto.
- Revisa de vez en cuando `Cases linked` en cada entrada: es tu muestra
  estadística.

---

## 6. Commands — la chuleta multi-vendor

`Commands` — matriz tarea × 5 vendors con botón **copy** por celda.

- **Filtros**: texto (busca también dentro de los comandos), categoría, vendor.
- Click en la tarea → página de edición con un campo por vendor (vacío = sin
  entrada). Los placeholders tipo `<if>`, `<ip>`, `<dst>` son de esperar:
  adáptalos al pegar.
- `+ New task` para añadir tus equivalencias.

**Uso eficiente**: cuando estés en un firewall que tocas poco y no recuerdes el
"show bgp summary" de ese fabricante — está aquí, filtrado por categoría BGP,
copiado en un click. Las 17 tareas semilla cubren el 80% del diagnóstico diario;
añade las tuyas según las vayas necesitando.

---

## 7. Playbooks — tu metodología ejecutable

`Playbooks` — checklists lineales con saltos condicionales.

### Ejecutar (Run)

`Playbooks → ▶ run` en la tarjeta (o el botón Run en el detalle):

1. Avanza paso a paso: cada paso muestra su texto y los **comandos de check por
   vendor** (con copy).
2. En las preguntas, los botones de rama te llevan al paso correcto
   ("No — L3 issue → #7"). Los puntos de progreso arriba permiten saltar y
   marcan los visitados.
3. **Create case from playbook** abre un caso con título `[PB] …` para
   documentar la corrida.

### Editar (vista por defecto)

- Cada paso tiene `kind`: **action** (haz esto), **question** (decisión con
   ramas), **note** (contexto).
- **Branches** se escriben una por línea: `etiqueta => 5` (salta al paso nº 5)
   o `etiqueta => next`.
- Checks por vendor: un campo por fabricante; vacío = sin check.
- Reordena con ↑/↓, borra con ✕, edita en "edit step".

**Uso eficiente**: cada vez que resuelvas un problema nuevo *por segunda vez*,
conviértelo en playbook. Las ramas son tu árbol de decisión sin la complejidad
de un editor gráfico.

---

## 8. Changes — gestión de cambios con rollback

`Changes → + New change`.

### Campos clave

- **Status pipeline**: `draft → approved → scheduled → executed →
  successful / rolled_back / failed`.
- **Risk**: low/medium/high — sé honesto; filtra tu atención.
- **Maintenance window** start/end — alimenta el panel *Upcoming changes*.
- **Planned config**: los comandos exactos que vas a aplicar, en orden.
- **Rollback plan**: **escríbelo ANTES de tocar nada**. Sin plan de rollback,
  el cambio no debería salir de draft.

### Durante y después del cambio

1. Pasa el estado a `executed` al aplicarlo.
2. Pestaña **Checklist**: define qué demuestra que el cambio funcionó, con su
   comando de verificación. Marca ✓ al validar y pega el output como evidencia.
3. Pestaña **Files**: capturas `pre` y `post` (configs antes/después).
4. Pestaña **Cases**: enlaza incidencias causadas o relacionadas con este
   cambio (relación bidireccional).
5. Cierre: `successful` — o `rolled_back` con el plan escrito, que para eso está.

**Uso eficiente**: todo cambio que te pida un cliente vive aquí. El listado
muestra progreso de checklist (ej. 2/3) — un cambio en `executed` con checklist
incompleta es deuda pendiente.

---

## 9. AI Assistant — IA sobre TU experiencia

`AI` en la navegación (o **Ask AI about this log** desde el Analyzer).

### El flujo de dos pasos (privacidad por diseño)

1. **1 · Prepare & review**: escribes síntoma/pregunta + opcionalmente pegas un
   log. La app:
   - **Anonimiza localmente**: IPs, hosts/FQDNs, MACs, emails, usuarios y ASNs
     → placeholders `<IP_1>`, `<HOST_1>`… con numeración consistente.
   - Construye **contexto RAG**: tus casos resueltos parecidos (con causa raíz y
     solución), entradas KB (con causa top por evidencia) y comandos relevantes.
   - Te muestra **exactamente lo que se enviará**. Nada sale sin tu revisión.
2. **2 · Send to AI**: solo si el prompt te convence. La respuesta llega con los
   **valores reales restaurados localmente** (el mapeo nunca salió de tu
   máquina). Toggle *show raw* para verla con placeholders.

### Configurar el proveedor

`Settings → AI Assistant`:

- **Provider**: Anthropic (Claude) / OpenAI / OpenAI-compatible (URL propia) /
  **offline demo** (por defecto; responde en local sin enviar nada, para probar
  el flujo).
- **Model**, **API key** (se guarda solo en tu SQLite, enmascarada) y
  **Test connection** para validarla.

**Uso eficiente**: formula la pregunta con el contexto que darías a un colega
("tunnel backup no establece tras corte de ISP; phase 1 sube"). Cuantos más
casos tengas resueltos con Root cause relleno, mejor será el contexto que la IA
reciba — y mejores las respuestas.

---

## 10. Search — búsqueda global

Caja de búsqueda de la barra superior (o `Search`):

- Full-text sobre: títulos/análisis de casos, **todos los eventos de todos los
  timelines** (comandos y outputs incluidos), Error KB, tareas de comandos y
  playbooks.
- Resultados agrupados por tipo con enlace directo.

**Uso eficiente**: "¿ya vi este síntoma antes?" → busca una palabra del log o
del síntoma. Encontrarás hasta el comando exacto que usaste hace meses.

---

## 11. Settings — configuración y datos

| Sección | Qué hacer |
|---|---|
| **AI Assistant** | Proveedor/modelo/API key (ver §9) |
| **Account** | Cambio de contraseña |
| **Clients** | Alta/baja de clientes (asignables a casos y cambios) |
| **Technologies** | Alta/baja con categoría; alimenta los chips de casos/cambios |
| **Tags** | Se crean solas al etiquetar casos; aquí puedes podar |
| **Backup & restore** | **Download JSON export** (portable) y **Download SQLite .db** (copia viva). Import (destructivo) restaura un JSON |

**Regla de oro**: descarga un export JSON **antes** de cualquier operación
destructiva (import, borrados masivos) y periódicamente (ver §13).

---

## 12. Flujos de trabajo recomendados

### A. Incidencia en caliente

```
Console → + New case (Quick capture, pega el primer log)
  → trabaja: + command / + note / + log según avances
  → si un patrón KB salta: Errors tab
  → resuelves: + resolution  y  MARK ACTUAL CAUSE
  → rellena Analysis (Root cause/Solution) — 2 minutos que valen oro
```

### B. Log críptico sin caso abierto

```
Analyzer → pega → Analyze → (citas KB con ranking) 
  → Create case from log  ó  Ask AI about this log
```

### C. Cambio solicitado por cliente

```
Changes → + New change (planned config + rollback ANTES de la ventana)
  → scheduled → Console muestra la ventana en Upcoming changes
  → executed → Checklist ✓ con evidencia → Files pre/post
  → successful / rolled_back  (+ Cases enlazados si causó incidencia)
```

### D. Registrar casos antiguos de memoria (llenar la base)

```
Cases → + New case → POST-MORTEM ×N (uno tras otro)
  → se recomienda una sesión de 30 min tras cada semana intensa
```

### E. Rutina semanal (10 min)

1. Console: ¿casos abiertos estancados? Ciérralos o actualízalos.
2. Changes: ¿ejecutados con checklist incompleta?
3. Error KB: ¿patrones detectados sin causa marcada?
4. Backup: Download JSON export y guárdalo fuera del servidor.

---

## 13. Mantenimiento y despliegue

- **Dev local**: `npm run dev` → `http://localhost:3000`.
- **Producción (recomendado)**: `docker-compose up -d --build` (o
  `docker compose up -d --build`). Puerto 3000; datos persisten en `./data`.
- **Acceso remoto**: detrás de Caddy con HTTPS en tu **Tailnet** (ver
  `Caddyfile.example`). No expongas la app a internet público: contiene configs
  y logs de clientes.
- **Backups**: Settings → Download (JSON portable o .db). El fichero SQLite
  está en `data/netcortex.db`; copiarlo con el servicio parado también es un
  backup válido.
- **Actualizar tras tocar código**: `docker-compose build` y `up -d`.

## Referencia rápida de valores

- **Severidad**: P1 crítico · P2 alto · P3 medio · P4 bajo.
- **Estados de caso**: open → in_progress → resolved → closed.
- **Eventos**: note · command · log · status · resolution.
- **Estados de cambio**: draft → approved → scheduled → executed →
  successful / rolled_back / failed.
- **Riesgo**: low / medium / high.
- **Placeholders de anonimización**: `<IP_n>` `<HOST_n>` `<MAC_n>` `<USER_n>`
  `<EMAIL_n>` `<ASN_n>`.
