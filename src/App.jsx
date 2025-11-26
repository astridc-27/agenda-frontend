import React, { useState, useEffect, useCallback, useMemo } from 'react';
import './index.css'

const API_BASE_URL = 'https://agenda-backend-n0wt.onrender.com/api';

// ----------------------------------------------------------------------
// 1. Hook Personalizado para la API
// ----------------------------------------------------------------------

const useApi = () => {
    const getToken = () => localStorage.getItem('token');

    const request = useCallback(async (endpoint, method = 'GET', data = null, isAuth = true) => {
        const url = `${API_BASE_URL}${endpoint}`;
        const headers = {
            'Content-Type': 'application/json',
        };

        if (isAuth) {
            const token = getToken();
            if (!token) throw new Error('No autorizado: Token JWT no encontrado.');
            headers['Authorization'] = `Bearer ${token}`;
        }

        const config = {
            method,
            headers,
        };

        if (data) {
            config.body = JSON.stringify(data);
        }

        try {
            const response = await fetch(url, config);

            if (response.status === 401) {
                localStorage.removeItem('token');
                window.location.reload();
                throw new Error('Sesión expirada o no autorizada. Por favor, inicia sesión de nuevo.');
            }

            if (response.status === 204) {
                return {}; 
            }

            if (!response.ok) {
                let errorMessage = `Error HTTP ${response.status}`;
                try {
                    const errorResult = await response.json();
                    if (errorResult.message) {
                        errorMessage = errorResult.message;
                    } else if (errorResult.error) {
                         errorMessage = errorResult.error;
                    }
                } catch (e) {
                }
                throw new Error(errorMessage);
            }

            const result = await response.json();
            return result;

        } catch (error) {
            console.error("API Request Error:", error);
            throw error;
        }
    }, []);

    const auth = useMemo(() => ({
        login: (credentials) => request('/api/auth/login', 'POST', credentials, false),
        register: (data) => request('/api/auth/register', 'POST', data, false),
    }), [request]);

    const tasks = useMemo(() => ({
        getAll: () => request('/api/tasks'), 
        create: (taskData) => request('/api/tasks', 'POST', taskData),
        update: (id, taskData) => request(`/api/tasks/${id}`, 'PUT', taskData), 
        delete: (id) => request(`/api/tasks/${id}`, 'DELETE'), 
    }), [request]);

    const categories = useMemo(() => ({
        getAll: () => request('/api/categories'),
        create: (categoryData) => request('/api/categories', 'POST', categoryData),
        delete: (id) => request(`/api/categories/${id}`, 'DELETE'),
    }), [request]);

    return { auth, tasks, categories };
};

// ----------------------------------------------------------------------
// 2. Componentes de UI
// ----------------------------------------------------------------------

