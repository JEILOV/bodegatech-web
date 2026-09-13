function App() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 px-6">
      <div className="card max-w-md w-full text-center space-y-6">
        <div className="flex justify-center">
          <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center shadow-md">
            <span className="text-white text-2xl font-bold">B</span>
          </div>
        </div>

        <div>
          <h1 className="text-2xl font-bold text-dark-text">BodegaTech Web</h1>
          <p className="text-dark-text-muted mt-1 text-sm">
            Punto de venta offline-first para tu bodega
          </p>
        </div>

        <div className="flex items-center justify-center gap-2 text-sm">
          <span className="w-2 h-2 rounded-full bg-success animate-pulse"></span>
          <span className="text-dark-text-light">Entorno configurado correctamente</span>
        </div>

        <div className="grid grid-cols-3 gap-2 pt-2">
          <div className="rounded-lg bg-primary/10 py-2 text-xs font-medium text-primary">
            Primary
          </div>
          <div className="rounded-lg bg-success/10 py-2 text-xs font-medium text-success">
            Success
          </div>
          <div className="rounded-lg bg-warning/10 py-2 text-xs font-medium text-warning">
            Warning
          </div>
        </div>

        <button className="btn-primary w-full">
          Comenzar
        </button>
      </div>
    </div>
  )
}

export default App