# Frontend – Agenda de Tareas (React)

Este es el frontend de la aplicación “Agenda de Tareas”. Permite registrarse, verificar la cuenta por correo, iniciar sesión y administrar tareas personales.

---

## 🛠️ Tecnologías utilizadas

* React
* React Router
* Context API (auth + tareas)
* Fetch API
* TailwindCSS (opcional según tu setup)

---

## ⚙️ Instalación

Clonar el repo:

```bash
git clone https://github.com/[tu-usuario]/agenda-frontend.git
cd agenda-frontend
```

Instalar dependencias:

```bash
npm install
```

Crear archivo `.env`:

```
VITE_API_URL=http://localhost:5000/api
```

Iniciar proyecto:

```bash
npm run dev
```

---

## 🔐 Flujo de autenticación

1. El usuario se registra
2. Recibe un correo con un link
3. Verifica su cuenta
4. Puede iniciar sesión
5. Accede al panel de tareas

---

## 📝 Funcionalidades del frontend

* Registro de usuarios
* Verificación por e-mail
* Login
* Crear tareas
* Listar tareas
* Editar
* Eliminar
* Logout