const AuthForm = ({ onAuthSuccess }) => {
    const { auth } = useApi();
    const [isLogin, setIsLogin] = useState(true);
    const [formData, setFormData] = useState({ name: '', email: '', password: '' });
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
        setError('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        try {
            const apiCall = isLogin ? auth.login : auth.register;
            const data = isLogin 
                ? { email: formData.email, password: formData.password }
                : formData;

            const result = await apiCall(data);

            if (result.token) {
                localStorage.setItem('token', result.token);
                onAuthSuccess();
            } else {
                setError(result.message || 'Respuesta de autenticación inesperada.');
            }
        } catch (err) {
            setError(err.message || 'Ocurrió un error de red o del servidor.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="auth-container">
            <h2 className="text-2xl font-semibold mb-6 text-gray-800">{isLogin ? 'Iniciar Sesión' : 'Registrarse'}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
                {!isLogin && (
                    <input
                        type="text"
                        name="name"
                        placeholder="Nombre"
                        value={formData.name}
                        onChange={handleChange}
                        required
                        className="input-field"
                    />
                )}
                <input
                    type="email"
                    name="email"
                    placeholder="Correo Electrónico"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    className="input-field"
                />
                <input
                    type="password"
                    name="password"
                    placeholder="Contraseña"
                    value={formData.password}
                    onChange={handleChange}
                    required
                    className="input-field"
                />

                {error && <p className="text-red-600 text-sm mt-2 font-medium">{error}</p>}

                <button
                    type="submit"
                    className="btn-primary w-full"
                    disabled={isLoading}
                >
                    {isLoading ? 'Cargando...' : isLogin ? 'Entrar' : 'Crear Cuenta'}
                </button>
            </form>
            <div className="mt-4 text-center">
                <button
                    onClick={() => setIsLogin(!isLogin)}
                    className="text-sm text-primary-light hover:text-primary-dark"
                    disabled={isLoading}
                >
                    {isLogin ? '¿No tienes cuenta? Regístrate' : '¿Ya tienes cuenta? Inicia Sesión'}
                </button>
            </div>
        </div>
    );
};

const TaskForm = ({ taskToEdit, categories, onSave, onCancel }) => {
    const [title, setTitle] = useState(taskToEdit?.title || '');
    const [description, setDescription] = useState(taskToEdit?.description || '');
    const [dueDate, setDueDate] = useState(taskToEdit?.dueDate?.split('T')[0] || ''); // Formato yyyy-mm-dd
    const [priority, setPriority] = useState(taskToEdit?.priority || 'Medium');
    const [category, setCategory] = useState(taskToEdit?.category || '');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const { tasks } = useApi();

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!title.trim()) {
            setError('El título es obligatorio.');
            return;
        }

        setIsLoading(true);
        setError('');

        const taskData = {
            title,
            description,
            dueDate: dueDate || undefined,
            priority,
            category: category || undefined,
        };

        try {
            let result;
            if (taskToEdit) {
                result = await tasks.update(taskToEdit._id, taskData);
                onSave(result.task, 'updated');
            } else {
                result = await tasks.create(taskData);
                onSave(result.task, 'created');
                setTitle('');
                setDescription('');
                setDueDate('');
                setPriority('Medium');
                setCategory('');
            }
        } catch (err) {
            setError(err.message || 'Error al guardar la tarea.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="form-card">
            <h3 className="text-lg font-semibold mb-4 text-gray-700">{taskToEdit ? 'Editar Tarea' : 'Crear Nueva Tarea'}</h3>
            <form onSubmit={handleSubmit} className="space-y-3">
                <input
                    type="text"
                    placeholder="Título de la tarea (obligatorio)"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="input-field mb-4"
                    required
                    disabled={isLoading}
                />
                <textarea
                    placeholder="Descripción (opcional)"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="input-field min-h-[60px] mb-4"
                    disabled={isLoading}
                />
                <div className="grid grid-cols-2 gap-3 mb-4">
                    <input
                        type="date"
                        value={dueDate}
                        onChange={(e) => setDueDate(e.target.value)}
                        className="input-field"
                        title="Fecha de Vencimiento"
                        disabled={isLoading}
                    />
                    <select
                        value={priority}
                        onChange={(e) => setPriority(e.target.value)}
                        className="input-field"
                        disabled={isLoading}
                    >
                        <option value="Low">Prioridad Baja</option>
                        <option value="Medium">Prioridad Media</option>
                        <option value="High">Prioridad Alta</option>
                    </select>
                </div>
                {categories.length > 0 && (
                    <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        className="input-field mb-4"
                        disabled={isLoading}
                    >
                        <option value="">-- Seleccionar Categoría --</option>
                        {categories.map(cat => (
                            <option key={cat._id} value={cat._id}>{cat.name}</option>
                        ))}
                    </select>
                )}
                {error && <p className="text-red-600 text-sm mt-2 font-medium">{error}</p>}
                
                <div className="flex justify-center space-x-2 pt-2">
                    {taskToEdit && (
                        <button
                            type="button"
                            onClick={onCancel}
                            className="btn-secondary"
                            disabled={isLoading}
                        >
                            Cancelar
                        </button>
                    )}
                    <button
                        type="submit"
                        className="btn-primary"
                        disabled={isLoading}
                    >
                        {isLoading ? 'Guardando...' : taskToEdit ? 'Guardar Cambios' : 'Crear Tarea'}
                    </button>
                </div>
            </form>
        </div>
    );
};

const CategoryManager = ({ categories, onCategorySave, onCategoryDelete, onCategoriesUpdated }) => {
    const { categories: apiCategories } = useApi();
    const [newCategoryName, setNewCategoryName] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleCreateCategory = async (e) => {
        e.preventDefault();
        if (!newCategoryName.trim()) return;

        setIsLoading(true);
        setError('');
        try {
            const result = await apiCategories.create({ name: newCategoryName });
            onCategorySave(result.category);
            setNewCategoryName('');
        } catch (err) {
            setError(err.message || 'Error al crear la categoría.');
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleDeleteCategory = async (categoryId) => {
        if (!window.confirm('ADVERTENCIA: ¿Estás seguro de que quieres eliminar esta categoría? Si hay tareas asociadas, podrían quedar sin categoría.')) {
            return;
        }

        setIsLoading(true);
        setError('');
        try {
            await apiCategories.delete(categoryId);
            onCategoryDelete(categoryId);
        } catch (err) {
            setError(err.message || 'Error al eliminar la categoría. Asegúrate de que no haya tareas dependientes.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="form-card p-4">
            <h3 className="text-lg font-semibold mb-3 text-gray-700">Categorías</h3>
            <form onSubmit={handleCreateCategory} className="flex space-x-2 mb-4">
                <input
                    type="text"
                    placeholder="Nombre de nueva categoría"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    className="input-field flex-1"
                    disabled={isLoading}
                />
                <button type="submit" className="btn-primary text-sm" disabled={isLoading}>
                    {isLoading ? '...' : 'Añadir'}
                </button>
            </form>
            {error && <p className="text-red-600 text-sm mb-3 font-medium">{error}</p>}
            
            <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto pr-1">
                {categories.map(cat => (
                    <div key={cat._id} className="category-tag text-sm flex items-center space-x-1">
                        <span>{cat.name}</span>
                        <button
                            type="button"
                            onClick={() => handleDeleteCategory(cat._id)}
                            className="text-red-600 hover:text-red-800 ml-1 leading-none"
                            title={`Eliminar categoría ${cat.name}`}
                            disabled={isLoading}
                        >
                            &times;
                        </button>
                    </div>
                ))}
                {categories.length === 0 && <p className="text-gray-500 text-sm">No hay categorías. ¡Crea una!</p>}
            </div>
        </div>
    );
};


const TaskItem = ({ task, categoriesMap, onToggleComplete, onEdit, onDelete }) => {
    const isCompleted = task.isCompleted;
    const categoryName = categoriesMap[task.category]?.name || 'Sin Categoría';
    const hasDueDate = !!task.dueDate;

    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const dueDate = task.dueDate ? new Date(task.dueDate) : null;
    dueDate?.setHours(0, 0, 0, 0);

    const isOverdue = dueDate && dueDate < now && !isCompleted;
    const isToday = dueDate && dueDate.getTime() === now.getTime() && !isCompleted;

    const priorityClass = {
        Low: 'priority-low',
        Medium: 'priority-medium',
        High: 'priority-high',
    }[task.priority] || '';


    return (
        <div className={`task-item ${isCompleted ? 'task-item-completed' : ''} ${isOverdue ? 'border-red-400' : 'border-gray-200'}`}>
            <div className="flex items-center space-x-3 flex-grow min-w-0">
                <input
                    type="checkbox"
                    checked={isCompleted}
                    onChange={() => onToggleComplete(task)} 
                    className="task-checkbox"
                />
                
                <div className="flex-1 min-w-0">
                    <p 
                        className={`task-title truncate cursor-pointer ${priorityClass}`}
                        onClick={() => onEdit(task)} 
                        title={task.title}
                    >
                        {task.title}
                    </p>
                    {task.description && (
                         <p className="task-description truncate" title={task.description}>
                            {task.description}
                        </p>
                    )}
                    
                    <div className="flex space-x-2 mt-1">
                        <span className="category-tag">{categoryName}</span>

                        {hasDueDate && (
                             <span className={`due-date-tag ${isOverdue ? 'bg-red-200 text-red-800 font-bold' : isToday ? 'bg-yellow-200 text-yellow-800' : ''}`}>
                                {isOverdue ? '¡Vencida!' : isToday ? '¡Hoy!' : new Date(task.dueDate).toLocaleDateString()}
                            </span>
                        )}
                       
                    </div>
                </div>
            </div>

            <div className="flex items-center space-x-2 ml-4">
                <button
                    onClick={() => onDelete(task._id)}
                    className="delete-button"
                    title="Eliminar Tarea"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" style={{ height: '1.25rem', width: '1.25rem' }}>
                        <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                </button>
            </div>
        </div>
    );
};

// ----------------------------------------------------------------------
// 3. Componente Raíz (App)
// ----------------------------------------------------------------------

const App = () => {
    const [isAuthenticated, setIsAuthenticated] = useState(!!localStorage.getItem('token'));
    
    const [tasks, setTasks] = useState([]);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [taskToEdit, setTaskToEdit] = useState(null);
    const [showCompleted, setShowCompleted] = useState(false); 

    const { tasks: apiTasks, categories: apiCategories } = useApi();

    const categoriesMap = useMemo(() => {
        return categories.reduce((map, cat) => {
            map[cat._id] = cat;
            return map;
        }, {});
    }, [categories]);

    const handleLogout = () => {
        localStorage.removeItem('token');
        setIsAuthenticated(false);
        setTasks([]);
        setCategories([]);
    };

    // --------------------------------------------------
    // Fetch de Datos
    // --------------------------------------------------
    const fetchTasksAndCategories = useCallback(async () => {
        if (!isAuthenticated) return;

        setLoading(true);
        setError(null);

        try {
            const tasksResult = await apiTasks.getAll();
            setTasks(tasksResult.tasks || []); 

            const categoriesResult = await apiCategories.getAll();
            setCategories(categoriesResult.categories || []);

        } catch (err) {
            console.error("Error al cargar datos:", err);
            setError(err.message || 'Error al cargar tareas y categorías.');
            if (err.message.includes('token no encontrado')) {
                 handleLogout(); 
            }
        } finally {
            setLoading(false);
        }
    }, [isAuthenticated, apiTasks, apiCategories]);

    useEffect(() => {
        fetchTasksAndCategories();
    }, [fetchTasksAndCategories]);


    // --------------------------------------------------
    // Manejo de Eventos CRUD
    // --------------------------------------------------

    const handleTaskSave = (newTask, action) => {
        setTaskToEdit(null); 
        
        if (action === 'created') {
            setTasks(prev => [newTask, ...prev]);
        } else if (action === 'updated') {
            setTasks(prev => prev.map(t => (t._id === newTask._id ? newTask : t)));
        }
    };
    
    const handleCategorySave = (newCategory) => {
        setCategories(prev => [...prev, newCategory]);
    };
    
    const handleCategoryDelete = (categoryId) => {
        setCategories(prev => prev.filter(cat => cat._id !== categoryId));
    };

    const handleToggleComplete = useCallback(async (task) => {
        const id = task._id;
        const newIsCompleted = !task.isCompleted;
        setError(null);
        setTasks(prevTasks => prevTasks.map(t => 
            t._id === id ? { ...t, isCompleted: newIsCompleted, isUpdating: true } : t
        ));

        try {
            const updatePayload = {
                title: task.title, 
                priority: task.priority,
                isCompleted: newIsCompleted, 
                ...(task.description ? { description: task.description } : {}),
                ...(task.dueDate ? { dueDate: task.dueDate.split('T')[0] } : {}), 
                ...(task.category ? { category: task.category } : {}),
            };

            const result = await apiTasks.update(id, updatePayload);

            setTasks(prevTasks => prevTasks.map(t => 
                t._id === id ? { ...result.task, isUpdating: false } : t
            ));
        } catch (err) {
            setError(err.message || 'Error al actualizar el estado de la tarea.');
            setTasks(prevTasks => prevTasks.map(t => 
                t._id === id ? { ...t, isCompleted: !newIsCompleted, isUpdating: false } : t
            ));
        }
    }, [apiTasks]); 


    const handleDeleteTask = useCallback(async (taskId) => {
        setError(null);
        if (!window.confirm('¿Estás seguro de que quieres eliminar esta tarea?')) {
            return;
        }

        try {
            await apiTasks.delete(taskId); 
            
            setTasks(prevTasks => prevTasks.filter(t => t._id !== taskId));
            
        } catch (err) {
            setError(err.message || 'Error al eliminar la tarea.'); 
        }
    }, [apiTasks]);

   

    // --------------------------------------------------
    // Datos Filtrados y Vista
    // --------------------------------------------------
    
    const filteredTasks = useMemo(() => {
        return tasks
            .filter(task => showCompleted ? true : !task.isCompleted)
            .sort((a, b) => {
                if (a.isCompleted !== b.isCompleted) {
                    return a.isCompleted ? 1 : -1;
                }
                const dateA = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
                const dateB = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
                return dateA - dateB;
            });
    }, [tasks, showCompleted]);


    if (!isAuthenticated) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
                <AuthForm onAuthSuccess={() => setIsAuthenticated(true)} />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 font-sans">
            <header className="main-header bg-white shadow-md sticky top-0 z-10">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">                    
                    <h1 className="text-2xl font-bold text-gray-800 tracking-tight">
                        Agenda <span className="text-primary-light">de Tareas</span>
                    </h1>
                    <button onClick={handleLogout} className="logout-button">
                        Cerrar Sesión
                    </button>
                </div>
            </header>
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {taskToEdit && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-20 p-4">
                        <div className="form-card max-w-lg w-full">
                            <TaskForm 
                                taskToEdit={taskToEdit}
                                categories={categories}
                                onSave={handleTaskSave}
                                onCancel={() => setTaskToEdit(null)}
                            />
                        </div>
                    </div>
                )}


                {error && (
                    <div className="error-box" onClick={() => setError(null)} title="Click para cerrar">
                        {error}
                    </div>
                )}
                
                <div className="dashboard-grid grid grid-cols-1 lg:grid-cols-3 gap-6">
                    
                    <div className="lg:col-span-1 space-y-6">
                        <TaskForm 
                            taskToEdit={null}
                            categories={categories}
                            onSave={handleTaskSave}
                            onCancel={() => {}} 
                        />
                        <CategoryManager 
                            categories={categories} 
                            onCategorySave={handleCategorySave} 
                            onCategoryDelete={handleCategoryDelete} 
                            onCategoriesUpdated={fetchTasksAndCategories}
                        />
                    </div>

                    <div className="lg:col-span-2">
                        <div className="p-6 bg-white rounded-xl shadow-lg h-full">
                            <div className="flex justify-between items-center mb-5">
                                <h2 className="tasks-header text-xl font-bold text-gray-700">
                                    {showCompleted ? 'Todas las Tareas' : 'Tareas Pendientes'} ({filteredTasks.length})
                                </h2>
                                
                                <button
                                    onClick={() => setShowCompleted(prev => !prev)}
                                    className="btn-secondary text-sm flex items-center space-x-2"
                                >
                                    {showCompleted ? 'Ocultar Completadas' : 'Mostrar Completadas'}
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                    </svg>
                                </button>
                            </div>
                            
                            <div className="space-y-3">
                                {loading && (
                                    <div className="flex justify-center items-center py-8">
                                        <div className="spinner"></div>
                                        <p className="ml-3 text-gray-500">Cargando tareas...</p>
                                    </div>
                                )}
                                
                                {!loading && filteredTasks.length === 0 && (
                                    <div className="text-center py-10 text-gray-500 bg-gray-50 rounded-lg">
                                        <p className="font-semibold mb-1">¡No hay tareas!</p>
                                        <p className="text-sm">
                                            {showCompleted 
                                                ? 'No se encontraron tareas en tu lista. ¡Crea una!'
                                                : '¡Estás al día! ¿Por qué no añades una nueva tarea?'
                                            }
                                        </p>
                                    </div>
                                )}

                                {!loading && filteredTasks.map(task => (
                                    <TaskItem
                                        key={task._id}
                                        task={task}
                                        categoriesMap={categoriesMap}
                                        onToggleComplete={handleToggleComplete}
                                        onEdit={setTaskToEdit}
                                        onDelete={handleDeleteTask}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

            </main>

        </div>
    );
};

export default App;