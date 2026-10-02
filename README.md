# Lucca's Baby Shower 💙

Sitio de la lista de regalos del baby shower. Cada invitado elige qué regalará y
los regalos únicos quedan apartados para que no se repitan.

## Cómo funciona

- **Un solo link para todos.** El invitado abre la página, toca "Yo lo regalo",
  escribe su nombre y confirma. No necesita cuenta ni contraseña.
- **Link personalizado (opcional):** `https://TU-SITIO/?invitado=Tía%20María`
  deja el nombre ya escrito.
- **Regalos únicos** (cupo 1): al elegirlos aparecen como "Ya fue elegido".
- **Regalos con cupo** (toalla 2, cobijas 3): muestran "Quedan X de N".
- **Regalos que se pueden repetir** (pañales, bodys, pantalones, medias): sin límite.
- Los invitados **no ven quién eligió qué**; solo ven si está disponible.
- El invitado puede **cancelar** su elección desde el mismo celular/computador.
- **Panel privado** en `admin.html`: muestra quién regala cada cosa y permite liberar
  una elección.

Los cupos se cambian en `js/regalos.js` **y** en `supabase/schema.sql`.

## Puesta en marcha

1. **Base de datos (Supabase, plan gratis).** En el proyecto: SQL Editor → pegar
   `supabase/schema.sql` → Run. Luego cambia la clave del panel:
   ```sql
   update admin_settings set admin_key = 'tu-clave-secreta';
   ```
2. **Conectar el sitio.** En Supabase → Project Settings → API, copia la *Project URL*
   y la *anon public key* en `js/config.js`.
3. **Publicar.** GitHub → Settings → Pages → Deploy from branch → `main` / root.
   (Cualquier hosting estático sirve: Netlify, Vercel, Cloudflare Pages.)

Sin el paso 2 el sitio funciona en *modo demostración* (las elecciones solo se guardan
en el navegador de quien lo prueba).
